import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SNAP_INTERVAL, countChars, db, listSnapshots, manuscriptSheets, recountWork, takeSnapshot, trackLinks, type Chapter, type Snapshot } from '../db'
import TrackChip from '../components/TrackChip'
import { useWork } from '../workContext'
import { AutoArea } from '../components/Field'
import { fmtDateTime, fmtNum, toast } from '../ui'

/** 執筆用の書体。書いていて気分が上がるものを選べるように */
export const WRITING_FONTS = [
  { id: 'mincho', label: 'しっぽり明朝', family: "'Shippori Mincho', serif", note: '端正' },
  { id: 'oldmincho', label: '旧明朝', family: "'Zen Old Mincho', serif", note: '古書のよう' },
  { id: 'hina', label: 'ひな明朝', family: "'Hina Mincho', serif", note: 'やわらか' },
  { id: 'serif', label: 'Noto 明朝', family: "'Noto Serif JP', serif", note: '読みやすい' },
  { id: 'gothic', label: 'M+ ゴシック', family: "'M PLUS 1', sans-serif", note: 'すっきり' },
  { id: 'maru', label: '丸ゴシック', family: "'Zen Maru Gothic', sans-serif", note: 'まるい' },
  { id: 'kiwi', label: 'キウイ丸', family: "'Kiwi Maru', serif", note: 'あたたか' },
  { id: 'klee', label: 'クレー', family: "'Klee One', cursive", note: 'ペン字' },
  { id: 'yomogi', label: 'よもぎ', family: "'Yomogi', cursive", note: '手書き' },
  { id: 'kurenaido', label: '紅道', family: "'Zen Kurenaido', sans-serif", note: '筆ペン' },
] as const

interface Prefs {
  vertical: boolean
  font: string
  size: number
  lineHeight: number
  theme: 'paper' | 'kinari' | 'night'
}
const PREF_KEY = 'shosai-editor-prefs'
const defaultPrefs: Prefs = { vertical: false, font: 'mincho', size: 18, lineHeight: 2, theme: 'paper' }

function loadPrefs(): Prefs {
  try {
    const p = { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }
    if (p.font === 'kyokasho') p.font = 'klee'
    return p
  } catch {
    return defaultPrefs
  }
}

type SaveState = 'saved' | 'pending' | 'saving'
type Panel = 'notes' | 'history' | 'music' | 'prefs' | null
type NoteTab = 'memo' | 'plot' | 'cast' | 'synopsis'

/** 最後に書いていた章。作品一覧の「続きを書く」で使う */
export const LAST_KEY = 'shosai-last'

export default function Editor() {
  const { cid } = useParams()
  const { work, update, flush: flushWork } = useWork()
  const nav = useNavigate()
  const chapters = useLiveQuery(() => db.chapters.where('workId').equals(work.id).sortBy('order'), [work.id])

  const [ch, setCh] = useState<Chapter | null | undefined>(undefined)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [panel, setPanel] = useState<Panel>(null)
  const [noteTab, setNoteTab] = useState<NoteTab>('memo')
  const [viewing, setViewing] = useState<Snapshot | null>(null)
  const snapshots = useLiveQuery(() => (panel === 'history' && cid ? listSnapshots(cid) : Promise.resolve([] as Snapshot[])), [panel, cid])
  const lastSnap = useRef(0)
  const touched = useRef(false)
  const [save, setSave] = useState<SaveState>('saved')
  const [quiet, setQuiet] = useState(false)
  const latest = useRef<Chapter | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const dirty = useRef(false)

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const c = latest.current
    if (!c || !dirty.current) return
    dirty.current = false
    setSave('saving')
    await db.chapters.put(c)
    // 書いている間は一定の間隔で、いまの版を履歴に残す
    if (Date.now() - lastSnap.current > SNAP_INTERVAL) {
      lastSnap.current = Date.now()
      void takeSnapshot(c)
    }
    const n = await recountWork(c.workId)
    update((w) => {
      w.charCount = n
    })
    setSave(dirty.current ? 'pending' : 'saved')
  }, [update])

  const flushRef = useRef(flush)
  flushRef.current = flush

  // 章を読み込む（章を切り替えたら、前の章を先に保存）
  useEffect(() => {
    let alive = true
    db.chapters.get(cid!).then((c) => {
      if (!alive) return
      latest.current = c ?? null
      setCh(c ?? null)
      setSave('saved')
      setViewing(null)
      touched.current = false
      lastSnap.current = Date.now()
      if (c) {
        try {
          localStorage.setItem(LAST_KEY, JSON.stringify({ workId: c.workId, chapterId: c.id }))
        } catch {
          /* 記録できなくても続ける */
        }
      }
    })
    return () => {
      alive = false
      const c = latest.current
      const wrote = touched.current
      // 章を離れるときに保存し、書き換えていたらその版を履歴に残す
      void flushRef.current().then(() => {
        if (c && wrote) void takeSnapshot(c)
      })
    }
  }, [cid])

  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
    } catch {
      /* 保存できなくても動作は続ける */
    }
  }, [prefs])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void flushRef.current().then(() => toast('保存しました'))
      }
      if (e.key === 'Escape') setPanel(null)
    }
    const onHide = () => void flushRef.current()
    window.addEventListener('keydown', onKey)
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  const edit = (patch: Partial<Chapter>) => {
    if (!latest.current) return
    if (!touched.current) {
      // この回で初めて書き換える前の版を残しておく
      touched.current = true
      void takeSnapshot(latest.current)
    }
    const next = { ...latest.current, ...patch, updatedAt: Date.now() }
    latest.current = next
    dirty.current = true
    setCh(next)
    setSave('pending')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flushRef.current(), 900)
  }

  const close = async () => {
    await flush()
    await flushWork()
    nav('../toc')
  }

  if (ch === undefined) return <div className="loading">読み込んでいます…</div>
  if (ch === null)
    return (
      <div className="empty-page">
        <p>この章は見つかりませんでした。</p>
        <a className="btn" href={`#/w/${work.id}/toc`}>目次へ</a>
      </div>
    )

  const idx = chapters?.findIndex((c) => c.id === ch.id) ?? -1
  const font = WRITING_FONTS.find((f) => f.id === prefs.font) ?? WRITING_FONTS[0]
  const sceneTracks = work.music.filter((t) => trackLinks(t).chapterIds.includes(ch.id))
  const chars = countChars(ch.body)
  const toggle = (p: Panel) => setPanel((v) => (v === p ? null : p))
  const restore = async (sn: Snapshot) => {
    await takeSnapshot(ch)
    edit({ body: sn.body })
    setViewing(null)
    setPanel(null)
    toast('この版に戻しました')
  }

  return (
    <div
      className={`editor theme-${prefs.theme}${prefs.vertical ? ' vertical' : ''}${quiet ? ' quiet' : ''}${panel === 'notes' ? ' with-notes' : ''}`}
      style={{ ['--ed-size' as string]: prefs.size + 'px', ['--ed-lh' as string]: prefs.lineHeight, ['--ed-font' as string]: font.family }}
      onMouseMove={() => quiet && setQuiet(false)}
    >
      <header className="ed-bar ed-top">
        <button className="btn" onClick={close}>
          目次
        </button>
        <select
          className="ed-select"
          value={ch.id}
          aria-label="章を選ぶ"
          onChange={async (e) => {
            await flush()
            nav(`../write/${e.target.value}`, { replace: true })
          }}
        >
          {chapters?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title || '無題の章'}
            </option>
          ))}
        </select>
        <div className="ed-spacer" />
        {(
          [
            ['notes', '資料'],
            ['history', '履歴'],
            ['music', '曲'],
            ['prefs', '体裁'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} className={'seg-btn' + (panel === k ? ' on' : '')} onClick={() => toggle(k)} aria-expanded={panel === k}>
            {l}
          </button>
        ))}
      </header>

      {panel === 'music' && (
        <div className="ed-prefs" role="dialog" aria-label="この章の曲">
          {sceneTracks.length > 0 && (
            <div className="field">
              <span className="field-label">この章の曲</span>
              <div className="seg col">
                {sceneTracks.map((t) => (
                  <TrackChip key={t.id} t={t} />
                ))}
              </div>
            </div>
          )}
          {work.music.length > sceneTracks.length && (
            <div className="field">
              <span className="field-label">{sceneTracks.length ? 'ほかの曲' : '曲'}</span>
              <div className="seg col">
                {work.music
                  .filter((t) => !sceneTracks.includes(t))
                  .map((t) => (
                    <TrackChip key={t.id} t={t} />
                  ))}
              </div>
            </div>
          )}
          {work.music.length === 0 && (
            <a className="btn" href={`#/w/${work.id}/music`}>
              曲を登録する
            </a>
          )}
        </div>
      )}

      {panel === 'history' && (
        <div className="ed-prefs" role="dialog" aria-label="この章の履歴">
          <span className="field-label">この章の履歴</span>
          <div className="seg col">
            {snapshots?.map((sn) => (
              <button key={sn.id} className={'seg-btn' + (viewing?.id === sn.id ? ' on' : '')} onClick={() => setViewing(viewing?.id === sn.id ? null : sn)}>
                {fmtDateTime(sn.createdAt)}　{fmtNum(countChars(sn.body))} 字
              </button>
            ))}
          </div>
          {snapshots?.length === 0 && <span className="meta">書き進めると、ここに過去の版が残ります</span>}
        </div>
      )}

      {panel === 'prefs' && (
        <div className="ed-prefs" role="dialog" aria-label="体裁の設定">
          <div className="field">
            <span className="field-label">組み方</span>
            <div className="seg">
              <button className={'seg-btn' + (!prefs.vertical ? ' on' : '')} onClick={() => setPrefs({ ...prefs, vertical: false })}>
                横書き
              </button>
              <button className={'seg-btn' + (prefs.vertical ? ' on' : '')} onClick={() => setPrefs({ ...prefs, vertical: true })}>
                縦書き
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field-label">書体</span>
            <div className="seg">
              {WRITING_FONTS.map((f) => (
                <button key={f.id} className={'seg-btn' + (prefs.font === f.id ? ' on' : '')} style={{ fontFamily: f.family }} onClick={() => setPrefs({ ...prefs, font: f.id })}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">紙の色</span>
            <div className="seg">
              {(
                [
                  ['paper', '白'],
                  ['kinari', '生成り'],
                  ['night', '夜'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={'seg-btn' + (prefs.theme === k ? ' on' : '')} onClick={() => setPrefs({ ...prefs, theme: k })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field-label">文字の大きさ {prefs.size}px</span>
            <input type="range" min={14} max={28} value={prefs.size} onChange={(e) => setPrefs({ ...prefs, size: +e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">行間 {prefs.lineHeight.toFixed(1)}</span>
            <input type="range" min={1.5} max={2.6} step={0.1} value={prefs.lineHeight} onChange={(e) => setPrefs({ ...prefs, lineHeight: +e.target.value })} />
          </label>
          <button
            className="btn hide-sm"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen()
              else void document.documentElement.requestFullscreen?.().catch(() => toast('この端末では全画面にできません'))
            }}
          >
            全画面
          </button>
        </div>
      )}

      <div className="ed-main">
        <div className="ed-page" onClick={() => panel !== 'notes' && setPanel(null)}>
          {viewing ? (
            <>
              <p className="ed-viewing meta">
                {fmtDateTime(viewing.createdAt)} の版
                <button className="btn primary" onClick={() => void restore(viewing)}>
                  この版に戻す
                </button>
                <button className="btn" onClick={() => setViewing(null)}>
                  いまの版へ
                </button>
              </p>
              <textarea className="ed-body" value={viewing.body} readOnly aria-label="過去の版" />
            </>
          ) : (
            <>
              <input className="ed-title" value={ch.title} placeholder="章のタイトル" aria-label="章のタイトル" onChange={(e) => edit({ title: e.target.value })} />
              <textarea
                ref={bodyRef}
                className="ed-body"
                value={ch.body}
                spellCheck={false}
                aria-label="本文"
                onChange={(e) => edit({ body: e.target.value })}
                onKeyDown={() => !quiet && setQuiet(true)}
              />
            </>
          )}
        </div>

        {panel === 'notes' && (
          <aside className="ed-notes" aria-label="資料">
            <div className="seg">
              {(
                [
                  ['memo', 'メモ'],
                  ['plot', '構成'],
                  ['cast', '人物'],
                  ['synopsis', 'あらすじ'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={'seg-btn' + (noteTab === k ? ' on' : '')} onClick={() => setNoteTab(k)}>
                  {l}
                </button>
              ))}
            </div>
            {noteTab === 'memo' && <AutoArea className="ed-memo" value={ch.memo} placeholder="この章のメモ" aria-label="この章のメモ" onChange={(e) => edit({ memo: e.target.value })} />}
            {noteTab === 'plot' && (
              <dl className="ed-ref">
                {work.structure.beats.map((b) => (
                  <div key={b.id}>
                    <dt>{b.label || '無題'}</dt>
                    <dd>{b.text}</dd>
                  </div>
                ))}
              </dl>
            )}
            {noteTab === 'cast' && (
              <dl className="ed-ref">
                {work.characters.map((c) => (
                  <div key={c.id}>
                    <dt>
                      {c.name || '名前未設定'}
                      {c.role && <span className="meta">{c.role}</span>}
                    </dt>
                    <dd>{[c.age && `${c.age}歳`, c.occupation, c.personality, c.speech && `口調：${c.speech}`].filter(Boolean).join('\n')}</dd>
                  </div>
                ))}
              </dl>
            )}
            {noteTab === 'synopsis' && (
              <dl className="ed-ref">
                {work.logline && (
                  <div>
                    <dt>ひとことで言うと</dt>
                    <dd>{work.logline}</dd>
                  </div>
                )}
                {work.synopsis && (
                  <div>
                    <dt>あらすじ</dt>
                    <dd>{work.synopsis}</dd>
                  </div>
                )}
                {work.theme && (
                  <div>
                    <dt>テーマ</dt>
                    <dd>{work.theme}</dd>
                  </div>
                )}
              </dl>
            )}
          </aside>
        )}
      </div>

      <footer className="ed-bar ed-bottom">
        <button className="btn" disabled={idx <= 0} onClick={() => idx > 0 && nav(`../write/${chapters![idx - 1].id}`, { replace: true })}>
          前の章
        </button>
        <span className="ed-count meta">
          {fmtNum(chars)} 字　{manuscriptSheets(ch.body)} 枚
        </span>
        <span className="meta">{save === 'saved' ? '保存済み' : save === 'saving' ? '保存中…' : '編集中'}</span>
        <button
          className="btn"
          disabled={!chapters || idx >= chapters.length - 1}
          onClick={() => chapters && idx < chapters.length - 1 && nav(`../write/${chapters[idx + 1].id}`, { replace: true })}
        >
          次の章
        </button>
      </footer>
    </div>
  )
}
