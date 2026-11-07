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
          <span className="en">Overview</span>
          <span className="ja">概要</span>
        </h2>
        <p className="sec-hint">作品の顔になる情報です。入力すると自動で保存されます。</p>
      </header>

      <div className="ov-grid">
        <div className="ov-cover">
          <a href={`#/w/${work.id}/cover`} className="ov-cover-link" aria-label="表紙をつくる">
            <CoverThumb work={work} />
          </a>
          <a className="btn ghost small" href={`#/w/${work.id}/cover`}>
            <Icon name="image" size={16} /> {work.coverImageId ? '表紙を編集' : '表紙をつくる'}
          </a>
        </div>

        <div className="ov-fields">
          <TextField label="タイトル" big value={work.title} onChange={set('title')} placeholder="作品のタイトル" />
          <TextField label="副題" value={work.subtitle} onChange={set('subtitle')} placeholder="サブタイトル（任意）" />
          <div className="field-row">
            <TextField label="ペンネーム" value={work.penName} onChange={set('penName')} />
            <TextField label="ジャンル" value={work.genre} onChange={set('genre')} placeholder="例：ファンタジー、恋愛" />
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
            placeholder="誰が、何のために、何をする物語か（ログライン）"
          />
          <AreaField label="あらすじ" count rows={8} value={work.synopsis} onChange={set('synopsis')} placeholder="物語のはじまりから結末までを、短くまとめて。" />
          <AreaField label="テーマ・書きたいこと" rows={3} value={work.theme} onChange={set('theme')} placeholder="この物語で描きたいもの、読者に残したい気持ち" />
          <AreaField label="メモ" rows={3} value={work.memo} onChange={set('memo')} placeholder="思いつきや調べもの" />
        </div>
      </div>

      <footer className="ov-actions">
        <button
          className="btn ghost"
          onClick={async () => {
            await flush()
            downloadBlob(safeName(work.title) + '.txt', await exportWorkText(work.id))
          }}
        >
          <Icon name="download" size={18} /> 本文をテキストで書き出す
        </button>
        <button
          className="btn ghost"
          onClick={async () => {
            await flush()
            downloadBlob(safeName(work.title) + '.shosai.json', await exportWorkJSON(work.id), 'application/json')
          }}
        >
          <Icon name="download" size={18} /> バックアップを書き出す
        </button>
        <button className="btn ghost danger-text" onClick={onDelete}>
          <Icon name="trash" size={18} /> この作品を削除
        </button>
      </footer>
    </section>
  )
}
