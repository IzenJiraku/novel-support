import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { countChars, db, recountWork, uid } from '../db'
import { useWork } from '../workContext'
import { RowTools, confirmDialog, fmtNum } from '../ui'

export default function Toc() {
  const { work, update } = useWork()
  const nav = useNavigate()
  const chapters = useLiveQuery(() => db.chapters.where('workId').equals(work.id).sortBy('order'), [work.id])

  const add = async () => {
    const order = (chapters?.at(-1)?.order ?? 0) + 1
    const id = uid()
    await db.chapters.add({ id, workId: work.id, title: `第${order}章`, order, body: '', memo: '', updatedAt: Date.now() })
    nav(`../write/${id}`)
  }

  const swap = async (i: number, d: number) => {
    if (!chapters) return
    const a = chapters[i]
    const b = chapters[i + d]
    if (!a || !b) return
    await db.transaction('rw', db.chapters, async () => {
      await db.chapters.update(a.id, { order: b.order })
      await db.chapters.update(b.id, { order: a.order })
    })
  }


  return (
    <section className="sec">
      <header className="sec-head">
        <h2>目次</h2>
      </header>

      <ol className="toc">
          {chapters?.map((c, i) => (
            <li key={c.id} className="toc-row">
              <span className="meta">{String(i + 1).padStart(2, '0')}</span>
              <input
                className="toc-name"
                value={c.title}
                aria-label="章のタイトル"
                onChange={(e) => db.chapters.update(c.id, { title: e.target.value, updatedAt: Date.now() })}
              />
              <span className="meta">{fmtNum(countChars(c.body))} 字</span>
              <Link className="btn primary" to={`../write/${c.id}`}>
                書く
              </Link>
              <RowTools
                onUp={i > 0 ? () => swap(i, -1) : undefined}
                onDown={i < chapters.length - 1 ? () => swap(i, 1) : undefined}
                onDelete={async () => {
                  if (!(await confirmDialog(`「${c.title || '無題の章'}」を削除します。この章の本文（${fmtNum(countChars(c.body))} 字）も消えます。`))) return
                  await db.chapters.delete(c.id)
                  const n = await recountWork(work.id)
                  update((w) => {
                    w.charCount = n
                  })
                }}
              />
            </li>
          ))}
      </ol>
      <button className="btn" onClick={add}>
        章を追加
      </button>
    </section>
  )
}
