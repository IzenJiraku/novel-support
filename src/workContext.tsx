import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { db, type Work } from './db'

interface WorkCtx {
  work: Work
  update: (fn: (w: Work) => void) => void
  flush: () => Promise<void>
}

const Ctx = createContext<WorkCtx | null>(null)

export function useWork() {
  const c = useContext(Ctx)
  if (!c) throw new Error('WorkProvider の外で useWork が呼ばれました')
  return c
}

/**
 * 作品データを手元の state で持ち、入力のたびに少し待ってから IndexedDB に保存する。
 * 入力中にカーソルが飛ばないよう、表示は常に手元の state を使う。
 */
export function WorkProvider({ id, children, fallback }: { id: string; children: ReactNode; fallback: ReactNode }) {
  const [work, setWork] = useState<Work | null | undefined>(undefined)
  const ref = useRef<Work | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const dirty = useRef(false)

  useEffect(() => {
    let alive = true
    db.works.get(id).then((w) => {
      if (!alive) return
      ref.current = w ?? null
      setWork(w ?? null)
    })
    return () => {
      alive = false
    }
  }, [id])

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    if (dirty.current && ref.current) {
      dirty.current = false
      await db.works.put(ref.current)
    }
  }, [])

  const update = useCallback(
    (fn: (w: Work) => void) => {
      if (!ref.current) return
      const next = structuredClone(ref.current)
      fn(next)
      next.updatedAt = Date.now()
      ref.current = next
      dirty.current = true
      setWork(next)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, 500)
    },
    [flush],
  )

  useEffect(() => {
    const onHide = () => void flush()
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      void flush()
    }
  }, [flush])

  if (work === undefined) return <>{fallback}</>
  if (work === null)
    return (
      <div className="empty-page">
        <p>この作品は見つかりませんでした。</p>
        <a className="btn" href="#/">作品一覧へ</a>
      </div>
    )
  return <Ctx.Provider value={{ work, update, flush }}>{children}</Ctx.Provider>
}
