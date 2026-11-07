import { useSyncExternalStore } from 'react'
import type { Track } from '../db'
import { fileURL, toast } from '../ui'

/* 同時に鳴るのは1曲だけ。アプリ全体で1つのプレーヤーを使い回す */
const player = typeof Audio !== 'undefined' ? new Audio() : null
let playingId: string | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
if (player) {
  player.loop = true
  player.addEventListener('pause', () => {
    playingId = null
    emit()
  })
}

export function usePlaying() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => playingId,
  )
}

export async function toggleTrack(t: Track) {
  if (!player) return
  if (playingId === t.id) {
    player.pause()
    return
  }
  if (!t.fileId) {
    if (t.url) window.open(t.url, '_blank', 'noopener')
    return
  }
  const url = await fileURL(t.fileId)
  if (!url) {
    toast('音声ファイルが見つかりません')
    return
  }
  player.src = url
  try {
    await player.play()
    playingId = t.id
    emit()
  } catch {
    toast('再生できませんでした')
  }
}

/** 人物・章・構成から曲を呼び出す小さなチップ */
export default function TrackChip({ t }: { t: Track }) {
  const playing = usePlaying() === t.id
  const label = t.title || '無題の曲'
  if (!t.fileId && t.url)
    return (
      <a className="track-chip" href={t.url} target="_blank" rel="noreferrer" title="外部サービスで開く">
        <span className="tc-icon" aria-hidden="true">↗</span>
        <span className="tc-title">{label}</span>
        {t.artist && <span className="tc-artist">{t.artist}</span>}
      </a>
    )
  return (
    <button className={'track-chip' + (playing ? ' playing' : '')} onClick={() => toggleTrack(t)} disabled={!t.fileId} aria-pressed={playing}>
      <span className="tc-icon" aria-hidden="true">
        {playing ? <span className="eq"><i /><i /><i /></span> : '▶'}
      </span>
      <span className="tc-title">{label}</span>
      {t.artist && <span className="tc-artist">{t.artist}</span>}
    </button>
  )
}
