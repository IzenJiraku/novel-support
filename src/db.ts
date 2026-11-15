import Dexie, { type EntityTable } from 'dexie'

/* ───────── 型 ───────── */

export type WorkStatus = '構想中' | '執筆中' | '推敲中' | '完成' | '休止中'
export const STATUSES: WorkStatus[] = ['構想中', '執筆中', '推敲中', '完成', '休止中']

export interface Beat {
  id: string
  label: string
  text: string
}

export interface HistoryRow {
  id: string
  year: string
  month: string
  text: string
}

export interface Character {
  id: string
  name: string
  kana: string
  role: string
  color: string
  photoId: string | null
  x: number
  y: number
  birthday: string
  age: string
  gender: string
  height: string
  origin: string
  occupation: string
  appearance: string
  personality: string
  speech: string
  likes: string
  dislikes: string
  skills: string
  history: HistoryRow[]
  motive: string
  secret: string
  memo: string
}

export type RelationDir = 'one' | 'both' | 'none'
export interface Relation {
  id: string
  from: string
  to: string
  label: string
  dir: RelationDir
  color: string
}

export interface RefImage {
  id: string
  fileId: string
  caption: string
  tag: string
}

export interface Track {
  id: string
  title: string
  artist: string
  url: string
  fileId: string | null
  scene: string
  /** この曲を結びつけた人物・章・構成の段階 */
  characterIds?: string[]
  chapterIds?: string[]
  beatIds?: string[]
}

/** 古いデータでも動くよう、紐付けの配列を必ず埋めて返す */
export const trackLinks = (t: Track) => ({
  characterIds: t.characterIds ?? [],
  chapterIds: t.chapterIds ?? [],
  beatIds: t.beatIds ?? [],
})

export interface CoverSettings {
  preset: string
  bgId: string | null
  zoom: number
  ox: number
  oy: number
  bri: number
  con: number
  sat: number
  gray: number
  blur: number
  base: string
  tint: string
  tintA: number
  grad: 'none' | 'bottom' | 'top' | 'both'
  gradA: number
  vignette: number
  grain: number
  frame: 'none' | 'line' | 'double'
  title: TextLayer
  copy: TextLayer
  author: TextLayer
}

export interface TextLayer {
  text: string | null // null のときは作品情報から自動で入れる
  font: string
  size: number
  color: string
  x: number
  y: number
  vertical: boolean
  spacing: number
  shadow: boolean
  weight: number
}

export interface Work {
  id: string
  title: string
  subtitle: string
  penName: string
  genre: string
  status: WorkStatus
  logline: string
  synopsis: string
  theme: string
  memo: string
  structure: { template: string; beats: Beat[] }
  characters: Character[]
  relations: Relation[]
  refs: RefImage[]
  music: Track[]
  cover: CoverSettings
  coverImageId: string | null
  charCount: number
  createdAt: number
  updatedAt: number
}

export interface Chapter {
  id: string
  workId: string
  title: string
  order: number
  body: string
  memo: string
  updatedAt: number
}

export interface StoredFile {
  id: string
  workId: string
  blob: Blob
  type: string
  name: string
  createdAt: number
}

/** アイデアの断片。作品に属さず、あとで掛け合わせるために貯めておく */
export interface Piece {
  id: string
  text: string
  kind: string
  createdAt: number
}

/** 断片を掛け合わせて生まれたひらめき */
export interface Spark {
  id: string
  pieceIds: string[]
  /** 掛け合わせた時点の断片の文面（元の断片を消しても残るように） */
  texts: string[]
  note: string
  workId: string | null
  createdAt: number
}

/** 章の過去の版。書いている途中で自動的に残し、あとから戻せるようにする */
export interface Snapshot {
  id: string
  chapterId: string
  workId: string
  title: string
  body: string
  createdAt: number
}

export const PIECE_KINDS = ['人物', '場所', '出来事', 'もの', 'ことば', 'テーマ'] as const

/* ───────── DB ───────── */

export const db = new Dexie('monogatari-shosai') as Dexie & {
  works: EntityTable<Work, 'id'>
  chapters: EntityTable<Chapter, 'id'>
  files: EntityTable<StoredFile, 'id'>
  pieces: EntityTable<Piece, 'id'>
  sparks: EntityTable<Spark, 'id'>
  snapshots: EntityTable<Snapshot, 'id'>
}

db.version(1).stores({
  works: 'id, updatedAt',
  chapters: 'id, workId, [workId+order], updatedAt',
  files: 'id, workId',
})

db.version(2).stores({
  pieces: 'id, createdAt, kind',
  sparks: 'id, createdAt',
})

db.version(3).stores({
  snapshots: 'id, chapterId, workId, createdAt',
})

/* ───────── ユーティリティ ───────── */

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5)

/** 空白・改行を除いた文字数 */
export const countChars = (s: string) => (s || '').replace(/\s/g, '').length

/** 400字詰め原稿用紙換算（1行20字・改行ごとに行が変わる） */
export function manuscriptSheets(s: string) {
  if (!s) return 0
  let lines = 0
  for (const p of s.split('\n')) lines += Math.max(1, Math.ceil(p.length / 20))
  return Math.ceil(lines / 20)
}

export const PALETTE = ['#3D4A5C', '#7A4E4E', '#4E6352', '#7A6A4E', '#5E5470', '#4C6A6C', '#7A5E6E', '#505050']

export const TEMPLATES: Record<string, { name: string; beats: string[] }> = {
  kishoutenketsu: { name: '起承転結', beats: ['起', '承', '転', '結'] },
  sanmaku: {
    name: '三幕構成',
    beats: ['第一幕　設定', 'きっかけ（プロットポイント1）', '第二幕　対立', 'ミッドポイント', 'どん底（プロットポイント2）', '第三幕　解決'],
  },
  johakyu: { name: '序破急', beats: ['序', '破', '急'] },
  free: { name: '自由', beats: [] },
}

export const textLayer = (p: Partial<TextLayer>): TextLayer => ({
  text: null,
  font: 'Shippori Mincho',
  size: 120,
  color: '#FFFFFF',
  x: 0.5,
  y: 0.5,
  vertical: false,
  spacing: 0,
  shadow: true,
  weight: 800,
  ...p,
})

export function defaultCover(): CoverSettings {
  return {
    preset: 'cinema',
    bgId: null,
    zoom: 1,
    ox: 0,
    oy: 0,
    bri: 100,
    con: 100,
    sat: 100,
    gray: 0,
    blur: 0,
    base: '#1F2A36',
    tint: '#0E1620',
    tintA: 0.15,
    grad: 'bottom',
    gradA: 0.75,
    vignette: 0.35,
    grain: 0.12,
    frame: 'none',
    title: textLayer({ y: 0.78, size: 130 }),
    copy: textLayer({ y: 0.12, size: 38, weight: 400, font: 'Zen Kaku Gothic New', spacing: 6 }),
    author: textLayer({ y: 0.92, size: 34, weight: 400, font: 'Zen Kaku Gothic New', spacing: 8, shadow: false }),
  }
}

export function newCharacter(i = 0, p: Partial<Character> = {}): Character {
  const a = (i * 2.4) % (Math.PI * 2)
  return {
    id: uid(),
    name: '',
    kana: '',
    role: '',
    color: PALETTE[i % PALETTE.length],
    photoId: null,
    x: 600 + Math.cos(a) * (180 + i * 12),
    y: 400 + Math.sin(a) * (140 + i * 10),
    birthday: '',
    age: '',
    gender: '',
    height: '',
    origin: '',
    occupation: '',
    appearance: '',
    personality: '',
    speech: '',
    likes: '',
    dislikes: '',
    skills: '',
    history: [],
    motive: '',
    secret: '',
    memo: '',
    ...p,
  }
}

export function newWork(p: Partial<Work> = {}): Work {
  const now = Date.now()
  return {
    id: uid(),
    title: '無題の物語',
    subtitle: '',
    penName: '',
    genre: '',
    status: '構想中',
    logline: '',
    synopsis: '',
    theme: '',
    memo: '',
    structure: {
      template: 'kishoutenketsu',
      beats: TEMPLATES.kishoutenketsu.beats.map((label) => ({ id: uid(), label, text: '' })),
    },
    characters: [],
    relations: [],
    refs: [],
    music: [],
    cover: defaultCover(),
    coverImageId: null,
    charCount: 0,
    createdAt: now,
    updatedAt: now,
    ...p,
  }
}

export async function createWork(p: Partial<Work> = {}) {
  const w = newWork(p)
  await db.transaction('rw', db.works, db.chapters, async () => {
    await db.works.add(w)
    await db.chapters.add({ id: uid(), workId: w.id, title: '第一章', order: 1, body: '', memo: '', updatedAt: Date.now() })
  })
  return w.id
}

/** 作品を消す。戻り値を restoreWork に渡すと元に戻せる */
export async function deleteWork(id: string) {
  return db.transaction('rw', db.works, db.chapters, db.files, db.snapshots, async () => {
    const kept = {
      work: await db.works.get(id),
      chapters: await db.chapters.where('workId').equals(id).toArray(),
      files: await db.files.where('workId').equals(id).toArray(),
      snapshots: await db.snapshots.where('workId').equals(id).toArray(),
    }
    await db.chapters.where('workId').equals(id).delete()
    await db.files.where('workId').equals(id).delete()
    await db.snapshots.where('workId').equals(id).delete()
    await db.works.delete(id)
    return kept
  })
}

export async function restoreWork(kept: Awaited<ReturnType<typeof deleteWork>>) {
  if (!kept.work) return
  await db.transaction('rw', db.works, db.chapters, db.files, db.snapshots, async () => {
    await db.works.put(kept.work!)
    await db.chapters.bulkPut(kept.chapters)
    await db.files.bulkPut(kept.files)
    await db.snapshots.bulkPut(kept.snapshots)
  })
}

/* ───────── 章の履歴 ───────── */

const SNAP_KEEP = 40
export const SNAP_INTERVAL = 10 * 60 * 1000

export const listSnapshots = async (chapterId: string) =>
  (await db.snapshots.where('chapterId').equals(chapterId).sortBy('createdAt')).reverse()

/** いまの内容を履歴に残す。直前の版と同じ本文なら残さない。古い版は SNAP_KEEP 件を超えた分から消す */
export async function takeSnapshot(c: Pick<Chapter, 'id' | 'workId' | 'title' | 'body'>) {
  if (!c.body.trim()) return false
  const list = await listSnapshots(c.id)
  if (list[0]?.body === c.body) return false
  await db.snapshots.add({ id: uid(), chapterId: c.id, workId: c.workId, title: c.title, body: c.body, createdAt: Date.now() })
  const extra = list.slice(SNAP_KEEP - 1)
  if (extra.length) await db.snapshots.bulkDelete(extra.map((x) => x.id))
  return true
}

/** 作品の本文の合計文字数（保存は呼び出し側の update で行う） */
export async function recountWork(workId: string) {
  const chs = await db.chapters.where('workId').equals(workId).toArray()
  return chs.reduce((n, c) => n + countChars(c.body), 0)
}

/* ───────── ファイル（画像・音声） ───────── */

/** 大きな写真は縮小して保存容量を節約する */
export async function prepareImage(file: Blob, maxDim = 2400): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
    if (scale === 1 && file.size < 3_500_000) return file
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * scale)
    c.height = Math.round(img.naturalHeight * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.88))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })
}

export async function saveFile(workId: string, blob: Blob, name = '') {
  const id = uid()
  await db.files.add({ id, workId, blob, type: blob.type, name, createdAt: Date.now() })
  return id
}

export async function removeFile(id: string | null | undefined) {
  if (id) await db.files.delete(id)
}

/* ───────── 書き出し・読み込み ───────── */

const blobToDataURL = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.readAsDataURL(b)
  })

interface PackedFile {
  id: string
  name: string
  type: string
  data: string
}
interface PackedWork {
  work: Work
  chapters: Chapter[]
  files: PackedFile[]
}

async function packWork(workId: string): Promise<PackedWork | null> {
  const work = await db.works.get(workId)
  if (!work) return null
  const chapters = await db.chapters.where('workId').equals(workId).sortBy('order')
  const files = await db.files.where('workId').equals(workId).toArray()
  const fileData = await Promise.all(
    files.map(async (f) => ({ id: f.id, name: f.name, type: f.type, data: await blobToDataURL(f.blob) })),
  )
  return { work, chapters, files: fileData }
}

/** 作品ひとつのバックアップ。断片とひらめきは作品をまたぐものなので、どのバックアップにも全部入れておく */
export async function exportWorkJSON(workId: string) {
  const packed = await packWork(workId)
  const pieces = await db.pieces.toArray()
  const sparks = await db.sparks.toArray()
  return JSON.stringify({ format: 'monogatari-shosai', version: 1, ...packed, pieces, sparks })
}

/** 書斎まるごとのバックアップ。別の端末で読み込むと、作品ごとに新しいほうが残る */
export async function exportLibraryJSON() {
  const ids = await db.works.toCollection().primaryKeys()
  const works = (await Promise.all(ids.map((id) => packWork(id)))).filter((w): w is PackedWork => !!w)
  const pieces = await db.pieces.toArray()
  const sparks = await db.sparks.toArray()
  return JSON.stringify({ format: 'monogatari-shosai', version: 2, kind: 'library', exportedAt: Date.now(), works, pieces, sparks })
}

// 画像や音声は、DBの処理を始める前に元の形へ戻しておく（処理の途中で待つとDBの処理が打ち切られるため）
const unpackFiles = (files: PackedFile[]) =>
  Promise.all((files || []).map(async (f) => ({ ...f, blob: await (await fetch(f.data)).blob() })))

async function mergePieces(data: { pieces?: Piece[]; sparks?: Spark[] }, mapWorkId: (id: string | null) => Promise<string | null>) {
  // 断片・ひらめきは同じものがすでにあれば残し、無いものだけ足す
  for (const p of data.pieces ?? []) if (!(await db.pieces.get(p.id))) await db.pieces.add(p)
  for (const sp of data.sparks ?? []) {
    if (await db.sparks.get(sp.id)) continue
    await db.sparks.add({ ...sp, workId: await mapWorkId(sp.workId) })
  }
}

const ALL_TABLES = () => [db.works, db.chapters, db.files, db.pieces, db.sparks, db.snapshots]

export interface ImportResult {
  /** 読み込んだあとに開く作品（ひとつだけ読み込んだとき） */
  openId: string | null
  added: number
  updated: number
  kept: number
}

export async function importBackupJSON(text: string): Promise<ImportResult> {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Solo Study のバックアップファイルではありません')
  }
  if (data?.format !== 'monogatari-shosai') throw new Error('Solo Study のバックアップファイルではありません')
  if (data.kind === 'library' && Array.isArray(data.works)) return importLibrary(data)
  if (!data.work) throw new Error('Solo Study のバックアップファイルではありません')
  return { openId: await importSingle(data), added: 1, updated: 0, kept: 0 }
}

/** 作品ひとつのバックアップは、いまある作品を上書きしないよう、いつも新しい作品として足す */
async function importSingle(data: PackedWork & { pieces?: Piece[]; sparks?: Spark[] }) {
  const newId = uid()
  const idMap = new Map<string, string>()
  for (const f of data.files || []) idMap.set(f.id, uid())
  const remap = (id: string | null) => (id && idMap.get(id)) || id
  const w: Work = { ...newWork(), ...data.work, id: newId, updatedAt: Date.now() }
  w.coverImageId = remap(w.coverImageId)
  w.cover = { ...defaultCover(), ...w.cover, bgId: remap(w.cover?.bgId ?? null) }
  w.characters = w.characters.map((c) => ({ ...c, photoId: remap(c.photoId) }))
  w.refs = w.refs.map((r) => ({ ...r, fileId: remap(r.fileId)! }))
  const chMap = new Map<string, string>()
  for (const c of data.chapters || []) chMap.set(c.id, uid())
  w.music = w.music.map((m) => ({ ...m, fileId: remap(m.fileId), chapterIds: (m.chapterIds ?? []).map((id) => chMap.get(id) ?? id) }))
  const files = await unpackFiles(data.files)
  await db.transaction('rw', ALL_TABLES(), async () => {
    await db.works.add(w)
    await mergePieces(data, async (id) => (id === data.work.id ? newId : id && (await db.works.get(id)) ? id : null))
    for (const c of data.chapters || []) await db.chapters.add({ ...c, id: chMap.get(c.id)!, workId: newId })
    for (const f of files) await db.files.add({ id: idMap.get(f.id)!, workId: newId, blob: f.blob, type: f.type, name: f.name, createdAt: Date.now() })
  })
  return newId
}

/** 書斎まるごとの読み込み。同じ作品があれば、更新が新しいほうを残す */
async function importLibrary(data: { works: PackedWork[]; pieces?: Piece[]; sparks?: Spark[] }): Promise<ImportResult> {
  const res: ImportResult = { openId: null, added: 0, updated: 0, kept: 0 }
  const works = data.works.filter((p) => p?.work?.id)
  const unpacked = await Promise.all(works.map(async (p) => ({ ...p, blobs: await unpackFiles(p.files) })))
  await db.transaction('rw', ALL_TABLES(), async () => {
    for (const p of unpacked) {
      const w: Work = { ...newWork(), ...p.work }
      w.cover = { ...defaultCover(), ...w.cover }
      const cur = await db.works.get(w.id)
      if (cur && cur.updatedAt >= w.updatedAt) {
        res.kept++
        continue
      }
      if (cur) {
        // 置き換える前に、いまの本文を履歴へ残しておく
        for (const c of await db.chapters.where('workId').equals(w.id).toArray()) {
          if (c.body.trim()) await db.snapshots.add({ id: uid(), chapterId: c.id, workId: w.id, title: c.title, body: c.body, createdAt: Date.now() })
        }
        await db.chapters.where('workId').equals(w.id).delete()
        await db.files.where('workId').equals(w.id).delete()
        res.updated++
      } else res.added++
      await db.works.put(w)
      await db.chapters.bulkPut((p.chapters || []).map((c) => ({ ...c, workId: w.id })))
      await db.files.bulkPut(p.blobs.map((f) => ({ id: f.id, workId: w.id, blob: f.blob, type: f.type, name: f.name, createdAt: Date.now() })))
    }
    await mergePieces(data, async (id) => (id && (await db.works.get(id)) ? id : null))
  })
  return res
}

export async function exportWorkText(workId: string) {
  const work = await db.works.get(workId)
  const chapters = await db.chapters.where('workId').equals(workId).sortBy('order')
  const head = [work?.title, work?.subtitle, work?.penName].filter(Boolean).join('\n')
  return head + '\n\n' + chapters.map((c) => `■ ${c.title}\n\n${c.body}`).join('\n\n\n') + '\n'
}

export function downloadBlob(name: string, data: Blob | string, type = 'text/plain') {
  const blob = typeof data === 'string' ? new Blob([data], { type: type + ';charset=utf-8' }) : data
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

export const safeName = (s: string) => (s || '無題').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)
