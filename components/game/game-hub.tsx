'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Gamepad2, Lock, Play, Trophy } from 'lucide-react'
import { WordReveal, fadeUpChild, staggerParent } from '@/components/animations'
import { TangkapSampah } from '@/components/game/tangkap-sampah'
import { KuisAdiwiyata } from '@/components/game/kuis-adiwiyata'
import { ApaItuAdiwiyata } from '@/components/game/apa-itu-adiwiyata'
import '@/components/leaderboard/leaderboard.css'
import './game.css'

type Runner = (props: { onExit: () => void; onFinished: (score: number) => void }) => React.ReactElement
const RUNNERS: Record<string, Runner> = {
  tangkap_sampah: TangkapSampah,
  kuis_adiwiyata: KuisAdiwiyata,
  apa_itu_adiwiyata: ApaItuAdiwiyata,
}

const GAMES = [
  { key: 'tangkap_sampah', title: 'Tangkap Sampah', description: 'Tangkap sampah yang jatuh sebelum mengotori taman.', ready: true },
  { key: 'kuis_adiwiyata', title: 'Kuis Adiwiyata', description: 'Uji pengetahuanmu tentang lingkungan sekolah.', ready: true },
  { key: 'apa_itu_adiwiyata', title: 'Apa itu Adiwiyata', description: 'Kampanye 6 bab: jadikan sekolahmu Adiwiyata Mandiri.', ready: true },
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
          <div><span className="eyebrow">ADIWIYATA · BERMAIN SAMBIL BELAJAR</span><h1 aria-label="Main Game"><WordReveal text="Main Game" /></h1><p>Kumpulkan poin dan naiki leaderboard.</p></div>
        </div>
        <a className="game-link" href="/leaderboard"><Trophy aria-hidden="true" /> Lihat leaderboard</a>
      </header>

      {playing && RUNNERS[playing] ? (
        (() => {
          const Runner = RUNNERS[playing]
          return <Runner onExit={() => setPlaying(null)} onFinished={(score) => setRecords((current) => ({ ...current, [playing]: Math.max(current[playing] ?? 0, score) }))} />
        })()
      ) : (
        <motion.section className="game-grid" aria-label="Daftar game" variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
          {GAMES.map((game) => {
            const enabled = game.ready && active[game.key] !== false
            return (
              <motion.article className="game-card" key={game.key} variants={fadeUpChild} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
                <h2>{game.title}</h2>
                <p>{game.description}</p>
                <div className="game-card-foot">
                  <span>{records[game.key] ? `Rekor: ${records[game.key]}` : game.ready ? 'Belum ada rekor' : 'Segera hadir'}</span>
                  <button type="button" className="game-play" disabled={!enabled} onClick={() => setPlaying(game.key)}>
                    {enabled ? <><Play aria-hidden="true" /> Main</> : <><Lock aria-hidden="true" /> {game.ready ? 'Nonaktif' : 'Terkunci'}</>}
                  </button>
                </div>
              </motion.article>
            )
          })}
        </motion.section>
      )}
    </main>
  )
}
