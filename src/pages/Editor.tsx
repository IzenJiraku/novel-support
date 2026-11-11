import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { countChars, db, manuscriptSheets, recountWork, trackLinks, type Chapter } from '../db'
import TrackChip from '../components/TrackChip'
import { useWork } from '../workContext'
import { fmtNum, toast } from '../ui'

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

export default function Editor() {
  const { cid } = useParams()
  const { work, update, flush: flushWork } = useWork()
  const nav = useNavigate()
  const chapters = useLiveQuery(() => db.chapters.where('workId').equals(work.id).sortBy('order'), [work.id])

  const [ch, setCh] = useState<Chapter | null | undefined>(undefined)
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [showPrefs, setShowPrefs] = useState(false)
  const [showMusic, setShowMusic] = useState(false)
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
    })
    return () => {
      alive = false
      void flushRef.current()
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
      if (e.key === 'Escape') {
        setShowPrefs(false)
        setShowMusic(false)
      }
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

  return (
    <div
      className={`editor theme-${prefs.theme}${prefs.vertical ? ' vertical' : ''}${quiet ? ' quiet' : ''}`}
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
        <button
          className="btn"
          onClick={() => {
            setShowMusic((v) => !v)
            setShowPrefs(false)
          }}
          aria-expanded={showMusic}
        >
          曲
        </button>
        <button
          className="btn"
          onClick={() => {
            setShowPrefs((v) => !v)
            setShowMusic(false)
          }}
          aria-expanded={showPrefs}
        >
          表示
        </button>
      </header>

      {showMusic && (
        <div className="ed-prefs ed-music" role="dialog" aria-label="この章の曲">
          <span className="field-label">この章の曲</span>
          {sceneTracks.length ? (
            <div className="seg col">
              {sceneTracks.map((t) => (
                <TrackChip key={t.id} t={t} />
              ))}
            </div>
          ) : null}
          {work.music.length > 0 && (
            <>
              <span className="field-label">ほかの曲</span>
              <div className="seg col">
                {work.music
                  .filter((t) => !sceneTracks.includes(t))
                  .map((t) => (
                    <TrackChip key={t.id} t={t} />
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {showPrefs && (
        <div className="ed-prefs" role="dialog" aria-label="表示の設定">
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

      <div
        className="ed-page"
        onClick={() => {
          setShowPrefs(false)
          setShowMusic(false)
        }}
      >
        <input
          className="ed-title"
          value={ch.title}
          placeholder="章のタイトル"
          aria-label="章のタイトル"
          onChange={(e) => edit({ title: e.target.value })}
        />
        <textarea
          ref={bodyRef}
          className="ed-body"
          value={ch.body}
          spellCheck={false}
          aria-label="本文"
          onChange={(e) => edit({ body: e.target.value })}
          onKeyDown={() => !quiet && setQuiet(true)}
        />
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
