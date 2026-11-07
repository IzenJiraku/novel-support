import { useEffect, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { db } from './db'

/* ───────── ファイルの表示用URL ───────── */

const urlCache = new Map<string, string>()

export function useFileURL(id: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(id ? urlCache.get(id) ?? null : null)
  useEffect(() => {
    if (!id) {
      setUrl(null)
      return
    }
    const cached = urlCache.get(id)
    if (cached) {
      setUrl(cached)
      return
    }
    let alive = true
    db.files.get(id).then((f) => {
      if (!alive || !f) return
      const u = URL.createObjectURL(f.blob)
      urlCache.set(id, u)
      setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [id])
  return url
}

export async function fileURL(id: string) {
  const c = urlCache.get(id)
  if (c) return c
  const f = await db.files.get(id)
  if (!f) return null
  const u = URL.createObjectURL(f.blob)
  urlCache.set(id, u)
  return u
}

export function FileImage({ id, alt = '', className }: { id: string | null | undefined; alt?: string; className?: string }) {
  const url = useFileURL(id)
  if (!url) return <div className={'img-missing ' + (className ?? '')} aria-hidden="true" />
  return <img src={url} alt={alt} className={className} loading="lazy" draggable={false} />
}

/* ───────── モーダル ───────── */

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', k)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' modal-wide' : '')} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="閉じる">
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

/** 画面内で確認を取る（ブラウザ標準の confirm は使わない） */
export function confirmDialog(message: string, okLabel = '削除する'): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const done = (v: boolean) => {
      root.unmount()
      host.remove()
      resolve(v)
    }
    root.render(
      <Modal
        title="確認"
        onClose={() => done(false)}
        footer={
          <>
            <button className="btn ghost" onClick={() => done(false)}>
              やめる
            </button>
            <button className="btn danger" autoFocus onClick={() => done(true)}>
              {okLabel}
            </button>
          </>
        }
      >
        <p className="confirm-text">{message}</p>
      </Modal>,
    )
  })
}

/* ───────── トースト ───────── */

let toastEl: HTMLDivElement | null = null
let toastTimer: number | undefined
export function toast(msg: string) {
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.className = 'toast'
    toastEl.setAttribute('role', 'status')
    document.body.appendChild(toastEl)
  }
  toastEl.textContent = msg
  toastEl.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('show'), 2400)
}

/* ───────── アイコン（線画） ───────── */

const PATHS: Record<string, string> = {
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  pen: 'M4 20l4-1 11-11-3-3L5 16l-1 4z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1 1 0 1 0 0-.01',
  music: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  zoomin: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6',
  zoomout: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1-4 4-6 8-6s7 2 8 6',
  edge: 'M5 12h14M15 8l4 4-4 4',
}

export function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}

export const fmtDate = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export const fmtNum = (n: number) => n.toLocaleString('ja-JP')
