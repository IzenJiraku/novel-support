import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PALETTE, newCharacter, uid, type Character, type Relation, type RelationDir, type Work } from '../db'
import { useWork } from '../workContext'
import { Icon, Modal, confirmDialog, useFileURL } from '../ui'
import Profile from './Profile'

const R = 38

interface View {
  tx: number
  ty: number
  k: number
}

export default function Cast() {
  const { work, update } = useWork()
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ tx: 0, ty: 0, k: 1 })
  const [openId, setOpenId] = useState<string | null>(null)
  const [openEdit, setOpenEdit] = useState(false)
  const [rel, setRel] = useState<Relation | 'new' | null>(null)
  const fitted = useRef(false)

  const fit = () => {
    const svg = svgRef.current
    if (!svg) return
    const { width, height } = svg.getBoundingClientRect()
    const cs = work.characters
    if (!cs.length) {
      setView({ k: 1, tx: width / 2 - 600, ty: height / 2 - 400 })
      return
    }
    const xs = cs.map((c) => c.x)
    const ys = cs.map((c) => c.y)
    const pad = 90
    const minX = Math.min(...xs) - pad
    const maxX = Math.max(...xs) + pad
    const minY = Math.min(...ys) - pad
    const maxY = Math.max(...ys) + pad + 20
    const k = Math.min(width / (maxX - minX), height / (maxY - minY), 1.3)
    setView({ k, tx: width / 2 - ((minX + maxX) / 2) * k, ty: height / 2 - ((minY + maxY) / 2) * k })
  }

  useLayoutEffect(() => {
    if (!fitted.current) {
      fit()
      fitted.current = true
    }
  })

  /* ── ドラッグ・パン・ズーム ── */
  const drag = useRef<{ type: 'node' | 'pan' | 'edge' | 'pinch'; id?: string; lx: number; ly: number; moved: number; d0?: number; k0?: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const viewRef = useRef(view)
  viewRef.current = view

  const zoomAt = (px: number, py: number, k2: number) => {
    const v = viewRef.current
    const k = Math.max(0.3, Math.min(2.5, k2))
    const wx = (px - v.tx) / v.k
    const wy = (py - v.ty) / v.k
    setView({ k, tx: px - wx * k, ty: py - wy * k })
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = svg.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, viewRef.current.k * Math.exp(-e.deltaY * 0.0015))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const onDown = (e: React.PointerEvent) => {
    const svg = svgRef.current!
    svg.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      drag.current = { type: 'pinch', lx: 0, ly: 0, moved: 99, d0: Math.hypot(a.x - b.x, a.y - b.y), k0: viewRef.current.k }
      return
    }
    const t = e.target as Element
    const node = t.closest('[data-node]') as HTMLElement | null
    const edge = t.closest('[data-edge]') as HTMLElement | null
    drag.current = {
      type: node ? 'node' : edge ? 'edge' : 'pan',
      id: node?.dataset.node ?? edge?.dataset.edge,
      lx: e.clientX,
      ly: e.clientY,
      moved: 0,
    }
  }

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (d.type === 'pinch') {
      const pts = [...pointers.current.values()]
      if (pts.length < 2) return
      const [a, b] = pts
      const r = svgRef.current!.getBoundingClientRect()
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d.k0! * (Math.hypot(a.x - b.x, a.y - b.y) / d.d0!))
      return
    }
    const dx = e.clientX - d.lx
    const dy = e.clientY - d.ly
    d.lx = e.clientX
    d.ly = e.clientY
    d.moved += Math.abs(dx) + Math.abs(dy)
    if (d.moved < 4) return
    if (d.type === 'node') {
      const k = viewRef.current.k
      update((w) => {
        const c = w.characters.find((c) => c.id === d.id)
        if (c) {
          c.x += dx / k
          c.y += dy / k
        }
      })
    } else {
      setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
    }
  }

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    const d = drag.current
    if (!d) return
    if (d.type === 'pinch') {
      if (pointers.current.size === 0) drag.current = null
      return
    }
    drag.current = null
    if (d.moved < 4) {
      if (d.type === 'node' && d.id) {
        setOpenEdit(false)
        setOpenId(d.id)
      }
      if (d.type === 'edge' && d.id) {
        const r = work.relations.find((r) => r.id === d.id)
        if (r) setRel(r)
      }
    }
  }

  const addCharacter = () => {
    const svg = svgRef.current
    const v = viewRef.current
    const c = newCharacter(work.characters.length, { name: '' })
    if (svg) {
      const r = svg.getBoundingClientRect()
      c.x = (r.width / 2 - v.tx) / v.k + (Math.random() - 0.5) * 160
      c.y = (r.height / 2 - v.ty) / v.k + (Math.random() - 0.5) * 120
    }
    update((w) => {
      w.characters.push(c)
    })
    setOpenId(c.id)
    setOpenEdit(true)
  }

  const open = work.characters.find((c) => c.id === openId) ?? null

  return (
    <section className="sec">
      <header className="sec-head">
        <h2 className="sec-title">
          <span className="en">Characters</span>
          <span className="ja">相関図</span>
        </h2>
        <p className="sec-hint">人物をドラッグして配置し、押すとプロフィール（履歴書）が開きます。関係の文字を押すと編集できます。</p>
      </header>

      <div className="cast-toolbar">
        <button className="btn primary small" onClick={addCharacter}>
          <Icon name="person" size={16} /> 人物を追加
        </button>
        <button className="btn ghost small" onClick={() => setRel('new')} disabled={work.characters.length < 2}>
          <Icon name="edge" size={16} /> 関係を追加
        </button>
        <span className="ed-spacer" />
        <button className="icon-btn" onClick={() => zoomAt(svgRef.current!.clientWidth / 2, svgRef.current!.clientHeight / 2, view.k * 1.2)} aria-label="拡大">
          <Icon name="zoomin" />
        </button>
        <button className="icon-btn" onClick={() => zoomAt(svgRef.current!.clientWidth / 2, svgRef.current!.clientHeight / 2, view.k / 1.2)} aria-label="縮小">
          <Icon name="zoomout" />
        </button>
        <button className="icon-btn" onClick={fit} aria-label="全体を表示">
          <Icon name="fit" />
        </button>
      </div>

      <div className="cast-stage">
        <svg ref={svgRef} className="cast-svg" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <Diagram work={work} view={view} />
        </svg>
        {work.characters.length === 0 && (
          <div className="cast-empty">
            <p>まだ登場人物がいません。</p>
            <button className="btn primary" onClick={addCharacter}>
              <Icon name="person" size={18} /> 最初の人物を追加
            </button>
          </div>
        )}
      </div>

      {work.characters.length > 0 && (
        <>
          <h3 className="sub-head">登場人物一覧</h3>
          <ul className="cast-list">
            {work.characters.map((c) => (
              <li key={c.id}>
                <button
                  className="cast-card"
                  onClick={() => {
                    setOpenEdit(false)
                    setOpenId(c.id)
                  }}
                >
                  <Avatar c={c} size={48} />
                  <span className="cast-card-text">
                    <strong>{c.name || '名前未設定'}</strong>
                    <small>{[c.role, c.age && `${c.age}歳`, c.occupation].filter(Boolean).join(' ・ ') || 'プロフィール未記入'}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {open && <Profile key={open.id} c={open} startEditing={openEdit} onClose={() => setOpenId(null)} />}
      {rel && <RelationDialog initial={rel === 'new' ? null : rel} onClose={() => setRel(null)} />}
    </section>
  )
}

export function Avatar({ c, size }: { c: Character; size: number }) {
  const url = useFileURL(c.photoId)
  return (
    <span className="avatar" style={{ width: size, height: size, background: c.color }}>
      {url ? <img src={url} alt="" /> : <span style={{ fontSize: size * 0.42 }}>{(c.name || '？').slice(0, 1)}</span>}
    </span>
  )
}

/* ───────── 図の描画 ───────── */

function Diagram({ work, view }: { work: Work; view: View }) {
  const byId = new Map(work.characters.map((c) => [c.id, c]))
  const colors = [...new Set(work.relations.map((r) => r.color))]
  // 同じ二人の間の関係はカーブをずらして重ならないようにする
  const pairCount = new Map<string, number>()
  const pairIdx = new Map<string, number>()
  for (const r of work.relations) {
    const key = [r.from, r.to].sort().join('|')
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1)
  }

  return (
    <>
      <defs>
        {colors.map((col) => (
          <marker key={col} id={'arr-' + col.slice(1)} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={col} />
          </marker>
        ))}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" className="grid-line" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" className="cast-bg" />
      <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
        {work.relations.map((r) => {
          const a = byId.get(r.from)
          const b = byId.get(r.to)
          if (!a || !b) return null
          const key = [r.from, r.to].sort().join('|')
          const n = pairCount.get(key)!
          const i = pairIdx.get(key) ?? 0
          pairIdx.set(key, i + 1)
          // 並びの向きを揃えた法線方向にずらす
          const [p, q] = r.from < r.to ? [a, b] : [b, a]
          const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
          const nx = -(q.y - p.y) / len
          const ny = (q.x - p.x) / len
          const off = (i - (n - 1) / 2) * 56
          const cx = (a.x + b.x) / 2 + nx * off
          const cy = (a.y + b.y) / 2 + ny * off
          const unit = (x: number, y: number) => {
            const l = Math.hypot(x, y) || 1
            return [x / l, y / l]
          }
          const [ux, uy] = unit(cx - a.x, cy - a.y)
          const [vx, vy] = unit(cx - b.x, cy - b.y)
          const sx = a.x + ux * (R + 4)
          const sy = a.y + uy * (R + 4)
          const ex = b.x + vx * (R + 6)
          const ey = b.y + vy * (R + 6)
          const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex
          const my = 0.25 * sy + 0.5 * cy + 0.25 * ey
          const marker = `url(#arr-${r.color.slice(1)})`
          const w = Math.max(40, [...r.label].length * 14 + 18)
          return (
            <g key={r.id} className="edge" data-edge={r.id}>
              <path
                d={`M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`}
                fill="none"
                stroke={r.color}
                strokeWidth={2}
                markerEnd={r.dir !== 'none' ? marker : undefined}
                markerStart={r.dir === 'both' ? marker : undefined}
              />
              <path d={`M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`} fill="none" stroke="transparent" strokeWidth={16} />
              {r.label && (
                <g transform={`translate(${mx} ${my})`} className="edge-label">
                  <rect x={-w / 2} y={-13} width={w} height={26} rx={13} stroke={r.color} />
                  <text textAnchor="middle" dy="0.35em" fill={r.color}>
                    {r.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}
        {work.characters.map((c) => (
          <Node key={c.id} c={c} />
        ))}
      </g>
    </>
  )
}

function Node({ c }: { c: Character }) {
  const url = useFileURL(c.photoId)
  return (
    <g className="node" data-node={c.id} transform={`translate(${c.x} ${c.y})`} tabIndex={0} role="button" aria-label={`${c.name || '名前未設定'}のプロフィール`}>
      <circle r={R + 3} fill="none" stroke={c.color} strokeWidth={2} className="node-ring" />
      <clipPath id={'cp-' + c.id}>
        <circle r={R - 2} />
      </clipPath>
      <circle r={R - 2} fill={c.color} />
      {url ? (
        <image href={url} x={-(R - 2)} y={-(R - 2)} width={(R - 2) * 2} height={(R - 2) * 2} clipPath={`url(#cp-${c.id})`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <text className="node-initial" textAnchor="middle" dy="0.36em">
          {(c.name || '？').slice(0, 1)}
        </text>
      )}
      <text className="node-name" textAnchor="middle" y={R + 22}>
        {c.name || '名前未設定'}
      </text>
      {c.role && (
        <text className="node-role" textAnchor="middle" y={R + 40}>
          {c.role}
        </text>
      )}
    </g>
  )
}

/* ───────── 関係の追加・編集 ───────── */

function RelationDialog({ initial, onClose }: { initial: Relation | null; onClose: () => void }) {
  const { work, update } = useWork()
  const cs = work.characters
  const [r, setR] = useState<Relation>(
    initial ?? { id: uid(), from: cs[0]?.id ?? '', to: cs[1]?.id ?? '', label: '', dir: 'one', color: PALETTE[0] },
  )
  const save = () => {
    if (!r.from || !r.to || r.from === r.to) return
    update((w) => {
      const i = w.relations.findIndex((x) => x.id === r.id)
      if (i >= 0) w.relations[i] = r
      else w.relations.push(r)
    })
    onClose()
  }
  const name = (id: string) => cs.find((c) => c.id === id)?.name || '名前未設定'
  return (
    <Modal
      title={initial ? '関係を編集' : '関係を追加'}
      onClose={onClose}
      footer={
        <>
          {initial && (
            <button
              className="btn ghost danger-text"
              onClick={async () => {
                if (!(await confirmDialog(`${name(r.from)} と ${name(r.to)} の関係「${r.label}」を削除します。`))) return
                update((w) => {
                  w.relations = w.relations.filter((x) => x.id !== r.id)
                })
                onClose()
              }}
            >
              削除
            </button>
          )}
          <span className="ed-spacer" />
          <button className="btn ghost" onClick={onClose}>
            やめる
          </button>
          <button className="btn primary" onClick={save} disabled={!r.from || !r.to || r.from === r.to}>
            保存
          </button>
        </>
      }
    >
      <div className="rel-form">
        <label className="field">
          <span className="field-label">だれが</span>
          <select value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })}>
            {cs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || '名前未設定'}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">だれに</span>
          <select value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })}>
            {cs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || '名前未設定'}
              </option>
            ))}
          </select>
        </label>
        <label className="field rel-wide">
          <span className="field-label">関係・気持ち</span>
          <input value={r.label} autoFocus placeholder="例：幼なじみ、片思い、師匠、因縁" onChange={(e) => setR({ ...r, label: e.target.value })} />
        </label>
        <div className="field rel-wide">
          <span className="field-label">矢印</span>
          <div className="seg small">
            {(
              [
                ['one', '→ 一方向'],
                ['both', '↔ 双方向'],
                ['none', '― 矢印なし'],
              ] as [RelationDir, string][]
            ).map(([k, l]) => (
              <button key={k} className={'seg-btn' + (r.dir === k ? ' on' : '')} onClick={() => setR({ ...r, dir: k })}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="field rel-wide">
          <span className="field-label">線の色</span>
          <div className="swatches">
            {PALETTE.map((p) => (
              <button key={p} className={'swatch' + (r.color === p ? ' on' : '')} style={{ background: p }} onClick={() => setR({ ...r, color: p })} aria-label={'色 ' + p} />
            ))}
          </div>
        </div>
        {r.from === r.to && <p className="field-hint danger-text">別々の人物を選んでください。</p>}
      </div>
    </Modal>
  )
}
