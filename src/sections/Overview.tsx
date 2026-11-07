import { useNavigate } from 'react-router-dom'
import { STATUSES, deleteWork, downloadBlob, exportWorkJSON, exportWorkText, safeName, type WorkStatus } from '../db'
import { useWork } from '../workContext'
import { AreaField, TextField } from '../components/Field'
import CoverThumb from '../components/CoverThumb'
import { Icon, confirmDialog, toast } from '../ui'

export default function Overview() {
  const { work, update, flush } = useWork()
  const nav = useNavigate()
  const set = <K extends 'title' | 'subtitle' | 'penName' | 'genre' | 'logline' | 'synopsis' | 'theme' | 'memo'>(k: K) => (v: string) =>
    update((w) => {
      w[k] = v
    })

  const onDelete = async () => {
    if (!(await confirmDialog(`「${work.title || '無題'}」を削除します。本文・表紙・画像・音楽もすべて消え、元に戻せません。`))) return
    await deleteWork(work.id)
    toast('作品を削除しました')
    nav('/')
  }

  return (
    <section className="sec">
      <header className="sec-head">
        <h2 className="sec-title">
          <span className="ja">概要</span>
        </h2>
      </header>

      <div className="ov-grid">
        <div className="ov-cover">
          <CoverThumb work={work} />
          <a className="btn ghost small" href={`#/w/${work.id}/cover`}>
            <Icon name="image" size={16} /> {work.coverImageId ? '表紙を編集' : '表紙をつくる'}
          </a>
        </div>

        <div className="ov-fields">
          <TextField label="タイトル" big value={work.title} onChange={set('title')} />
          <TextField label="副題" value={work.subtitle} onChange={set('subtitle')} />
          <div className="field-row">
            <TextField label="ペンネーム" value={work.penName} onChange={set('penName')} />
            <TextField label="ジャンル" value={work.genre} onChange={set('genre')} />
            <label className="field">
              <span className="field-label">状態</span>
              <select
                value={work.status}
                onChange={(e) =>
                  update((w) => {
                    w.status = e.target.value as WorkStatus
                  })
                }
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <TextField
            label="ひとことで言うと"
            value={work.logline}
            onChange={set('logline')}
           
          />
          <AreaField label="あらすじ" count rows={8} value={work.synopsis} onChange={set('synopsis')} />
          <AreaField label="テーマ・書きたいこと" rows={3} value={work.theme} onChange={set('theme')} />
          <AreaField label="メモ" rows={3} value={work.memo} onChange={set('memo')} />
        </div>
      </div>

      <footer className="ov-actions">
        <button
          className="text-btn"
          onClick={async () => {
            await flush()
            downloadBlob(safeName(work.title) + '.txt', await exportWorkText(work.id))
          }}
        >
          <Icon name="download" size={18} /> テキストで書き出す
        </button>
        <button
          className="text-btn"
          onClick={async () => {
            await flush()
            downloadBlob(safeName(work.title) + '.shosai.json', await exportWorkJSON(work.id), 'application/json')
          }}
        >
          <Icon name="download" size={18} /> バックアップ
        </button>
        <button className="text-btn danger-text" onClick={onDelete}>
          <Icon name="trash" size={18} /> 削除
        </button>
      </footer>
    </section>
  )
}
