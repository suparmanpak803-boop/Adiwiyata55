'use client'

// Janji Harian: pilih satu janji nyata di akhir bab, lalu check-in
// "Sudah kulakukan" saat janji itu benar-benar dilakukan.
import { useState } from 'react'
import { CalendarCheck, Check, Plus } from 'lucide-react'
import { CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { JANJI_HARIAN } from '@/lib/apa-itu-adiwiyata/content/janji'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import type { ChapterId } from '@/lib/apa-itu-adiwiyata/types'
import { benar, klik } from './suara'

export function JanjiHarian() {
  const { save, dispatch } = useCampaign()
  const [pesan, setPesan] = useState<string | null>(null)

  // Bab terakhir yang sudah diselesaikan (untuk mencatat janji); gerbang bila belum ada.
  const babTerakhir: ChapterId =
    [...CHAPTER_ORDER].reverse().find((id) => save.chapters[id].done) ?? 'gerbang'

  const aktif = save.promises.filter((p) => !p.done)
  const selesai = save.promises.filter((p) => p.done)

  const sudahDipilih = (teks: string) => aktif.some((p) => p.text === teks)

  return (
    <div className="aia-stack">
      <p className="aia-muted">
        Janji kecil yang nyata lebih kuat daripada niat besar yang tidak dilakukan. Pilih satu, lalu
        lakukan besok.
      </p>

      {pesan && (
        <p className="aia-card" role="status" style={{ borderColor: 'var(--green)' }}>
          {pesan}
        </p>
      )}

      <h3 className="aia-section-title">Janji yang sedang berjalan</h3>
      {aktif.length === 0 ? (
        <p className="aia-muted">Belum ada janji aktif. Pilih satu di bawah ini untuk memulai.</p>
      ) : (
        aktif.map((janji) => (
          <article key={janji.id} className="aia-card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span className="aia-bab-icon" aria-hidden="true">
                <CalendarCheck />
              </span>
              <div className="aia-bab-body">
                <strong>{janji.text}</strong>
                <p>Dibuat {new Date(janji.createdAt).toLocaleDateString('id-ID')}</p>
                <div className="aia-actions" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="aia-btn aia-btn-primary"
                    onClick={() => {
                      benar()
                      dispatch({ type: 'CHECKIN_PROMISE', id: janji.id })
                      setPesan(`Hebat! Janji "${janji.text}" sudah kamu lakukan.`)
                    }}
                  >
                    <Check aria-hidden="true" /> Sudah kulakukan
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))
      )}

      <h3 className="aia-section-title">Pilih janji baru</h3>
      <div className="aia-stack">
        {JANJI_HARIAN.map((janji) => {
          const dipilih = sudahDipilih(janji.teks)
          return (
            <button
              key={janji.id}
              type="button"
              className="aia-bab-card"
              disabled={dipilih}
              onClick={() => {
                klik()
                dispatch({ type: 'ADD_PROMISE', text: janji.teks, chapterId: babTerakhir })
                setPesan(`Janji "${janji.teks}" dicatat. Semangat!`)
              }}
            >
              <span className="aia-bab-icon" aria-hidden="true">
                <Plus />
              </span>
              <span className="aia-bab-body">
                <strong>{janji.teks}</strong>
                <p>{dipilih ? 'Sudah kamu pilih dan sedang berjalan.' : 'Ketuk untuk memilih janji ini.'}</p>
              </span>
            </button>
          )
        })}
      </div>

      {selesai.length > 0 && (
        <>
          <h3 className="aia-section-title">Janji yang sudah ditepati</h3>
          {selesai.map((janji) => (
            <article key={janji.id} className="aia-card">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span className="aia-bab-icon" aria-hidden="true">
                  <Check />
                </span>
                <div className="aia-bab-body">
                  <strong>{janji.text}</strong>
                  <p>
                    <span className="aia-chip done">Sudah dilakukan</span>
                  </p>
                </div>
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  )
}
