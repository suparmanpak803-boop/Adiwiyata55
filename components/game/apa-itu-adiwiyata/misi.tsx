'use client'

// Daftar misi kampanye "Apa itu Adiwiyata".
// Misi TIDAK bisa dimulai dari daftar ini — pemain harus menjelajah dunia
// dan menemui langsung pemberi misinya (NPC) untuk memulai.

import { Check, Flag, Lock, MapPin } from 'lucide-react'
import { CHAPTERS, CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import {
  jumlahMisiSelesai,
  LOKASI_PEMBERI,
  pemberiMisi,
  statusMisi,
} from '@/lib/apa-itu-adiwiyata/misi'

export function Misi() {
  const { save, hydrated } = useCampaign()

  if (!hydrated) {
    return (
      <section className="aia-card" aria-label="Memuat misi">
        <p className="aia-muted">Memuat misi...</p>
      </section>
    )
  }

  const selesai = jumlahMisiSelesai(save)

  return (
    <div className="aia-stack">
      <section className="aia-card" aria-labelledby="aia-misi-title">
        <span className="aia-kicker">Misi · Adiwiyata 55</span>
        <h2 id="aia-misi-title" className="aia-section-title">
          Misi Sekolah Adiwiyata
        </h2>
        <p className="aia-muted">
          Jelajahi sekolah, temui pemberi misi, dan selesaikan 6 misi untuk menjadikan sekolahmu Adiwiyata
          Mandiri. Misi tidak bisa dimulai dari daftar ini — temui langsung pemberi misinya di dunia.
        </p>
        <div className="aia-progress-row">
          <div
            className="aia-progress"
            role="progressbar"
            aria-valuenow={selesai}
            aria-valuemin={0}
            aria-valuemax={6}
            aria-label="Progres misi"
          >
            <span style={{ width: `${(selesai / 6) * 100}%` }} />
          </div>
          <span>{selesai}/6 misi selesai</span>
        </div>
      </section>

      <section aria-label="Daftar misi">
        <div className="aia-bab-grid">
          {CHAPTER_ORDER.map((id, index) => {
            const meta = CHAPTERS[id]
            const status = statusMisi(save, id)
            const pemberi = pemberiMisi(id)
            const tahapSelesai = save.chapters[id].stages.filter((s) => s.status === 'done').length
            const Icon = status === 'selesai' ? Check : status === 'tersedia' ? Flag : Lock
            const labelStatus =
              status === 'selesai' ? 'selesai' : status === 'tersedia' ? 'tersedia' : 'terkunci'
            return (
              <article
                key={id}
                className={`aia-bab-card statis${status === 'selesai' ? ' done' : ''}${status === 'terkunci' ? ' locked' : ''}`}
                aria-label={`Misi ${index + 1}: ${meta.judul}, ${labelStatus}`}
              >
                <span className="aia-bab-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="aia-bab-body">
                  <strong>
                    Misi {index + 1} · {meta.judul}
                  </strong>
                  <p>{meta.deskripsi}</p>
                  <span className="aia-bab-meta">
                    {pemberi && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin aria-hidden="true" /> Temui {pemberi.nama} di{' '}
                        {LOKASI_PEMBERI[pemberi.id] ?? 'sekolah'}
                      </span>
                    )}
                    {status === 'tersedia' && tahapSelesai > 0 && (
                      <span>Tahap {tahapSelesai}/3 selesai</span>
                    )}
                    {status === 'selesai' && (
                      <span className="aia-chip done">
                        <Check aria-hidden="true" /> Selesai
                      </span>
                    )}
                    {status === 'tersedia' && <span className="aia-chip open">Tersedia</span>}
                    {status === 'terkunci' && <span className="aia-chip">Terkunci</span>}
                  </span>
                </span>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
