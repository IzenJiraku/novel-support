import { useLiveQuery } from 'dexie-react-hooks'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWork, db, importWorkJSON } from '../db'
import { Menu, toast } from '../ui'
import CoverThumb from '../components/CoverThumb'

export default function Library() {
  const works = useLiveQuery(() => db.works.orderBy('updatedAt').reverse().toArray(), [])
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const onNew = async () => {
    const id = await createWork()
    nav(`/w/${id}/overview`)
  }
  const onImport = async (f: File | undefined) => {
    if (!f) return
    try {
      const id = await importWorkJSON(await f.text())
      toast('バックアップから作品を読み込みました')
      nav(`/w/${id}/overview`)
    } catch (e) {
      toast(e instanceof Error ? e.message : '読み込めませんでした')
    }
  }

  return (
    <div className="library">
      <header className="lib-head">
        <h1 className="logo">Solo Study</h1>
        <div className="lib-actions">
          <button className="btn primary" onClick={onNew}>
            新しい作品
          </button>
          <a className="btn" href="#/pieces">
            断片
          </a>
          <Menu right>
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
