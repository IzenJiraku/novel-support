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
  { key: 'overview', label: 'Overview', sub: '概要' },
  { key: 'cover', label: 'Cover', sub: '表紙' },
  { key: 'cast', label: 'Characters', sub: '相関図' },
  { key: 'plot', label: 'Structure', sub: '構成' },
  { key: 'toc', label: 'Contents', sub: '目次・本文' },
  { key: 'refs', label: 'References', sub: '参考画像' },
  { key: 'music', label: 'Music', sub: 'イメージ音楽' },
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
          <Icon name="back" size={14} /> Solo Study
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
            <dt>Words</dt>
            <dd>{fmtNum(work.charCount || 0)}<small>字</small></dd>
          </div>
          <div>
            <dt>Sheets</dt>
            <dd>{fmtNum(sheets)}<small>枚</small></dd>
          </div>
          <div>
            <dt>Chapters</dt>
            <dd>{chapters?.length ?? 0}</dd>
          </div>
          <div>
            <dt>Cast</dt>
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
