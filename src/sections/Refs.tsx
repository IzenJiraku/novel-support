import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prepareImage, removeFile, saveFile, uid } from '../db'
import { useWork } from '../workContext'
import { FileImage, Icon, Modal, confirmDialog, toast } from '../ui'

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

  const useAsCover = (fileId: string) => {
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
        <h2 className="sec-title">
          <span className="en">References</span>
          <span className="ja">参考画像</span>
        </h2>
        <p className="sec-hint">風景、衣装、小物、雰囲気の資料をまとめておく場所です。PCでは画像をここへドラッグしても追加できます。</p>
      </header>

      <div className="refs-bar">
        <button className="btn primary small" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name="image" size={16} /> {busy ? '追加しています…' : '画像を追加'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        {tags.length > 0 && (
          <div className="chips" role="group" aria-label="タグで絞り込む">
            <button className={'chip' + (tag === null ? ' on' : '')} onClick={() => setTag(null)}>
              すべて
            </button>
            {tags.map((t) => (
              <button key={t} className={'chip' + (tag === t ? ' on' : '')} onClick={() => setTag(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {work.refs.length === 0 ? (
        <button className="drop-empty" onClick={() => fileRef.current?.click()}>
          <Icon name="image" size={28} />
          <span>まだ画像がありません。押して画像を選んでください。</span>
        </button>
      ) : (
        <ul className="refs">
          {list.map((r) => (
            <li key={r.id} className="ref">
              <button className="ref-img" onClick={() => setView(r.id)} aria-label="大きく見る">
                <FileImage id={r.fileId} alt={r.caption} />
              </button>
              <input className="ref-cap" value={r.caption} placeholder="メモ" aria-label="メモ" onChange={(e) => setField(r.id, 'caption', e.target.value)} />
              <input className="ref-tag" value={r.tag} placeholder="タグ（例：舞台、衣装）" aria-label="タグ" onChange={(e) => setField(r.id, 'tag', e.target.value)} />
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
              <button className="btn ghost danger-text" onClick={() => remove(viewing.id)}>
                <Icon name="trash" size={16} /> 削除
              </button>
              <span className="ed-spacer" />
              <button className="btn primary" onClick={() => useAsCover(viewing.fileId)}>
                <Icon name="image" size={16} /> 表紙の背景に使う
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
