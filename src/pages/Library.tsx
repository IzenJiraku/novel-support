import { useLiveQuery } from 'dexie-react-hooks'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWork, db, downloadBlob, exportLibraryJSON, importBackupJSON } from '../db'
import { Menu, fmtDate, toast } from '../ui'
import { LAST_KEY } from './Editor'
import CoverThumb from '../components/CoverThumb'

export default function Library() {
  const works = useLiveQuery(() => db.works.orderBy('updatedAt').reverse().toArray(), [])
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  // 最後に書いていた章が残っていれば、そこへまっすぐ戻れるようにする
  const last = useLiveQuery(async () => {
    try {
      const l = JSON.parse(localStorage.getItem(LAST_KEY) || 'null') as { workId: string; chapterId: string } | null
      if (!l) return null
      const [w, c] = await Promise.all([db.works.get(l.workId), db.chapters.get(l.chapterId)])
      return w && c ? { href: `#/w/${w.id}/write/${c.id}`, title: w.title || '無題' } : null
    } catch {
      return null
    }
  }, [])

  const onNew = async () => {
    const id = await createWork()
    nav(`/w/${id}/overview`)
  }
  const onImport = async (f: File | undefined) => {
    if (!f) return
    try {
      const r = await importBackupJSON(await f.text())
      if (r.openId) {
        toast('バックアップから作品を読み込みました')
        nav(`/w/${r.openId}/overview`)
      } else {
        const parts = [r.added && `${r.added} 作品を追加`, r.updated && `${r.updated} 作品を更新`, r.kept && `${r.kept} 作品はこの端末のほうが新しいのでそのまま`].filter(Boolean)
        toast(parts.join('、') || '読み込む作品がありませんでした')
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : '読み込めませんでした')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const onExportAll = async () => {
    downloadBlob(`SoloStudy-${fmtDate(Date.now()).replaceAll('.', '')}.shosai.json`, await exportLibraryJSON(), 'application/json')
    try {
      localStorage.setItem('shosai-last-backup', String(Date.now()))
    } catch {
      /* 記録できなくても続ける */
    }
  }

  return (
    <div className="library">
      <header className="lib-head">
        <h1 className="logo">Solo Study</h1>
        <div className="lib-actions">
          {last && (
            <a className="btn primary" href={last.href}>
              続きを書く
            </a>
          )}
          <button className={'btn' + (last ? '' : ' primary')} onClick={onNew}>
            新しい作品
          </button>
          <a className="btn" href="#/pieces">
            断片
          </a>
          <Menu right>
            <button className="btn" role="menuitem" onClick={onExportAll}>
              すべてをバックアップ
            </button>
            <button className="btn" role="menuitem" onClick={() => fileRef.current?.click()}>
              バックアップを読み込む
            </button>
          </Menu>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
      </header>

      {works && (
        <ul className="shelf">
          {works.map((w) => (
            <li key={w.id}>
              <a className="book" href={`#/w/${w.id}/overview`}>
                <CoverThumb work={w} />
                <span className="book-title">{w.title || '無題'}</span>
                <span className="meta">{w.status}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
