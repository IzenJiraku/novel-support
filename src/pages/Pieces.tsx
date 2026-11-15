import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PIECE_KINDS, createWork, db, uid, type Piece } from '../db'
import { AutoArea } from '../components/Field'
import { confirmDialog, fmtDate, toast } from '../ui'

interface Slot {
  id: string
  pinned: boolean
}

const TABLE_KEY = 'solo-study:pieces-table'

function loadTable(): Slot[] {
  try {
    const v = JSON.parse(localStorage.getItem(TABLE_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const shuffle = <T,>(a: T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/** 固定した断片は残し、残りの枠を「まだ卓に無い種類」を優先してランダムに埋める */
function draw(pieces: Piece[], table: Slot[], size: number): Slot[] {
  const kept = table.filter((s) => s.pinned)
  const usedIds = new Set(table.map((s) => s.id))
  const usedKinds = new Set(kept.map((s) => pieces.find((p) => p.id === s.id)?.kind ?? ''))
  // 直前に卓にあったものは避ける（足りないときだけ使う）
  const fresh = shuffle(pieces.filter((p) => !usedIds.has(p.id)))
  const stale = shuffle(pieces.filter((p) => usedIds.has(p.id) && !kept.some((s) => s.id === p.id)))
  const pool = [...fresh, ...stale]
  const out = [...kept]
  while (out.length < size && pool.length) {
    let i = pool.findIndex((p) => !p.kind || !usedKinds.has(p.kind))
    if (i < 0) i = 0
    const [p] = pool.splice(i, 1)
    if (p.kind) usedKinds.add(p.kind)
    out.push({ id: p.id, pinned: false })
  }
  return out
}

export default function Pieces() {
  const pieces = useLiveQuery(() => db.pieces.orderBy('createdAt').reverse().toArray(), [])
  const sparks = useLiveQuery(() => db.sparks.orderBy('createdAt').reverse().toArray(), [])
  const nav = useNavigate()

  const [text, setText] = useState('')
  const [kind, setKind] = useState('')
  const [filter, setFilter] = useState('')
  const [table, setTable] = useState<Slot[]>(loadTable)
  const [size, setSize] = useState(3)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(TABLE_KEY, JSON.stringify(table))
  }, [table])

  const byId = useMemo(() => new Map((pieces ?? []).map((p) => [p.id, p])), [pieces])
  // 消された断片は卓からも外す
  const onTable = table.filter((s) => byId.has(s.id))
  const shown = (pieces ?? []).filter((p) => !filter || p.kind === filter)

  const add = async () => {
    const t = text.trim()
    if (!t) return
    await db.pieces.add({ id: uid(), text: t, kind, createdAt: Date.now() })
    setText('')
  }

  const toggleOnTable = (id: string) =>
    setTable((tb) => (tb.some((s) => s.id === id) ? tb.filter((s) => s.id !== id) : [...tb, { id, pinned: true }]))

  const saveSpark = async () => {
    const ps = onTable.map((s) => byId.get(s.id)!)
    await db.sparks.add({
      id: uid(),
      pieceIds: ps.map((p) => p.id),
      texts: ps.map((p) => p.text),
      note: note.trim(),
      workId: null,
      createdAt: Date.now(),
    })
    setNote('')
    toast('ひらめきを残しました')
  }

  const toWork = async (sparkId: string) => {
    const s = await db.sparks.get(sparkId)
    if (!s) return
    const first = s.note.split('\n')[0].trim()
    const id = await createWork({
      title: first.length > 0 && first.length <= 30 ? first : '無題の物語',
      logline: first,
      memo: ['掛け合わせた断片', ...s.texts.map((t) => '・' + t), '', s.note].join('\n').trim(),
    })
    await db.sparks.update(sparkId, { workId: id })
    nav(`/w/${id}/overview`)
  }

  if (!pieces || !sparks) return null

  return (
    <div className="pieces-page">
      <a className="logo" href="#/">
        Solo Study
      </a>
      <header className="sec-head">
        <h2>断片</h2>
      </header>

      <form
        className="pc-capture"
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="思いついたことを" aria-label="断片" />
        <div className="seg" role="group" aria-label="種類">
          {PIECE_KINDS.map((k) => (
            <button type="button" key={k} className={'seg-btn' + (kind === k ? ' on' : '')} onClick={() => setKind(kind === k ? '' : k)}>
              {k}
            </button>
          ))}
        </div>
        <button className="btn primary" disabled={!text.trim()}>
          置く
        </button>
      </form>

      <div className="pc-grid">
        <section className="pc-table-area" aria-label="掛け合わせ">
          <div className="pc-bar">
            <h3>掛け合わせ</h3>
            <span className="ed-spacer" />
            <div className="seg" role="group" aria-label="引く数">
              {[2, 3, 4].map((n) => (
                <button key={n} className={'seg-btn' + (size === n ? ' on' : '')} onClick={() => setSize(n)}>
                  {n}
                </button>
              ))}
            </div>
            <button className="btn primary" disabled={pieces.length < 2} onClick={() => setTable(draw(pieces, onTable, size))}>
              引く
            </button>
          </div>

          {onTable.length > 0 ? (
            <ol className="pc-table">
              {onTable.map((s) => {
                const p = byId.get(s.id)!
                return (
                  <li key={s.id} className={'pc-card' + (s.pinned ? ' pinned' : '')}>
                    <span className="meta">{p.kind}</span>
                    <p className="pc-card-text">{p.text}</p>
                    <div className="pc-card-tools">
                      <button
                        className="btn"
                        onClick={() => setTable((tb) => tb.map((x) => (x.id === s.id ? { ...x, pinned: !x.pinned } : x)))}
                      >
                        {s.pinned ? '固定中' : '固定'}
                      </button>
                      <button className="btn" onClick={() => toggleOnTable(s.id)}>
                        外す
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : null}

          {onTable.length >= 2 && (
            <div className="pc-note">
              <AutoArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ひらめき" aria-label="ひらめき" />
              <button className="btn primary" onClick={saveSpark} disabled={!note.trim()}>
                ひらめきを残す
              </button>
            </div>
          )}

          {sparks.length > 0 && (
            <>
              <h3>ひらめき</h3>
              <ul className="pc-sparks">
                {sparks.map((s) => (
                  <li key={s.id} className="pc-spark">
                    <p className="meta">{s.texts.join('　×　')}</p>
                    <p className="pc-spark-note">{s.note}</p>
                    <div className="pc-spark-tools">
                      <span className="meta">{fmtDate(s.createdAt)}</span>
                      <span className="ed-spacer" />
                      {s.workId ? (
                        <a className="btn" href={`#/w/${s.workId}/overview`}>
                          作品をひらく
                        </a>
                      ) : (
                        <button className="btn" onClick={() => toWork(s.id)}>
                          作品にする
                        </button>
                      )}
                      <button
                        className="btn"
                        onClick={() => setTable(s.pieceIds.filter((id) => byId.has(id)).map((id) => ({ id, pinned: true })))}
                      >
                        卓に戻す
                      </button>
                      <button
                        className="btn"
                        onClick={async () => {
                          if (await confirmDialog('このひらめきを削除します。')) await db.sparks.delete(s.id)
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="pc-list-area" aria-label="断片">
          <div className="pc-bar">
            <h3>
              断片 <small className="meta">{pieces.length}</small>
            </h3>
          </div>
          <div className="seg" role="group" aria-label="種類で絞る">
            {['', ...PIECE_KINDS].map((k) => (
              <button key={k || 'all'} className={'seg-btn' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>
                {k || 'すべて'}
              </button>
            ))}
          </div>
          <ul className="pc-list">
            {shown.map((p) =>
              editing === p.id ? (
                <PieceEditor key={p.id} piece={p} onDone={() => setEditing(null)} />
              ) : (
                <li key={p.id} className={'pc-item' + (onTable.some((s) => s.id === p.id) ? ' on' : '')}>
                  <button className="pc-item-main" onClick={() => toggleOnTable(p.id)} aria-pressed={onTable.some((s) => s.id === p.id)}>
                    <span className="meta">{p.kind}</span>
                    <span className="pc-item-text">{p.text}</span>
                  </button>
                  <span className="row-tools">
                    <button className="btn" onClick={() => setEditing(p.id)}>
                      直す
                    </button>
                  </span>
                </li>
              ),
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}

function PieceEditor({ piece, onDone }: { piece: Piece; onDone: () => void }) {
  const [text, setText] = useState(piece.text)
  const [kind, setKind] = useState(piece.kind)
  const save = async () => {
    if (text.trim()) await db.pieces.update(piece.id, { text: text.trim(), kind })
    onDone()
  }
  return (
    <li className="pc-item editing">
      <AutoArea value={text} autoFocus onChange={(e) => setText(e.target.value)} aria-label="断片" />
      <div className="seg">
        {PIECE_KINDS.map((k) => (
          <button key={k} className={'seg-btn' + (kind === k ? ' on' : '')} onClick={() => setKind(kind === k ? '' : k)}>
            {k}
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn primary" onClick={save}>
          保存
        </button>
        <button className="btn" onClick={onDone}>
          やめる
        </button>
        <span className="ed-spacer" />
        <button
          className="btn danger"
          onClick={async () => {
            if (await confirmDialog('この断片を削除します。')) {
              await db.pieces.delete(piece.id)
              onDone()
            }
          }}
        >
          削除
        </button>
      </div>
    </li>
  )
}
