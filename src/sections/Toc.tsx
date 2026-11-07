import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { countChars, db, manuscriptSheets, recountWork, uid } from '../db'
import { useWork } from '../workContext'
import { Icon, confirmDialog, fmtDate, fmtNum } from '../ui'

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

  const total = chapters?.reduce((n, c) => n + countChars(c.body), 0) ?? 0

  return (
    <section className="sec">
      <header className="sec-head">
        <h2 className="sec-title">
          <span className="en">Contents</span>
          <span className="ja">目次</span>
        </h2>
        <p className="sec-hint">章を並べ替えたり名前を変えたりできます。「書く」で執筆画面が開きます。</p>
      </header>

      <div className="toc-book">
        <p className="toc-title">{work.title || '無題'}</p>
        {chapters && chapters.length === 0 && <p className="muted">まだ章がありません。</p>}
        <ol className="toc">
          {chapters?.map((c, i) => (
            <li key={c.id} className="toc-row">
              <span className="toc-no">{String(i + 1).padStart(2, '0')}</span>
              <input
                className="toc-name"
                value={c.title}
                aria-label="章のタイトル"
                onChange={(e) => db.chapters.update(c.id, { title: e.target.value, updatedAt: Date.now() })}
              />
              <span className="toc-leader" aria-hidden="true" />
              <span className="toc-count">
                {fmtNum(countChars(c.body))} 字<small>{c.body ? `${manuscriptSheets(c.body)} 枚 ・ ${fmtDate(c.updatedAt)}` : '未着手'}</small>
              </span>
              <span className="toc-tools">
                <Link className="btn small primary" to={`../write/${c.id}`}>
                  <Icon name="pen" size={16} /> 書く
                </Link>
                <button className="icon-btn" onClick={() => swap(i, -1)} disabled={i === 0} aria-label="上へ">
                  <Icon name="up" size={18} />
                </button>
                <button className="icon-btn" onClick={() => swap(i, 1)} disabled={i === chapters.length - 1} aria-label="下へ">
                  <Icon name="down" size={18} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="章を削除"
                  onClick={async () => {
                    if (!(await confirmDialog(`「${c.title || '無題の章'}」を削除します。この章の本文（${fmtNum(countChars(c.body))} 字）も消えます。`))) return
                    await db.chapters.delete(c.id)
                    const n = await recountWork(work.id)
                    update((w) => {
                      w.charCount = n
                    })
                  }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </span>
            </li>
          ))}
        </ol>
        <div className="toc-foot">
          <button className="btn ghost" onClick={add}>
            <Icon name="plus" size={18} /> 章を追加
          </button>
          <span className="muted">
            合計 {fmtNum(total)} 字 ・ 原稿用紙 {fmtNum(chapters?.reduce((n, c) => n + manuscriptSheets(c.body), 0) ?? 0)} 枚
          </span>
        </div>
      </div>
    </section>
  )
}
