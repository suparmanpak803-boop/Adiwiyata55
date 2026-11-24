'use client'

import { Lock } from 'lucide-react'
import { CHAPTERS, CHAPTER_ICONS, ZONES } from '@/lib/apa-itu-adiwiyata/chapters'
import { selectChapterUnlocked, useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import type { ChapterId } from '@/lib/apa-itu-adiwiyata/types'
import { playPop } from './suara'

export function PetaSekolah({ onPlayChapter }: { onPlayChapter: (chapterId: ChapterId) => void }) {
  const { save } = useCampaign()

  return (
    <div className="aia-stack">
      <section aria-labelledby="aia-peta-title">
        <span className="aia-kicker">Peta Sekolah</span>
        <h2 id="aia-peta-title" className="aia-section-title">
          Jelajahi Sekolahmu
        </h2>
        <p className="aia-muted">
          Delapan zona menunggumu. Zona yang terkunci terbuka setelah kamu menyelesaikan bab sebelumnya.
        </p>
        <div className="aia-zone-grid">
          {ZONES.map((zona) => {
            const meta = CHAPTERS[zona.chapterId]
            const Icon = CHAPTER_ICONS[meta.icon]
            const unlocked = selectChapterUnlocked(save, zona.chapterId)
            const done = save.chapters[zona.chapterId].done
            return (
              <button
                key={zona.id}
                type="button"
                className={`aia-zone${!unlocked ? ' locked' : ''}`}
                disabled={!unlocked}
                onClick={() => {
                  playPop()
                  onPlayChapter(zona.chapterId)
                }}
                aria-label={`Zona ${zona.label}${done ? ', bab selesai' : ''}${!unlocked ? `, terkunci. Selesaikan ${meta.judul} dulu` : ''}`}
              >
                {unlocked ? <Icon aria-hidden="true" /> : <Lock aria-hidden="true" />}
                <strong>{zona.label}</strong>
                <small>
                  {done ? 'Bab selesai' : unlocked ? meta.judul : `Buka: ${meta.judul}`}
                </small>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
