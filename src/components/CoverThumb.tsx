import type { Work } from '../db'
import { FileImage } from '../ui'

/** 表紙が未作成のときは、タイトルを縦組みにした仮の表紙を出す */
export default function CoverThumb({ work, className = '' }: { work: Pick<Work, 'title' | 'penName' | 'coverImageId' | 'id'>; className?: string }) {
  if (work.coverImageId) return <FileImage id={work.coverImageId} alt={`${work.title}の表紙`} className={'cover-thumb ' + className} />
  const hue = [...work.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  return (
    <div className={'cover-thumb cover-placeholder ' + className} style={{ ['--hue' as string]: hue }} aria-label={`${work.title}（表紙未作成）`}>
      <span className="ph-title">{work.title || '無題'}</span>
      {work.penName && <span className="ph-author">{work.penName}</span>}
    </div>
  )
}
