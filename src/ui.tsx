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
  title?: ReactNode
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
          {title ? <h2>{title}</h2> : <span />}
          <button className="btn" onClick={onClose}>
            閉じる
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
        onClose={() => done(false)}
        footer={
          <>
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

/* ───────── 行の操作（並べ替えと削除）。文字だけで、行に触れたときに現れる ───────── */

export function RowTools({ onUp, onDown, onDelete }: { onUp?: () => void; onDown?: () => void; onDelete: () => void }) {
  return (
    <span className="row-tools">
      <button className="btn" onClick={onUp} disabled={!onUp} aria-label="上へ">
        ↑
      </button>
      <button className="btn" onClick={onDown} disabled={!onDown} aria-label="下へ">
        ↓
      </button>
      <button className="btn" onClick={onDelete}>
        削除
      </button>
    </span>
  )
}

export const fmtDate = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export const fmtNum = (n: number) => n.toLocaleString('ja-JP')
