'use client'

import { useState } from 'react'
import { Gamepad2, Lock, Play, Trophy } from 'lucide-react'
import { TangkapSampah } from '@/components/game/tangkap-sampah'
import { KuisAdiwiyata } from '@/components/game/kuis-adiwiyata'
import '@/components/leaderboard/leaderboard.css'
import './game.css'

type Runner = (props: { onExit: () => void; onFinished: (score: number) => void }) => React.ReactElement
const RUNNERS: Record<string, Runner> = {
  tangkap_sampah: TangkapSampah,
  kuis_adiwiyata: KuisAdiwiyata,
}

const GAMES = [
  { key: 'tangkap_sampah', title: 'Tangkap Sampah', description: 'Tangkap sampah yang jatuh sebelum mengotori taman.', ready: true },
  { key: 'kuis_adiwiyata', title: 'Kuis Adiwiyata', description: 'Uji pengetahuanmu tentang lingkungan sekolah.', ready: true },
] as const

export function GameHub({ active, best }: { active: Record<string, boolean>; best: Record<string, number> }) {
  const [playing, setPlaying] = useState<string | null>(null)
  const [records, setRecords] = useState(best)

  return (
    <main className="leaderboard-page">
      <header className="leaderboard-header">
        <a href="/" className="leaderboard-back">← Kembali ke beranda</a>
        <div className="leaderboard-title-row">
          <span className="leaderboard-mark"><Gamepad2 aria-hidden="true" /></span>
          <div><span className="eyebrow">ADIWIYATA · BERMAIN SAMBIL BELAJAR</span><h1>Main Game</h1><p>Kumpulkan poin dan naiki leaderboard.</p></div>
        </div>
        <a className="game-link" href="/leaderboard"><Trophy aria-hidden="true" /> Lihat leaderboard</a>
      </header>

      {playing && RUNNERS[playing] ? (
        (() => {
          const Runner = RUNNERS[playing]
          return <Runner onExit={() => setPlaying(null)} onFinished={(score) => setRecords((current) => ({ ...current, [playing]: Math.max(current[playing] ?? 0, score) }))} />
        })()
      ) : (
        <section className="game-grid" aria-label="Daftar game">
          {GAMES.map((game) => {
            const enabled = game.ready && active[game.key] !== false
            return (
              <article className="game-card" key={game.key}>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
                <div className="game-card-foot">
                  <span>{records[game.key] ? `Rekor: ${records[game.key]}` : game.ready ? 'Belum ada rekor' : 'Segera hadir'}</span>
                  <button type="button" className="game-play" disabled={!enabled} onClick={() => setPlaying(game.key)}>
                    {enabled ? <><Play aria-hidden="true" /> Main</> : <><Lock aria-hidden="true" /> {game.ready ? 'Nonaktif' : 'Terkunci'}</>}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}
