import { TEMPLATES, trackLinks, uid } from '../db'
import TrackChip from '../components/TrackChip'
import { useWork } from '../workContext'
import { AutoArea } from '../components/Field'
import { RowTools, confirmDialog } from '../ui'

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
        <h2>構成</h2>
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
            <span className="meta" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
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
                <div className="seg">
                  {work.music
                    .filter((t) => trackLinks(t).beatIds.includes(b.id))
                    .map((t) => (
                      <TrackChip key={t.id} t={t} />
                    ))}
                </div>
              )}
            </div>
            <RowTools
              onUp={i > 0 ? () => move(i, -1) : undefined}
              onDown={i < beats.length - 1 ? () => move(i, 1) : undefined}
              onDelete={async () => {
                if (b.text.trim() && !(await confirmDialog(`「${b.label || '無題'}」を削除します。`))) return
                update((w) => {
                  w.structure.beats.splice(i, 1)
                })
              }}
            />
          </li>
        ))}
      </ol>
      <button
        className="btn"
        onClick={() =>
          update((w) => {
            w.structure.beats.push({ id: uid(), label: '', text: '' })
          })
        }
      >
        段階を追加
      </button>
    </section>
  )
}
