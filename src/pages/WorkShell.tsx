import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { db, manuscriptSheets } from '../db'
import { useWork } from '../workContext'
import { Icon, fmtNum } from '../ui'
import Overview from '../sections/Overview'
import Cover from '../sections/Cover'
import Cast from '../sections/Cast'
import Plot from '../sections/Plot'
import Toc from '../sections/Toc'
import Refs from '../sections/Refs'
import Music from '../sections/Music'

const TABS = [
  { key: 'overview', label: '概要', sub: 'タイトル・あらすじ' },
  { key: 'cover', label: '表紙', sub: 'ポスターをつくる' },
  { key: 'cast', label: '相関図', sub: '登場人物と関係' },
  { key: 'plot', label: '構成', sub: '物語の骨組み' },
  { key: 'toc', label: '目次', sub: '章と本文' },
  { key: 'refs', label: '参考画像', sub: '資料・イメージ' },
  { key: 'music', label: 'イメージ音楽', sub: '作品の音' },
] as const

export default function WorkShell() {
  const { tab } = useParams()
  const { work } = useWork()
  const chapters = useLiveQuery(() => db.chapters.where('workId').equals(work.id).toArray(), [work.id])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])
  const sheets = chapters?.reduce((n, c) => n + manuscriptSheets(c.body), 0) ?? 0

  const Section = { overview: Overview, cover: Cover, cast: Cast, plot: Plot, toc: Toc, refs: Refs, music: Music }[tab ?? '']
  if (!Section) return <Navigate to="../overview" replace />

  return (
    <div className="work">
      <aside className="worknav">
        <a className="back-link" href="#/">
          <Icon name="back" size={18} /> 作品一覧
        </a>
        <p className="worknav-title">{work.title || '無題'}</p>
        <nav className="tabs" aria-label="作品のページ">
          {TABS.map((t) => (
            <NavLink key={t.key} to={`../${t.key}`} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
              <span className="tab-label">{t.label}</span>
              <span className="tab-sub">{t.sub}</span>
            </NavLink>
          ))}
        </nav>
        <dl className="worknav-stats">
          <div>
            <dt>本文</dt>
            <dd>{fmtNum(work.charCount || 0)} 字</dd>
          </div>
          <div>
            <dt>原稿用紙</dt>
            <dd>{fmtNum(sheets)} 枚</dd>
          </div>
          <div>
            <dt>章</dt>
            <dd>{chapters?.length ?? 0}</dd>
          </div>
          <div>
            <dt>人物</dt>
            <dd>{work.characters.length}</dd>
          </div>
        </dl>
      </aside>
      <main className="workmain" key={tab}>
        <Section />
      </main>
    </div>
  )
}
