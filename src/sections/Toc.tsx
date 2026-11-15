import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { countChars, db, recountWork, takeSnapshot, uid } from '../db'
import { useWork } from '../workContext'
import { LiveInput, RowTools, fmtNum, toast } from '../ui'

const kanji = (n: number) => {
  const d = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (n <= 0 || n > 99) return String(n)
  const t = Math.floor(n / 10)
  return (t > 1 ? d[t] : '') + (t > 0 ? '十' : '') + d[n % 10]
}

export default function Toc() {
  const { work, update } = useWork()
  const nav = useNavigate()
  const chapters = useLiveQuery(() => db.chapters.where('workId').equals(work.id).sortBy('order'), [work.id])

  const add = async () => {
    const order = (chapters?.at(-1)?.order ?? 0) + 1
    const id = uid()
    await db.chapters.add({ id, workId: work.id, title: `第${kanji((chapters?.length ?? 0) + 1)}章`, order, body: '', memo: '', updatedAt: Date.now() })
    nav(`../write/${id}`)
  }

  const recount = async () => {
    const n = await recountWork(work.id)
    update((w) => {
      w.charCount = n
    })
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
              <LiveInput
                className="toc-name"
                value={c.title}
                aria-label="章のタイトル"
                onCommit={(title) => void db.chapters.update(c.id, { title, updatedAt: Date.now() })}
              />
              <span className="meta">{fmtNum(countChars(c.body))} 字</span>
              <Link className="btn primary" to={`../write/${c.id}`}>
                書く
              </Link>
              <RowTools
                onUp={i > 0 ? () => swap(i, -1) : undefined}
                onDown={i < chapters.length - 1 ? () => swap(i, 1) : undefined}
                onDelete={async () => {
                  // 確認は挟まず、すぐ元に戻せるようにする
                  await takeSnapshot(c)
                  await db.chapters.delete(c.id)
                  await recount()
                  toast(`「${c.title || '無題の章'}」を削除しました`, {
                    label: '元に戻す',
                    run: async () => {
                      await db.chapters.put(c)
                      await recount()
                    },
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
