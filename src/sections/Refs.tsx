import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prepareImage, removeFile, saveFile, uid } from '../db'
import { useWork } from '../workContext'
import { FileImage, Modal, confirmDialog, toast } from '../ui'

export default function Refs() {
  const { work, update } = useWork()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [view, setView] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tags = [...new Set(work.refs.map((r) => r.tag.trim()).filter(Boolean))]
  const list = tag ? work.refs.filter((r) => r.tag.trim() === tag) : work.refs

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const added: { id: string; fileId: string; caption: string; tag: string }[] = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue
      const blob = await prepareImage(f)
      const fileId = await saveFile(work.id, blob, f.name)
      added.push({ id: uid(), fileId, caption: '', tag: tag ?? '' })
    }
    update((w) => {
      w.refs.push(...added)
    })
    setBusy(false)
    toast(`${added.length} 枚の画像を追加しました`)
  }

  const setField = (id: string, k: 'caption' | 'tag', v: string) =>
    update((w) => {
      const r = w.refs.find((r) => r.id === id)
      if (r) r[k] = v
    })

  const remove = async (id: string) => {
    const r = work.refs.find((r) => r.id === id)
    if (!r || !(await confirmDialog('この参考画像を削除します。'))) return
    update((w) => {
      w.refs = w.refs.filter((x) => x.id !== id)
      if (w.cover.bgId === r.fileId) w.cover.bgId = null
    })
    if (work.cover.bgId !== r.fileId) await removeFile(r.fileId)
    setView(null)
  }

  const setAsCover = (fileId: string) => {
    update((w) => {
      w.cover.bgId = fileId
      w.cover.zoom = 1
      w.cover.ox = 0
      w.cover.oy = 0
    })
    nav('../cover')
  }

  const viewing = work.refs.find((r) => r.id === view)

  return (
    <section
      className="sec"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        void onFiles(e.dataTransfer.files)
      }}
    >
      <header className="sec-head">
        <h2>参考画像</h2>
      </header>

      <div className="refs-bar">
        <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? '追加しています…' : '画像を追加'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        {tags.length > 0 && (
          <div className="seg" role="group" aria-label="タグで絞り込む">
            <button className={'seg-btn' + (tag === null ? ' on' : '')} onClick={() => setTag(null)}>
              すべて
            </button>
            {tags.map((t) => (
              <button key={t} className={'seg-btn' + (tag === t ? ' on' : '')} onClick={() => setTag(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {work.refs.length > 0 && (
        <ul className="refs">
          {list.map((r) => (
            <li key={r.id} className="ref">
              <button className="ref-img" onClick={() => setView(r.id)} aria-label="大きく見る">
                <FileImage id={r.fileId} alt={r.caption} />
              </button>
              <input className="ref-cap" value={r.caption} placeholder="メモ" aria-label="メモ" onChange={(e) => setField(r.id, 'caption', e.target.value)} />
              <input className="ref-tag" value={r.tag} placeholder="タグ" aria-label="タグ" onChange={(e) => setField(r.id, 'tag', e.target.value)} />
            </li>
          ))}
        </ul>
      )}

      {viewing && (
        <Modal
          title={viewing.caption || '参考画像'}
          onClose={() => setView(null)}
          wide
          footer={
            <>
              <button className="btn danger" onClick={() => remove(viewing.id)}>
                削除
              </button>
              <span className="ed-spacer" />
              <button className="btn primary" onClick={() => setAsCover(viewing.fileId)}>
                表紙の背景に使う
              </button>
            </>
          }
        >
          <div className="lightbox">
            <FileImage id={viewing.fileId} alt={viewing.caption} />
          </div>
        </Modal>
      )}
    </section>
  )
}
