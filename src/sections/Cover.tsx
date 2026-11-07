import { useEffect, useRef, useState, type ReactNode } from 'react'
import { defaultCover, downloadBlob, prepareImage, removeFile, safeName, saveFile, uid, type CoverSettings, type TextLayer } from '../db'
import { useWork } from '../workContext'
import { FileImage, Icon, Modal, fileURL, toast } from '../ui'
import { COVER_H, COVER_W, FONTS, PRESETS, ensureLayer, renderCover } from './coverRender'

type Target = 'bg' | 'title' | 'copy' | 'author'
type LayerKey = 'title' | 'copy' | 'author'

export default function Cover() {
  const { work, update } = useWork()
  const s: CoverSettings = { ...defaultCover(), ...work.cover }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [target, setTarget] = useState<Target>('title')
  const [picker, setPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const texts = {
    title: s.title.text ?? work.title,
    copy: s.copy.text ?? '',
    author: s.author.text ?? work.penName,
  }

  // 設定が変わるたびに描き直す（連続した変更はまとめる）
  const drawSeq = useRef(0)
  useEffect(() => {
    const seq = ++drawSeq.current
    const raf = requestAnimationFrame(async () => {
      const url = s.bgId ? await fileURL(s.bgId) : null
      if (seq !== drawSeq.current || !canvasRef.current) return
      await renderCover(canvasRef.current, s, texts, url)
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(s), texts.title, texts.copy, texts.author])

  const setS = (fn: (c: CoverSettings) => void) =>
    update((w) => {
      w.cover = { ...defaultCover(), ...w.cover }
      fn(w.cover)
    })
  const setL = (k: LayerKey, patch: Partial<TextLayer>) =>
    setS((c) => {
      c[k] = { ...ensureLayer(c[k]), ...patch }
    })

  /* ── キャンバス上のドラッグで位置を動かす ── */
  const drag = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY }
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - drag.current.x) / r.width
    const dy = (e.clientY - drag.current.y) / r.height
    drag.current = { x: e.clientX, y: e.clientY }
    setS((c) => {
      if (target === 'bg') {
        c.ox += dx
        c.oy += dy
      } else {
        const l = ensureLayer(c[target])
        c[target] = { ...l, x: l.x + dx, y: l.y + dy }
      }
    })
  }
  const onUp = () => {
    drag.current = null
  }

  const onBgFile = async (f: File | undefined) => {
    if (!f) return
    const blob = await prepareImage(f)
    const id = await saveFile(work.id, blob, f.name)
    // 参考画像にも入れておく（あとで別の表紙案にも使えるように）
    update((w) => {
      w.refs.push({ id: uid(), fileId: id, caption: '表紙用', tag: '表紙' })
      w.cover = { ...defaultCover(), ...w.cover, bgId: id, zoom: 1, ox: 0, oy: 0 }
    })
  }

  const saveAsCover = async () => {
    const c = canvasRef.current
    if (!c) return
    setSaving(true)
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.9))
    if (!blob) {
      setSaving(false)
      toast('表紙を書き出せませんでした')
      return
    }
    const id = await saveFile(work.id, blob, 'cover.jpg')
    const old = work.coverImageId
    update((w) => {
      w.coverImageId = id
    })
    await removeFile(old)
    setSaving(false)
    toast('表紙として保存しました。作品一覧に表示されます')
  }

  const downloadPng = () => {
    canvasRef.current?.toBlob((b) => b && downloadBlob(safeName(work.title) + '_表紙.png', b), 'image/png')
  }

  return (
    <section className="sec">
      <header className="sec-head">
        <h2 className="sec-title">
          <span className="en">Cover</span>
          <span className="ja">表紙</span>
        </h2>
      </header>

      <div className="cover-grid">
        <div className="cover-preview">
          <canvas
            ref={canvasRef}
            width={COVER_W}
            height={COVER_H}
            className={'cover-canvas drag-' + target}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-label="表紙のプレビュー"
          />
          <div className="seg small drag-target" role="group" aria-label="ドラッグで動かすもの">
            {(
              [
                ['bg', '写真'],
                ['title', 'タイトル'],
                ['copy', 'コピー'],
                ['author', '作者名'],
              ] as [Target, string][]
            ).map(([k, l]) => (
              <button key={k} className={'seg-btn' + (target === k ? ' on' : '')} onClick={() => setTarget(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn primary" onClick={saveAsCover} disabled={saving}>
              {saving ? '保存しています…' : '表紙として保存'}
            </button>
            <button className="btn ghost" onClick={downloadPng}>
              <Icon name="download" size={18} /> 画像を書き出す
            </button>
          </div>
          {work.coverImageId && (
            <p className="field-hint">
              いまの表紙：
              <FileImage id={work.coverImageId} className="cover-mini" alt="現在の表紙" />
            </p>
          )}
        </div>

        <div className="cover-controls">
          <Group title="テンプレート">
            <div className="presets">
              {Object.entries(PRESETS).map(([k, p]) => (
                <button key={k} className={'preset' + (s.preset === k ? ' on' : '')} onClick={() => setS((c) => Object.assign(c, p.apply(c)))}>
                  {p.name}
                </button>
              ))}
            </div>
          </Group>

          <Group title="写真">
            <div className="row">
              <button className="btn ghost small" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={16} /> 写真を選ぶ
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onBgFile(e.target.files?.[0])} />
              <button className="btn ghost small" onClick={() => setPicker(true)} disabled={work.refs.length === 0}>
                <Icon name="image" size={16} /> 参考画像から
              </button>
              {s.bgId && (
                <button className="btn ghost small" onClick={() => setS((c) => void (c.bgId = null))}>
                  外す
                </button>
              )}
            </div>
            {s.bgId && (
              <>
                <Range label="拡大" min={1} max={3} step={0.01} v={s.zoom} on={(v) => setS((c) => void (c.zoom = v))} fmt={(v) => `${v.toFixed(2)}倍`} />
                <Range label="明るさ" min={30} max={160} v={s.bri} on={(v) => setS((c) => void (c.bri = v))} fmt={(v) => `${v}%`} />
                <Range label="コントラスト" min={50} max={170} v={s.con} on={(v) => setS((c) => void (c.con = v))} fmt={(v) => `${v}%`} />
                <Range label="彩度" min={0} max={200} v={s.sat} on={(v) => setS((c) => void (c.sat = v))} fmt={(v) => `${v}%`} />
                <Range label="モノクロ" min={0} max={100} v={s.gray} on={(v) => setS((c) => void (c.gray = v))} fmt={(v) => `${v}%`} />
                <Range label="ぼかし" min={0} max={20} step={0.5} v={s.blur} on={(v) => setS((c) => void (c.blur = v))} fmt={(v) => `${v}px`} />
              </>
            )}
            {!s.bgId && (
              <label className="field inline">
                <span className="field-label">地の色</span>
                <input type="color" value={s.base} onChange={(e) => setS((c) => void (c.base = e.target.value))} />
              </label>
            )}
          </Group>

          <Group title="色と質感">
            <div className="row">
              <label className="field inline">
                <span className="field-label">色をかぶせる</span>
                <input type="color" value={s.tint} onChange={(e) => setS((c) => void (c.tint = e.target.value))} />
              </label>
            </div>
            <Range label="かぶせる濃さ" min={0} max={0.9} step={0.01} v={s.tintA} on={(v) => setS((c) => void (c.tintA = v))} fmt={(v) => `${Math.round(v * 100)}%`} />
            <div className="field">
              <span className="field-label">影のグラデーション</span>
              <div className="seg small">
                {(
                  [
                    ['none', 'なし'],
                    ['bottom', '下'],
                    ['top', '上'],
                    ['both', '上下'],
                  ] as [CoverSettings['grad'], string][]
                ).map(([k, l]) => (
                  <button key={k} className={'seg-btn' + (s.grad === k ? ' on' : '')} onClick={() => setS((c) => void (c.grad = k))}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {s.grad !== 'none' && <Range label="影の濃さ" min={0} max={1} step={0.01} v={s.gradA} on={(v) => setS((c) => void (c.gradA = v))} fmt={(v) => `${Math.round(v * 100)}%`} />}
            <Range label="周辺を暗く" min={0} max={0.8} step={0.01} v={s.vignette} on={(v) => setS((c) => void (c.vignette = v))} fmt={(v) => `${Math.round(v * 100)}%`} />
            <Range label="フィルムの粒子" min={0} max={0.4} step={0.01} v={s.grain} on={(v) => setS((c) => void (c.grain = v))} fmt={(v) => `${Math.round(v * 100)}%`} />
            <div className="field">
              <span className="field-label">枠線</span>
              <div className="seg small">
                {(
                  [
                    ['none', 'なし'],
                    ['line', '細線'],
                    ['double', '二重'],
                  ] as [CoverSettings['frame'], string][]
                ).map(([k, l]) => (
                  <button key={k} className={'seg-btn' + (s.frame === k ? ' on' : '')} onClick={() => setS((c) => void (c.frame = k))}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </Group>

          <LayerControls title="タイトル" k="title" l={ensureLayer(s.title)} text={texts.title} auto="作品のタイトル" setL={setL} multiline />
          <LayerControls title="キャッチコピー" k="copy" l={ensureLayer(s.copy)} text={texts.copy} auto="" setL={setL} multiline />
          <LayerControls title="作者名" k="author" l={ensureLayer(s.author)} text={texts.author} auto="ペンネーム" setL={setL} />
        </div>
      </div>

      {picker && (
        <Modal title="参考画像から選ぶ" onClose={() => setPicker(false)} wide>
          <ul className="refs pick">
            {work.refs.map((r) => (
              <li key={r.id}>
                <button
                  className="ref-img"
                  onClick={() => {
                    setS((c) => {
                      c.bgId = r.fileId
                      c.zoom = 1
                      c.ox = 0
                      c.oy = 0
                    })
                    setPicker(false)
                  }}
                >
                  <FileImage id={r.fileId} alt={r.caption} />
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </section>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="cgroup" open>
      <summary>{title}</summary>
      <div className="cgroup-body">{children}</div>
    </details>
  )
}

function Range({ label, min, max, step = 1, v, on, fmt }: { label: string; min: number; max: number; step?: number; v: number; on: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <label className="range">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(+e.target.value)} />
      <output>{fmt(v)}</output>
    </label>
  )
}

function LayerControls({
  title,
  k,
  l,
  text,
  auto,
  setL,
  multiline,
}: {
  title: string
  k: LayerKey
  l: TextLayer
  text: string
  auto: string
  setL: (k: LayerKey, p: Partial<TextLayer>) => void
  multiline?: boolean
}) {
  return (
    <Group title={title}>
      <label className="field">
        <span className="field-label">
          文字
          {auto && l.text === null && <small>（{auto}が自動で入ります）</small>}
        </span>
        {multiline ? (
          <textarea rows={2} value={text} placeholder="改行で行を分けられます" onChange={(e) => setL(k, { text: e.target.value })} />
        ) : (
          <input value={text} onChange={(e) => setL(k, { text: e.target.value })} />
        )}
      </label>
      <div className="row">
        <label className="field grow">
          <span className="field-label">書体</span>
          <select value={l.font} onChange={(e) => setL(k, { font: e.target.value })}>
            {FONTS.map((f) => (
              <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field inline">
          <span className="field-label">色</span>
          <input type="color" value={l.color} onChange={(e) => setL(k, { color: e.target.value })} />
        </label>
      </div>
      <Range label="大きさ" min={16} max={260} v={l.size} on={(v) => setL(k, { size: v })} fmt={(v) => `${v}`} />
      <Range label="字間" min={-10} max={60} v={l.spacing} on={(v) => setL(k, { spacing: v })} fmt={(v) => `${v}`} />
      <Range label="太さ" min={400} max={800} step={100} v={l.weight} on={(v) => setL(k, { weight: v })} fmt={(v) => `${v}`} />
      <div className="row">
        <label className="check">
          <input type="checkbox" checked={l.vertical} onChange={(e) => setL(k, { vertical: e.target.checked })} /> 縦書き
        </label>
        <label className="check">
          <input type="checkbox" checked={l.shadow} onChange={(e) => setL(k, { shadow: e.target.checked })} /> 影をつける
        </label>
        <button className="btn ghost small" onClick={() => setL(k, { x: 0.5 })}>
          左右中央に
        </button>
      </div>
    </Group>
  )
}
