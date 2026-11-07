import { useLiveQuery } from 'dexie-react-hooks'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createWork, db, importWorkJSON } from '../db'
import { Icon, fmtDate, fmtNum, toast } from '../ui'
import CoverThumb from '../components/CoverThumb'
import { createSampleWork } from '../sample'

export default function Library() {
  const works = useLiveQuery(() => db.works.orderBy('updatedAt').reverse().toArray(), [])
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const onNew = async () => {
    const id = await createWork()
    nav(`/w/${id}/overview`)
  }
  const onSample = async () => {
    const id = await createSampleWork()
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

  const total = works?.reduce((n, w) => n + (w.charCount || 0), 0) ?? 0

  return (
    <div className="library">
      <header className="lib-head">
        <div className="lib-brand">
          <h1>Solo Study</h1>
          <p className="lib-tagline">自分だけの、自由な書斎</p>
          <p className="lib-count">
            {works ? `${works.length} 作品` : '…'}
            {works && works.length > 0 && <> ・ これまでに {fmtNum(total)} 字</>}
          </p>
        </div>
        <div className="lib-actions">
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            読み込む
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          <button className="btn primary" onClick={onNew}>
            <Icon name="plus" size={14} /> 新しい作品
          </button>
        </div>
      </header>

      {works && works.length === 0 && (
        <section className="lib-empty">
          <div className="lib-empty-art" aria-hidden="true">
            <span>Solo</span>
            <span>Study</span>
          </div>
          <div>
            <h2>最初の一冊をはじめましょう</h2>
            <p>
              作品ごとに、タイトル・表紙・あらすじ・構成・目次・本文・相関図・参考画像・イメージ音楽をひとまとめにできます。
              書いたものはこの端末に保存され、オフラインでも開けます。
            </p>
            <div className="row">
              <button className="btn primary" onClick={onNew}>
                新しい作品をつくる
              </button>
              <button className="btn ghost" onClick={onSample}>
                サンプル作品で試す
              </button>
            </div>
          </div>
        </section>
      )}

      {works && works.length > 0 && (
        <ul className="shelf">
          {works.map((w) => (
            <li key={w.id}>
              <a className="book" href={`#/w/${w.id}/overview`}>
                <CoverThumb work={w} />
                <div className="book-meta">
                  <span className={'status status-' + w.status}>{w.status}</span>
                  <h3>{w.title || '無題'}</h3>
                  {w.logline && <p className="book-logline">{w.logline}</p>}
                  <p className="book-num">
                    {fmtNum(w.charCount || 0)} 字<span className="sep">／</span>
                    {fmtDate(w.updatedAt)} 更新
                  </p>
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
      <p className="lib-foot">原稿用紙換算は 400 字詰め（1 行 20 字・改行で次の行）で数えています。</p>
    </div>
  )
}
