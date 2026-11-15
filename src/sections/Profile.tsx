import { useRef, useState } from 'react'
import { PALETTE, prepareImage, removeFile, saveFile, trackLinks, uid, type Character } from '../db'
import TrackChip from '../components/TrackChip'
import { useWork } from '../workContext'
import { AutoArea } from '../components/Field'
import { Modal, confirmDialog, useFileURL } from '../ui'

type TextKey = Exclude<keyof Character, 'id' | 'x' | 'y' | 'history' | 'photoId' | 'color'>

const ROLES = ['主人公', 'ヒロイン', 'ヒーロー', '相棒', '師匠', 'ライバル', '敵', '黒幕', '家族', '友人', '脇役']

/** 履歴書の下段に並べる項目（見出しは履歴書の言い回しに寄せる） */
const BLOCKS: { k: TextKey; label: string; sub?: string }[] = [
  { k: 'appearance', label: '外見の特徴' },
  { k: 'personality', label: '性格' },
  { k: 'speech', label: '口ぐせ・話し方' },
  { k: 'likes', label: '好きなもの' },
  { k: 'dislikes', label: '苦手なもの' },
  { k: 'skills', label: '特技・資格' },
  { k: 'motive', label: '志望の動機', sub: '物語での目的・望み' },
  { k: 'secret', label: '本人希望記入欄', sub: '秘密・本音' },
  { k: 'memo', label: '備考' },
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

  const themeTracks = work.music.filter((t) => trackLinks(t).characterIds.includes(c.id))
  const toggleTrack = (trackId: string) =>
    update((w) => {
      const t = w.music.find((t) => t.id === trackId)
      if (!t) return
      const ids = t.characterIds ?? []
      t.characterIds = ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id]
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
      <button className="btn danger" onClick={onDelete}>
        削除
      </button>
      <span className="ed-spacer" />
      <button className="btn primary" onClick={() => setEditing(false)}>
        完了
      </button>
    </>
  ) : (
    <button className="btn primary" onClick={() => setEditing(true)}>
      編集
    </button>
  )

  return (
    <Modal title="履歴書" onClose={onClose} footer={footer} wide>
      {!editing ? (
        <article className="rireki">
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
            {photo && <img className="rk-photo" src={photo} alt={`${c.name}の写真`} />}
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

          {themeTracks.length > 0 && (
            <section className="rk-rel">
              <h4>テーマ曲</h4>
              <div className="seg">
                {themeTracks.map((t) => (
                  <TrackChip key={t.id} t={t} />
                ))}
              </div>
            </section>
          )}

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
              {photo && <img className="rk-photo" src={photo} alt="" />}
              <button className="btn" onClick={() => fileRef.current?.click()}>
                写真を選ぶ
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
              {c.photoId && (
                <button
                  className="btn"
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
                <input list="roles" value={c.role} onChange={(e) => set({ role: e.target.value })} />
                <datalist id="roles">
                  {ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </label>
              <Txt label="生年月日" v={c.birthday} on={(v) => set({ birthday: v })} />
              <Txt label="年齢" v={c.age} on={(v) => set({ age: v })} />
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
                    className="btn"
                    onClick={() =>
                      setHist((hs) => {
                        hs.splice(i, 1)
                      })
                    }
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                className="btn"
                onClick={() =>
                  setHist((hs) => {
                    hs.push({ id: uid(), year: '', month: '', text: '' })
                  })
                }
              >
                行を追加
              </button>
            </div>
          </div>

          {work.music.length > 0 && (
            <div className="field">
              <span className="field-label">テーマ曲</span>
              <div className="seg">
                {work.music.map((t) => (
                  <button key={t.id} className={'seg-btn' + (trackLinks(t).characterIds.includes(c.id) ? ' on' : '')} onClick={() => toggleTrack(t.id)}>
                    {t.title || '無題の曲'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pf-blocks">
            {BLOCKS.map((b) => (
              <label className="field" key={b.k}>
                <span className="field-label">
                  {b.label}
                  {b.sub && <small>（{b.sub}）</small>}
                </span>
                <AutoArea value={c[b.k]} onChange={(e) => set({ [b.k]: e.target.value })} />
              </label>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function Txt({ label, v, on, autoFocus }: { label: string; v: string; on: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input value={v} autoFocus={autoFocus} onChange={(e) => on(e.target.value)} />
    </label>
  )
}
