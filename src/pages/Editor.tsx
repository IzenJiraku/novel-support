import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { countChars, db, manuscriptSheets, recountWork, type Chapter } from '../db'
import { useWork } from '../workContext'
import { Icon, fmtNum, toast } from '../ui'

interface Prefs {
  vertical: boolean
  font: 'mincho' | 'gothic' | 'kyokasho'
  size: number
  lineHeight: number
  theme: 'paper' | 'kinari' | 'night'
}
const PREF_KEY = 'shosai-editor-prefs'
const defaultPrefs: Prefs = { vertical: false, font: 'mincho', size: 18, lineHeight: 2, theme: 'paper' }

function loadPrefs(): Prefs {
  try {
    return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }
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
      if (e.key === 'Escape') setShowPrefs(false)
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
  const chars = countChars(ch.body)

  return (
    <div
      className={`editor theme-${prefs.theme} font-${prefs.font}${prefs.vertical ? ' vertical' : ''}${quiet ? ' quiet' : ''}`}
      style={{ ['--ed-size' as string]: prefs.size + 'px', ['--ed-lh' as string]: prefs.lineHeight }}
      onMouseMove={() => quiet && setQuiet(false)}
    >
      <header className="ed-bar ed-top">
        <button className="ed-btn" onClick={close}>
          <Icon name="back" size={18} /> 目次
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
        <button className="ed-btn" onClick={() => setShowPrefs((v) => !v)} aria-expanded={showPrefs}>
          <Icon name="settings" size={18} /> 表示
        </button>
        <button
          className="ed-btn hide-sm"
          aria-label="全画面"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen()
            else void document.documentElement.requestFullscreen?.().catch(() => toast('この端末では全画面にできません'))
          }}
        >
          <Icon name="expand" size={18} />
        </button>
      </header>

      {showPrefs && (
        <div className="ed-prefs" role="dialog" aria-label="表示の設定">
          <div className="pref">
            <span>組み方</span>
            <div className="seg small">
              <button className={'seg-btn' + (!prefs.vertical ? ' on' : '')} onClick={() => setPrefs({ ...prefs, vertical: false })}>
                横書き
              </button>
              <button className={'seg-btn' + (prefs.vertical ? ' on' : '')} onClick={() => setPrefs({ ...prefs, vertical: true })}>
                縦書き
              </button>
            </div>
          </div>
          <div className="pref">
            <span>書体</span>
            <div className="seg small">
              {(
                [
                  ['mincho', '明朝'],
                  ['gothic', 'ゴシック'],
                  ['kyokasho', '手書き風'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={'seg-btn' + (prefs.font === k ? ' on' : '')} onClick={() => setPrefs({ ...prefs, font: k })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="pref">
            <span>紙の色</span>
            <div className="seg small">
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
          <label className="pref">
            <span>文字の大きさ {prefs.size}px</span>
            <input type="range" min={14} max={28} value={prefs.size} onChange={(e) => setPrefs({ ...prefs, size: +e.target.value })} />
          </label>
          <label className="pref">
            <span>行間 {prefs.lineHeight.toFixed(1)}</span>
            <input type="range" min={1.5} max={2.6} step={0.1} value={prefs.lineHeight} onChange={(e) => setPrefs({ ...prefs, lineHeight: +e.target.value })} />
          </label>
        </div>
      )}

      <div className="ed-page" onClick={() => setShowPrefs(false)}>
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
          placeholder="ここから書きはじめる"
          aria-label="本文"
          onChange={(e) => edit({ body: e.target.value })}
          onKeyDown={() => !quiet && setQuiet(true)}
        />
      </div>

      <footer className="ed-bar ed-bottom">
        <button className="ed-btn" disabled={idx <= 0} onClick={() => idx > 0 && nav(`../write/${chapters![idx - 1].id}`, { replace: true })}>
          ← 前の章
        </button>
        <span className="ed-count">
          {fmtNum(chars)} 字 ・ 原稿用紙 {manuscriptSheets(ch.body)} 枚
        </span>
        <span className={'ed-save ' + save}>{save === 'saved' ? '保存済み' : save === 'saving' ? '保存中…' : '編集中'}</span>
        <button
          className="ed-btn"
          disabled={!chapters || idx >= chapters.length - 1}
          onClick={() => chapters && idx < chapters.length - 1 && nav(`../write/${chapters[idx + 1].id}`, { replace: true })}
        >
          次の章 →
        </button>
      </footer>
    </div>
  )
}
