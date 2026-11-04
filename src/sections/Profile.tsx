import { useRef, useState } from 'react'
import { PALETTE, prepareImage, removeFile, saveFile, uid, type Character } from '../db'
import { useWork } from '../workContext'
import { AutoArea } from '../components/Field'
import { Icon, Modal, confirmDialog, useFileURL } from '../ui'

type TextKey = Exclude<keyof Character, 'id' | 'x' | 'y' | 'history' | 'photoId' | 'color'>

const ROLES = ['主人公', 'ヒロイン', 'ヒーロー', '相棒', '師匠', 'ライバル', '敵', '黒幕', '家族', '友人', '脇役']

/** 履歴書の下段に並べる項目（見出しは履歴書の言い回しに寄せる） */
const BLOCKS: { k: TextKey; label: string; sub?: string; ph: string }[] = [
  { k: 'appearance', label: '外見の特徴', ph: '髪型、服装、体つき、目立つしるし' },
  { k: 'personality', label: '性格', ph: '長所と短所、くせ' },
  { k: 'speech', label: '口ぐせ・話し方', ph: '一人称、語尾、よく言うせりふ' },
  { k: 'likes', label: '好きなもの', ph: '' },
  { k: 'dislikes', label: '苦手なもの', ph: '' },
  { k: 'skills', label: '特技・資格', ph: '' },
  { k: 'motive', label: '志望の動機', sub: '物語での目的・望み', ph: 'この人物は何を求めて動くのか' },
  { k: 'secret', label: '本人希望記入欄', sub: '秘密・本音', ph: '誰にも言っていないこと' },
  { k: 'memo', label: '備考', ph: '作者用のメモ' },
]

export default function Profile({ c, startEditing, onClose }: { c: Character; startEditing: boolean; onClose: () => void }) {
  const { work, update } = useWork()
  const [editing, setEditing] = useState(startEditing)
  const photo = useFileURL(c.photoId)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<Character>) =>
    update((w) => {
      const x = w.characters.find((x) => x.id === c.id)
      if (x) Object.assign(x, patch)
    })
  const setHist = (fn: (h: Character['history']) => void) =>
    update((w) => {
      const x = w.characters.find((x) => x.id === c.id)
      if (x) fn(x.history)
    })

  const onPhoto = async (f: File | undefined) => {
    if (!f) return
    const blob = await prepareImage(f, 900)
    const id = await saveFile(work.id, blob, f.name)
    const old = c.photoId
    set({ photoId: id })
    await removeFile(old)
  }

  const relations = work.relations
    .filter((r) => r.from === c.id || r.to === c.id)
    .map((r) => {
      const otherId = r.from === c.id ? r.to : r.from
      const other = work.characters.find((x) => x.id === otherId)
      const arrow = r.dir === 'both' ? '↔' : r.dir === 'none' ? '―' : r.from === c.id ? '→' : '←'
      return { id: r.id, arrow, name: other?.name || '名前未設定', label: r.label, color: r.color }
    })

  const onDelete = async () => {
    if (!(await confirmDialog(`「${c.name || '名前未設定'}」を削除します。この人物の関係線も消えます。`))) return
    const photoId = c.photoId
    update((w) => {
      w.characters = w.characters.filter((x) => x.id !== c.id)
      w.relations = w.relations.filter((r) => r.from !== c.id && r.to !== c.id)
    })
    await removeFile(photoId)
    onClose()
  }

  const footer = editing ? (
    <>
      <button className="btn ghost danger-text" onClick={onDelete}>
        <Icon name="trash" size={16} /> 人物を削除
      </button>
      <span className="ed-spacer" />
      <button className="btn primary" onClick={() => setEditing(false)}>
        履歴書を見る
      </button>
    </>
  ) : (
    <>
      <span className="ed-spacer" />
      <button className="btn ghost" onClick={onClose}>
        閉じる
      </button>
      <button className="btn primary" onClick={() => setEditing(true)}>
        <Icon name="pen" size={16} /> 編集する
      </button>
    </>
  )

  return (
    <Modal title={editing ? 'プロフィールを編集' : c.name || '名前未設定'} onClose={onClose} footer={footer} wide>
      {!editing ? (
        <article className="rireki">
          <header className="rk-head">
            <h3>履 歴 書</h3>
            <span>『{work.title || '無題'}』登場人物</span>
          </header>
          <div className="rk-top">
            <table className="rk-table">
              <tbody>
                <tr className="rk-kana">
                  <th>ふりがな</th>
                  <td>{c.kana}</td>
                </tr>
                <tr className="rk-name">
                  <th>氏　名</th>
                  <td>{c.name || <span className="muted">未記入</span>}</td>
                </tr>
                <tr>
                  <th>生年月日</th>
                  <td>
                    {c.birthday}
                    {c.age && <>（満 {c.age} 歳）</>}
                  </td>
                </tr>
                <tr>
                  <th>性　別</th>
                  <td>{c.gender}</td>
                </tr>
                <tr>
                  <th>身長・体格</th>
                  <td>{c.height}</td>
                </tr>
                <tr>
                  <th>出身・住所</th>
                  <td>{c.origin}</td>
                </tr>
                <tr>
                  <th>職業・所属</th>
                  <td>{c.occupation}</td>
                </tr>
                <tr>
                  <th>物語での役割</th>
                  <td>{c.role}</td>
                </tr>
              </tbody>
            </table>
            <div className="rk-photo" style={{ borderColor: c.color }}>
              {photo ? <img src={photo} alt={`${c.name}の写真`} /> : <span>写真をはる位置</span>}
            </div>
          </div>

          <table className="rk-history">
            <thead>
              <tr>
                <th className="rk-y">年</th>
                <th className="rk-m">月</th>
                <th>学歴・職歴（これまでの経歴）</th>
              </tr>
            </thead>
            <tbody>
              {c.history.map((h) => (
                <tr key={h.id}>
                  <td>{h.year}</td>
                  <td>{h.month}</td>
                  <td>{h.text}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 4 - c.history.length) }, (_, i) => (
                <tr key={'blank' + i} className="rk-blank">
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
              <tr>
                <td />
                <td />
                <td className="rk-ijo">以上</td>
              </tr>
            </tbody>
          </table>

          <dl className="rk-blocks">
            {BLOCKS.filter((b) => c[b.k]).map((b) => (
              <div key={b.k} className="rk-block">
                <dt>
                  {b.label}
                  {b.sub && <small>（{b.sub}）</small>}
                </dt>
                <dd>{c[b.k]}</dd>
              </div>
            ))}
          </dl>

          {relations.length > 0 && (
            <section className="rk-rel">
              <h4>人間関係</h4>
              <ul>
                {relations.map((r) => (
                  <li key={r.id}>
                    <span className="rk-arrow" style={{ color: r.color }}>
                      {r.arrow}
                    </span>
                    <strong>{r.name}</strong>
                    {r.label && <span>「{r.label}」</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      ) : (
        <div className="pf-edit">
          <div className="pf-top">
            <div className="pf-photo">
              <button className="rk-photo as-btn" style={{ borderColor: c.color }} onClick={() => fileRef.current?.click()} aria-label="写真を選ぶ">
                {photo ? <img src={photo} alt="" /> : <span>写真を選ぶ</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
              {c.photoId && (
                <button
                  className="btn ghost small"
                  onClick={async () => {
                    const old = c.photoId
                    set({ photoId: null })
                    await removeFile(old)
                  }}
                >
                  写真を外す
                </button>
              )}
              <div className="swatches" aria-label="図の色">
                {PALETTE.map((p) => (
                  <button key={p} className={'swatch' + (c.color === p ? ' on' : '')} style={{ background: p }} onClick={() => set({ color: p })} aria-label={'色 ' + p} />
                ))}
              </div>
            </div>
            <div className="pf-grid">
              <Txt label="氏名" v={c.name} on={(v) => set({ name: v })} autoFocus={!c.name} />
              <Txt label="ふりがな" v={c.kana} on={(v) => set({ kana: v })} />
              <label className="field">
                <span className="field-label">物語での役割</span>
                <input list="roles" value={c.role} onChange={(e) => set({ role: e.target.value })} placeholder="主人公、相棒など" />
                <datalist id="roles">
                  {ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </label>
              <Txt label="生年月日" v={c.birthday} on={(v) => set({ birthday: v })} ph="例：作中暦 312年 4月 9日" />
              <Txt label="年齢" v={c.age} on={(v) => set({ age: v })} ph="数字だけでOK" />
              <Txt label="性別" v={c.gender} on={(v) => set({ gender: v })} />
              <Txt label="身長・体格" v={c.height} on={(v) => set({ height: v })} />
              <Txt label="出身・住所" v={c.origin} on={(v) => set({ origin: v })} />
              <Txt label="職業・所属" v={c.occupation} on={(v) => set({ occupation: v })} />
            </div>
          </div>

          <div className="field">
            <span className="field-label">学歴・職歴（これまでの経歴）</span>
            <div className="hist">
              {c.history.map((h, i) => (
                <div className="hist-row" key={h.id}>
                  <input
                    className="hist-y"
                    value={h.year}
                    placeholder="年"
                    aria-label="年"
                    onChange={(e) =>
                      setHist((hs) => {
                        hs[i].year = e.target.value
                      })
                    }
                  />
                  <input
                    className="hist-m"
                    value={h.month}
                    placeholder="月"
                    aria-label="月"
                    onChange={(e) =>
                      setHist((hs) => {
                        hs[i].month = e.target.value
                      })
                    }
                  />
                  <input
                    value={h.text}
                    placeholder="できごと"
                    aria-label="できごと"
                    onChange={(e) =>
                      setHist((hs) => {
                        hs[i].text = e.target.value
                      })
                    }
                  />
                  <button
                    className="icon-btn"
                    aria-label="この行を削除"
                    onClick={() =>
                      setHist((hs) => {
                        hs.splice(i, 1)
                      })
                    }
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
              <button
                className="btn ghost small"
                onClick={() =>
                  setHist((hs) => {
                    hs.push({ id: uid(), year: '', month: '', text: '' })
                  })
                }
              >
                <Icon name="plus" size={16} /> 行を追加
              </button>
            </div>
          </div>

          <div className="pf-blocks">
            {BLOCKS.map((b) => (
              <label className="field" key={b.k}>
                <span className="field-label">
                  {b.label}
                  {b.sub && <small>（{b.sub}）</small>}
                </span>
                <AutoArea value={c[b.k]} placeholder={b.ph} onChange={(e) => set({ [b.k]: e.target.value })} />
              </label>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Txt({ label, v, on, ph, autoFocus }: { label: string; v: string; on: (v: string) => void; ph?: string; autoFocus?: boolean }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input value={v} placeholder={ph} autoFocus={autoFocus} onChange={(e) => on(e.target.value)} />
    </label>
  )
}
