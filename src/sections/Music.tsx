import { useRef, useState } from 'react'
import { removeFile, saveFile, uid, type Track } from '../db'
import { useWork } from '../workContext'
import { AutoArea } from '../components/Field'
import { Icon, confirmDialog, toast, useFileURL } from '../ui'

function service(url: string) {
  if (/youtu\.?be/.test(url)) return 'YouTube'
  if (/spotify\.com/.test(url)) return 'Spotify'
  if (/music\.apple\.com/.test(url)) return 'Apple Music'
  if (/soundcloud\.com/.test(url)) return 'SoundCloud'
  if (/nicovideo\.jp/.test(url)) return 'ニコニコ'
  return 'リンク'
}

export default function Music() {
  const { work, update } = useWork()
  const [draft, setDraft] = useState({ title: '', artist: '', url: '' })

  const add = () => {
    if (!draft.title.trim() && !draft.url.trim()) return
    update((w) => {
      w.music.push({ id: uid(), title: draft.title.trim(), artist: draft.artist.trim(), url: draft.url.trim(), fileId: null, scene: '' })
    })
    setDraft({ title: '', artist: '', url: '' })
  }

  return (
    <section className="sec">
      <header className="sec-head">
        <h2>イメージ音楽</h2>
        <p className="sec-hint">この作品を書くときに聴きたい曲、場面のイメージに合う曲を並べておけます。手元の音声ファイルも入れられます。</p>
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
          <Icon name="plus" size={16} /> 追加
        </button>
      </form>

      {work.music.length === 0 ? (
        <p className="muted music-empty">まだ曲がありません。曲名かURLを入れて追加してください。</p>
      ) : (
        <ol className="tracks">
          {work.music.map((t, i) => (
            <TrackRow key={t.id} t={t} i={i} last={i === work.music.length - 1} />
          ))}
        </ol>
      )}
    </section>
  )
}

function TrackRow({ t, i, last }: { t: Track; i: number; last: boolean }) {
  const { work, update } = useWork()
  const fileRef = useRef<HTMLInputElement>(null)
  const audio = useFileURL(t.fileId)
  const set = (patch: Partial<Track>) =>
    update((w) => {
      const x = w.music.find((x) => x.id === t.id)
      if (x) Object.assign(x, patch)
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

  return (
    <li className="track">
      <span className="track-no">{String(i + 1).padStart(2, '0')}</span>
      <div className="track-main">
        <div className="track-head">
          <input className="track-title" value={t.title} placeholder="曲名" aria-label="曲名" onChange={(e) => set({ title: e.target.value })} />
          <input className="track-artist" value={t.artist} placeholder="アーティスト" aria-label="アーティスト" onChange={(e) => set({ artist: e.target.value })} />
        </div>
        <AutoArea className="track-scene" value={t.scene} placeholder="どの場面・どの人物のイメージか" aria-label="場面のメモ" onChange={(e) => set({ scene: e.target.value })} />
        <div className="track-play">
          {t.url && (
            <a className="btn ghost small" href={t.url} target="_blank" rel="noreferrer">
              <Icon name="link" size={16} /> {service(t.url)}で聴く
            </a>
          )}
          {audio && <audio controls src={audio} preload="none" />}
          <button className="btn ghost small" onClick={() => fileRef.current?.click()}>
            <Icon name="music" size={16} /> {t.fileId ? '音声を差し替え' : '音声ファイルを入れる'}
          </button>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          {!t.url && (
            <input className="track-url" value={t.url} placeholder="URLを追加" aria-label="URL" onChange={(e) => set({ url: e.target.value })} />
          )}
        </div>
      </div>
      <div className="track-tools">
        <button className="icon-btn" disabled={i === 0} onClick={() => move(-1)} aria-label="上へ">
          <Icon name="up" size={18} />
        </button>
        <button className="icon-btn" disabled={last} onClick={() => move(1)} aria-label="下へ">
          <Icon name="down" size={18} />
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
          <Icon name="trash" size={18} />
        </button>
      </div>
    </li>
  )
}
