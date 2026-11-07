import { useLiveQuery } from 'dexie-react-hooks'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWork, db, importWorkJSON } from '../db'
import { Icon, toast } from '../ui'
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
        <div className="lib-brand">
          <h1>Solo Study</h1>
          <p className="lib-tagline">自分だけの、自由な書斎</p>
        </div>
        <div className="lib-actions">
          <button className="text-btn" onClick={() => fileRef.current?.click()}>
            バックアップを読み込む
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
      </header>

      {works && (
        <ul className="shelf">
          {works.map((w) => (
            <li key={w.id}>
              <a className="book" href={`#/w/${w.id}/overview`}>
                <CoverThumb work={w} />
                <div className="book-meta">
                  <span className={'status status-' + w.status}>{w.status}</span>
                  <h3>{w.title || '無題'}</h3>
                </div>
              </a>
            </li>
          ))}
          <li>
            <button className="book book-new" onClick={onNew}>
              <span className="book-new-box">
                <Icon name="plus" size={28} />
                新しい作品
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
