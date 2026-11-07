import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { db, removeFile, saveFile, trackLinks, uid, type Chapter, type Track } from '../db'
import { useWork } from '../workContext'
import { AutoArea } from '../components/Field'
import TrackChip, { toggleTrack, usePlaying } from '../components/TrackChip'
import { Icon, confirmDialog, toast } from '../ui'

function service(url: string) {
  if (/youtu\.?be/.test(url)) return 'YouTube'
  if (/spotify\.com/.test(url)) return 'Spotify'
  if (/music\.apple\.com/.test(url)) return 'Apple Music'
  if (/soundcloud\.com/.test(url)) return 'SoundCloud'
  if (/nicovideo\.jp/.test(url)) return 'ニコニコ'
  return 'Link'
}

type View = 'list' | 'cast' | 'scene'

export default function Music() {
  const { work, update } = useWork()
  const chapters = useLiveQuery(() => db.chapters.where('workId').equals(work.id).sortBy('order'), [work.id]) ?? []
  const [draft, setDraft] = useState({ title: '', artist: '', url: '' })
  const [view, setView] = useState<View>('list')

  const add = () => {
    if (!draft.title.trim() && !draft.url.trim()) return
    update((w) => {
      w.music.push({
        id: uid(),
        title: draft.title.trim(),
        artist: draft.artist.trim(),
        url: draft.url.trim(),
        fileId: null,
        scene: '',
        characterIds: [],
        chapterIds: [],
        beatIds: [],
      })
    })
    setDraft({ title: '', artist: '', url: '' })
  }

  return (
    <section className="sec">
      <header className="sec-head">
        <h2 className="sec-title">
          <span className="en">Music</span>
          <span className="ja">イメージ音楽</span>
        </h2>
        <p className="sec-hint">曲を人物や場面（章・構成）に結びつけると、プロフィールや執筆画面からすぐ流せます。</p>
      </header>

      <form
        className="music-add"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input value={draft.title} placeholder="曲名" aria-label="曲名" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input value={draft.artist} placeholder="アーティスト" aria-label="アーティスト" onChange={(e) => setDraft({ ...draft, artist: e.target.value })} />
        <input value={draft.url} placeholder="URL（YouTube・Spotify など）" aria-label="URL" inputMode="url" onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        <button className="btn primary small" type="submit">
          追加
        </button>
      </form>

      {work.music.length > 0 && (
        <div className="seg small music-view" role="group" aria-label="表示">
          {(
            [
              ['list', 'すべて'],
              ['cast', '人物ごと'],
              ['scene', '場面ごと'],
            ] as [View, string][]
          ).map(([k, l]) => (
            <button key={k} className={'seg-btn' + (view === k ? ' on' : '')} onClick={() => setView(k)}>
              {l}
            </button>
          ))}
        </div>
      )}

      {work.music.length === 0 && <p className="muted music-empty">まだ曲がありません。曲名かURLを入れて追加してください。</p>}

      {view === 'list' && work.music.length > 0 && (
        <ol className="tracks">
          {work.music.map((t, i) => (
            <TrackRow key={t.id} t={t} i={i} last={i === work.music.length - 1} chapters={chapters} />
          ))}
        </ol>
      )}

      {view === 'cast' && (
        <div className="music-groups">
          {work.characters.map((c) => {
            const ts = work.music.filter((t) => trackLinks(t).characterIds.includes(c.id))
            return <Group key={c.id} title={c.name || '名前未設定'} sub={c.role} tracks={ts} />
          })}
          <Group title="人物の指定なし" tracks={work.music.filter((t) => trackLinks(t).characterIds.length === 0)} />
        </div>
      )}

      {view === 'scene' && (
        <div className="music-groups">
          {chapters.map((c) => (
            <Group key={c.id} title={c.title || '無題の章'} sub="章" tracks={work.music.filter((t) => trackLinks(t).chapterIds.includes(c.id))} />
          ))}
          {work.structure.beats.map((b) => (
            <Group key={b.id} title={b.label || '無題の段階'} sub="構成" tracks={work.music.filter((t) => trackLinks(t).beatIds.includes(b.id))} />
          ))}
        </div>
      )}
    </section>
  )
}

function Group({ title, sub, tracks }: { title: string; sub?: string; tracks: Track[] }) {
  return (
    <section className="music-group">
      <h3>
        {title}
        {sub && <small>{sub}</small>}
      </h3>
      {tracks.length ? (
        <div className="chip-row">
          {tracks.map((t) => (
            <TrackChip key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <p className="muted small-text">まだ曲がありません</p>
      )}
    </section>
  )
}

function TrackRow({ t, i, last, chapters }: { t: Track; i: number; last: boolean; chapters: Chapter[] }) {
  const { work, update } = useWork()
  const fileRef = useRef<HTMLInputElement>(null)
  const [linking, setLinking] = useState(false)
  const playing = usePlaying() === t.id
  const links = trackLinks(t)

  const set = (patch: Partial<Track>) =>
    update((w) => {
      const x = w.music.find((x) => x.id === t.id)
      if (x) Object.assign(x, patch)
    })
  const toggle = (k: 'characterIds' | 'chapterIds' | 'beatIds', id: string) =>
    update((w) => {
      const x = w.music.find((x) => x.id === t.id)
      if (!x) return
      const cur = x[k] ?? []
      x[k] = cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id]
    })
  const move = (d: number) =>
    update((w) => {
      const j = i + d
      ;[w.music[i], w.music[j]] = [w.music[j], w.music[i]]
    })

  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('audio/') && !f.type.startsWith('video/')) {
      toast('音声ファイルを選んでください')
      return
    }
    const id = await saveFile(work.id, f, f.name)
    const old = t.fileId
    set({ fileId: id, title: t.title || f.name.replace(/\.[^.]+$/, '') })
    await removeFile(old)
  }

  const tagNames = [
    ...work.characters.filter((c) => links.characterIds.includes(c.id)).map((c) => c.name || '名前未設定'),
    ...chapters.filter((c) => links.chapterIds.includes(c.id)).map((c) => c.title || '無題の章'),
    ...work.structure.beats.filter((b) => links.beatIds.includes(b.id)).map((b) => b.label || '無題の段階'),
  ]

  return (
    <li className="track">
      <button
        className={'track-play-btn' + (playing ? ' playing' : '')}
        onClick={() => (t.fileId ? toggleTrack(t) : t.url && window.open(t.url, '_blank', 'noopener'))}
        disabled={!t.fileId && !t.url}
        aria-label={playing ? '止める' : t.fileId ? '再生' : '外部サービスで開く'}
      >
        {playing ? '❚❚' : t.fileId ? '▶' : t.url ? '↗' : String(i + 1).padStart(2, '0')}
      </button>
      <div className="track-main">
        <div className="track-head">
          <input className="track-title" value={t.title} placeholder="曲名" aria-label="曲名" onChange={(e) => set({ title: e.target.value })} />
          <input className="track-artist" value={t.artist} placeholder="アーティスト" aria-label="アーティスト" onChange={(e) => set({ artist: e.target.value })} />
        </div>
        <AutoArea className="track-scene" value={t.scene} placeholder="メモ（どんな気分の曲か）" aria-label="メモ" onChange={(e) => set({ scene: e.target.value })} />

        <div className="track-links">
          {tagNames.map((n, k) => (
            <span key={k} className="tag">
              {n}
            </span>
          ))}
          <button className="text-btn" onClick={() => setLinking((v) => !v)} aria-expanded={linking}>
            {linking ? '閉じる' : tagNames.length ? '人物・場面を変更' : '＋ 人物・場面に結びつける'}
          </button>
        </div>

        {linking && (
          <div className="link-panel">
            <div>
              <p className="link-label">人物</p>
              <div className="chip-row">
                {work.characters.length === 0 && <span className="muted small-text">相関図で人物を追加すると選べます</span>}
                {work.characters.map((c) => (
                  <button key={c.id} className={'chip' + (links.characterIds.includes(c.id) ? ' on' : '')} onClick={() => toggle('characterIds', c.id)}>
                    {c.name || '名前未設定'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="link-label">章</p>
              <div className="chip-row">
                {chapters.map((c) => (
                  <button key={c.id} className={'chip' + (links.chapterIds.includes(c.id) ? ' on' : '')} onClick={() => toggle('chapterIds', c.id)}>
                    {c.title || '無題の章'}
                  </button>
                ))}
              </div>
            </div>
            {work.structure.beats.length > 0 && (
              <div>
                <p className="link-label">構成</p>
                <div className="chip-row">
                  {work.structure.beats.map((b) => (
                    <button key={b.id} className={'chip' + (links.beatIds.includes(b.id) ? ' on' : '')} onClick={() => toggle('beatIds', b.id)}>
                      {b.label || '無題の段階'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="track-play">
          {t.url ? (
            <a className="text-btn" href={t.url} target="_blank" rel="noreferrer">
              {service(t.url)} で聴く ↗
            </a>
          ) : (
            <input className="track-url" value={t.url} placeholder="URL を追加" aria-label="URL" onChange={(e) => set({ url: e.target.value })} />
          )}
          <button className="text-btn" onClick={() => fileRef.current?.click()}>
            {t.fileId ? '音声を差し替え' : '音声ファイルを入れる'}
          </button>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>
      <div className="track-tools">
        <button className="icon-btn" disabled={i === 0} onClick={() => move(-1)} aria-label="上へ">
          <Icon name="up" size={16} />
        </button>
        <button className="icon-btn" disabled={last} onClick={() => move(1)} aria-label="下へ">
          <Icon name="down" size={16} />
        </button>
        <button
          className="icon-btn"
          aria-label="この曲を削除"
          onClick={async () => {
            if (!(await confirmDialog(`「${t.title || '無題の曲'}」をリストから削除します。`))) return
            update((w) => {
              w.music = w.music.filter((x) => x.id !== t.id)
            })
            await removeFile(t.fileId)
          }}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  )
}
