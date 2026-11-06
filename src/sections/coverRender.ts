import { loadImage, textLayer, type CoverSettings, type TextLayer } from '../db'

export const COVER_W = 1000
export const COVER_H = 1500

export const FONTS = [
  { family: 'Shippori Mincho', label: 'しっぽり明朝', weights: [400, 600, 800] },
  { family: 'Zen Old Mincho', label: 'Zen旧明朝', weights: [400, 700] },
  { family: 'Noto Serif JP', label: 'Noto 明朝', weights: [400, 700] },
  { family: 'Zen Kaku Gothic New', label: 'Zen角ゴシック', weights: [400, 500, 700] },
  { family: 'Dela Gothic One', label: 'デラゴシック（極太）', weights: [400] },
  { family: 'Yuji Syuku', label: '佑字 肅（筆）', weights: [400] },
  { family: 'Kaisei Decol', label: '解星デコール', weights: [400, 700] },
  { family: 'Klee One', label: 'クレー（手書き風）', weights: [400, 600] },
  { family: 'DotGothic16', label: 'ドットゴシック', weights: [400] },
]

const fallback = (family: string) => (/Gothic|Dot/.test(family) ? 'sans-serif' : 'serif')
const nearestWeight = (family: string, w: number) => {
  const ws = FONTS.find((f) => f.family === family)?.weights ?? [400]
  return ws.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a))
}

/* ── テンプレート ── */
export const PRESETS: Record<string, { name: string; apply: (s: CoverSettings) => CoverSettings }> = {
  cinema: {
    name: '映画ポスター',
    apply: (s) => ({
      ...s,
      preset: 'cinema',
      tint: '#0E1620',
      tintA: 0.15,
      grad: 'bottom',
      gradA: 0.8,
      vignette: 0.35,
      grain: 0.12,
      frame: 'none',
      gray: 0,
      title: { ...s.title, font: 'Zen Kaku Gothic New', weight: 700, size: 130, color: '#FFFFFF', x: 0.5, y: 0.78, vertical: false, spacing: 4, shadow: true },
      copy: { ...s.copy, font: 'Zen Kaku Gothic New', weight: 400, size: 36, color: '#F2F2F2', x: 0.5, y: 0.1, vertical: false, spacing: 6, shadow: true },
      author: { ...s.author, font: 'Zen Kaku Gothic New', weight: 400, size: 32, color: '#E6E6E6', x: 0.5, y: 0.92, vertical: false, spacing: 10, shadow: false },
    }),
  },
  bungei: {
    name: '文芸・縦組み',
    apply: (s) => ({
      ...s,
      preset: 'bungei',
      tint: '#F3F1EA',
      tintA: 0.35,
      grad: 'none',
      gradA: 0.5,
      vignette: 0.1,
      grain: 0.1,
      frame: 'line',
      gray: 0,
      title: { ...s.title, font: 'Shippori Mincho', weight: 800, size: 110, color: '#1D2320', x: 0.78, y: 0.42, vertical: true, spacing: 12, shadow: false },
      copy: { ...s.copy, font: 'Shippori Mincho', weight: 400, size: 32, color: '#1D2320', x: 0.62, y: 0.32, vertical: true, spacing: 8, shadow: false },
      author: { ...s.author, font: 'Shippori Mincho', weight: 600, size: 38, color: '#1D2320', x: 0.2, y: 0.8, vertical: true, spacing: 10, shadow: false },
    }),
  },
  minimal: {
    name: 'ミニマル',
    apply: (s) => ({
      ...s,
      preset: 'minimal',
      tint: '#000000',
      tintA: 0,
      grad: 'top',
      gradA: 0.45,
      vignette: 0,
      grain: 0.05,
      frame: 'none',
      title: { ...s.title, font: 'Zen Old Mincho', weight: 700, size: 92, color: '#FFFFFF', x: 0.5, y: 0.16, vertical: false, spacing: 2, shadow: false },
      copy: { ...s.copy, font: 'Zen Old Mincho', weight: 400, size: 30, color: '#FFFFFF', x: 0.5, y: 0.25, vertical: false, spacing: 4, shadow: false },
      author: { ...s.author, font: 'Zen Old Mincho', weight: 400, size: 30, color: '#FFFFFF', x: 0.5, y: 0.94, vertical: false, spacing: 8, shadow: false },
    }),
  },
  wa: {
    name: '和・筆',
    apply: (s) => ({
      ...s,
      preset: 'wa',
      tint: '#2A1A12',
      tintA: 0.3,
      grad: 'both',
      gradA: 0.55,
      vignette: 0.45,
      grain: 0.18,
      frame: 'double',
      gray: 20,
      title: { ...s.title, font: 'Yuji Syuku', weight: 400, size: 150, color: '#F4EEE2', x: 0.5, y: 0.45, vertical: true, spacing: 16, shadow: true },
      copy: { ...s.copy, font: 'Shippori Mincho', weight: 400, size: 30, color: '#E9DFCC', x: 0.24, y: 0.4, vertical: true, spacing: 8, shadow: true },
      author: { ...s.author, font: 'Shippori Mincho', weight: 600, size: 34, color: '#E9DFCC', x: 0.5, y: 0.9, vertical: false, spacing: 12, shadow: true },
    }),
  },
  pop: {
    name: 'ポップ',
    apply: (s) => ({
      ...s,
      preset: 'pop',
      tint: '#FF5A3C',
      tintA: 0.18,
      grad: 'none',
      gradA: 0.5,
      vignette: 0,
      grain: 0,
      frame: 'none',
      gray: 0,
      title: { ...s.title, font: 'Dela Gothic One', weight: 400, size: 140, color: '#FFFFFF', x: 0.5, y: 0.5, vertical: false, spacing: 0, shadow: true },
      copy: { ...s.copy, font: 'Zen Kaku Gothic New', weight: 700, size: 40, color: '#FFFFFF', x: 0.5, y: 0.36, vertical: false, spacing: 4, shadow: true },
      author: { ...s.author, font: 'Zen Kaku Gothic New', weight: 700, size: 34, color: '#FFFFFF', x: 0.5, y: 0.92, vertical: false, spacing: 6, shadow: true },
    }),
  },
}

export const ensureLayer = (l: Partial<TextLayer> | undefined) => textLayer(l ?? {})

/* ── 描画 ── */

let grainCanvas: HTMLCanvasElement | null = null
function grain() {
  if (grainCanvas) return grainCanvas
  const c = document.createElement('canvas')
  c.width = c.height = 220
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(220, 220)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  grainCanvas = c
  return c
}

const ROTATE = new Set([...'ー－−—―…‥〜～-「」『』（）()〈〉《》【】［］[]＝=：:'])
const PUNCT = new Set([...'、。，．,.'])
const SMALL = new Set([...'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'])

async function ensureFont(l: TextLayer, text: string) {
  try {
    await document.fonts.load(`${nearestWeight(l.font, l.weight)} ${l.size}px "${l.font}"`, text || 'あ')
  } catch {
    /* 読めなければ代替書体で描く */
  }
}

function drawText(ctx: CanvasRenderingContext2D, text: string, l: TextLayer) {
  if (!text) return
  const size = l.size
  ctx.save()
  ctx.font = `${nearestWeight(l.font, l.weight)} ${size}px "${l.font}", ${fallback(l.font)}`
  ctx.fillStyle = l.color
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  if (l.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = size * 0.18
    ctx.shadowOffsetY = size * 0.03
  }
  const cx = l.x * COVER_W
  const cy = l.y * COVER_H
  const lines = text.split('\n')

  if (!l.vertical) {
    const lh = size * 1.3
    lines.forEach((line, li) => {
      const chars = [...line]
      const widths = chars.map((c) => ctx.measureText(c).width)
      const total = widths.reduce((a, b) => a + b, 0) + l.spacing * Math.max(0, chars.length - 1)
      let x = cx - total / 2
      const y = cy + (li - (lines.length - 1) / 2) * lh
      chars.forEach((c, i) => {
        ctx.fillText(c, x + widths[i] / 2, y)
        x += widths[i] + l.spacing
      })
    })
  } else {
    const colW = size * 1.35
    const step = size + l.spacing
    lines.forEach((line, li) => {
      const chars = [...line]
      const x = cx + ((lines.length - 1) / 2 - li) * colW
      const h = chars.length * step - l.spacing
      let y = cy - h / 2 + size / 2
      for (const c of chars) {
        if (ROTATE.has(c)) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(Math.PI / 2)
          ctx.fillText(c, 0, 0)
          ctx.restore()
        } else if (PUNCT.has(c)) {
          ctx.fillText(c, x + size * 0.55, y - size * 0.55)
        } else if (SMALL.has(c)) {
          ctx.fillText(c, x + size * 0.1, y - size * 0.1)
        } else {
          ctx.fillText(c, x, y)
        }
        y += step
      }
    })
  }
  ctx.restore()
}

export interface CoverTexts {
  title: string
  copy: string
  author: string
}

export async function renderCover(canvas: HTMLCanvasElement, s: CoverSettings, texts: CoverTexts, bgUrl: string | null) {
  const ctx = canvas.getContext('2d')!
  canvas.width = COVER_W
  canvas.height = COVER_H
  const layers: [TextLayer, string][] = [
    [ensureLayer(s.title), texts.title],
    [ensureLayer(s.copy), texts.copy],
    [ensureLayer(s.author), texts.author],
  ]
  await Promise.all(layers.map(([l, t]) => ensureFont(l, t)))
  const img = bgUrl ? await loadImage(bgUrl).catch(() => null) : null

  ctx.clearRect(0, 0, COVER_W, COVER_H)
  ctx.fillStyle = s.base
  ctx.fillRect(0, 0, COVER_W, COVER_H)

  if (img) {
    const scale = Math.max(COVER_W / img.naturalWidth, COVER_H / img.naturalHeight) * s.zoom
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const dx = (COVER_W - dw) / 2 + s.ox * COVER_W
    const dy = (COVER_H - dh) / 2 + s.oy * COVER_H
    ctx.filter = `brightness(${s.bri}%) contrast(${s.con}%) saturate(${s.sat}%) grayscale(${s.gray}%) blur(${s.blur}px)`
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.filter = 'none'
  } else {
    // 写真がないときは静かなグラデーションの地にする
    const g = ctx.createLinearGradient(0, 0, 0, COVER_H)
    g.addColorStop(0, s.base)
    g.addColorStop(1, '#0B0F14')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, COVER_W, COVER_H)
  }

  if (s.tintA > 0) {
    ctx.globalAlpha = s.tintA
    ctx.fillStyle = s.tint
    ctx.fillRect(0, 0, COVER_W, COVER_H)
    ctx.globalAlpha = 1
  }

  const shade = (y0: number, y1: number) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1)
    g.addColorStop(0, `rgba(0,0,0,${s.gradA})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, Math.min(y0, y1), COVER_W, Math.abs(y1 - y0))
  }
  if (s.grad === 'bottom' || s.grad === 'both') shade(COVER_H, COVER_H * 0.4)
  if (s.grad === 'top' || s.grad === 'both') shade(0, COVER_H * 0.45)

  if (s.vignette > 0) {
    const g = ctx.createRadialGradient(COVER_W / 2, COVER_H / 2, COVER_H * 0.25, COVER_W / 2, COVER_H / 2, COVER_H * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${s.vignette})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, COVER_W, COVER_H)
  }

  if (s.grain > 0) {
    ctx.save()
    ctx.globalAlpha = s.grain
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = ctx.createPattern(grain(), 'repeat')!
    ctx.fillRect(0, 0, COVER_W, COVER_H)
    ctx.restore()
  }

  if (s.frame !== 'none') {
    ctx.strokeStyle = ensureLayer(s.title).color
    ctx.lineWidth = 2
    ctx.strokeRect(44, 44, COVER_W - 88, COVER_H - 88)
    if (s.frame === 'double') {
      ctx.lineWidth = 1
      ctx.strokeRect(58, 58, COVER_W - 116, COVER_H - 116)
    }
  }

  for (const [l, t] of layers) drawText(ctx, t, l)
}
