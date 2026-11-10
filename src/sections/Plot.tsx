import { TEMPLATES, trackLinks, uid } from '../db'
import TrackChip from '../components/TrackChip'
import { useWork } from '../workContext'
import { AutoArea } from '../components/Field'
import { Icon, confirmDialog } from '../ui'

export default function Plot() {
  const { work, update } = useWork()
  const beats = work.structure.beats

  const applyTemplate = async (key: string) => {
    const hasText = beats.some((b) => b.text.trim())
    if (hasText && !(await confirmDialog('いまの構成メモを、選んだ型の見出しに置き換えます。書いた内容は消えます。', '置き換える'))) return
    update((w) => {
      w.structure.template = key
      w.structure.beats = TEMPLATES[key].beats.map((label) => ({ id: uid(), label, text: '' }))
    })
  }

  const move = (i: number, d: number) =>
    update((w) => {
      const b = w.structure.beats
      const j = i + d
      if (j < 0 || j >= b.length) return
      ;[b[i], b[j]] = [b[j], b[i]]
    })

  return (
    <section className="sec">
      <header className="sec-head">
        <h2 className="sec-title">
          <span className="ja">構成</span>
        </h2>
      </header>

      <div className="seg" role="group" aria-label="構成の型">
        {Object.entries(TEMPLATES).map(([k, t]) => (
          <button key={k} className={'seg-btn' + (work.structure.template === k ? ' on' : '')} onClick={() => applyTemplate(k)}>
            {t.name}
          </button>
        ))}
      </div>

      <ol className="beats">
        {beats.map((b, i) => (
          <li key={b.id} className="beat">
            <div className="beat-mark" aria-hidden="true">
              <span>{i + 1}</span>
            </div>
            <div className="beat-body">
              <input
                className="beat-label"
                value={b.label}
                placeholder="見出し"
                aria-label="見出し"
                onChange={(e) =>
                  update((w) => {
                    w.structure.beats[i].label = e.target.value
                  })
                }
              />
              <AutoArea
                className="beat-text"
                value={b.text}
                aria-label={`${b.label}の内容`}
                onChange={(e) =>
                  update((w) => {
                    w.structure.beats[i].text = e.target.value
                  })
                }
              />
              {work.music.some((t) => trackLinks(t).beatIds.includes(b.id)) && (
                <div className="chip-row">
                  {work.music
                    .filter((t) => trackLinks(t).beatIds.includes(b.id))
                    .map((t) => (
                      <TrackChip key={t.id} t={t} />
                    ))}
                </div>
              )}
            </div>
            <div className="beat-tools">
              <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="上へ">
                <Icon name="up" size={18} />
              </button>
              <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === beats.length - 1} aria-label="下へ">
                <Icon name="down" size={18} />
              </button>
              <button
                className="icon-btn"
                aria-label="この段階を削除"
                onClick={async () => {
                  if (b.text.trim() && !(await confirmDialog(`「${b.label || '無題'}」を削除します。`))) return
                  update((w) => {
                    w.structure.beats.splice(i, 1)
                  })
                }}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        className="btn ghost"
        onClick={() =>
          update((w) => {
            w.structure.beats.push({ id: uid(), label: '', text: '' })
          })
        }
      >
        <Icon name="plus" size={18} /> 段階を追加
      </button>
    </section>
  )
}
