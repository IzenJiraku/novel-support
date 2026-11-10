import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import { db, manuscriptSheets } from '../db'
import { useWork } from '../workContext'
import { fmtNum } from '../ui'
import Overview from '../sections/Overview'
import Cover from '../sections/Cover'
import Cast from '../sections/Cast'
import Plot from '../sections/Plot'
import Toc from '../sections/Toc'
import Refs from '../sections/Refs'
import Music from '../sections/Music'

const TABS = [
  { key: 'overview', label: '概要' },
  { key: 'cover', label: '表紙' },
  { key: 'cast', label: '相関図' },
  { key: 'plot', label: '構成' },
  { key: 'toc', label: '目次・本文' },
  { key: 'refs', label: '参考画像' },
  { key: 'music', label: '音楽' },
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
        <a className="logo" href="#/">
          Solo Study
        </a>
        <p className="worknav-title">{work.title || '無題'}</p>
        <nav className="tabs" aria-label="作品のページ">
          {TABS.map((t) => (
            <NavLink key={t.key} to={`../${t.key}`} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
              {t.label}
            </NavLink>
          ))}
        </nav>
        <p className="worknav-stats meta">
          <span>{fmtNum(work.charCount || 0)} 字</span>
          <span>{fmtNum(sheets)} 枚</span>
          <span>{chapters?.length ?? 0} 章</span>
          <span>{work.characters.length} 人</span>
        </p>
      </aside>
      <main className="workmain" key={tab}>
        <Section />
      </main>
    </div>
  )
}
