'use client'

// Rapor Sekolah: lima indikator 0-100. Indikator yang masih 0 tampil
// terkunci supaya pemain penasaran dengan bab yang membukanya.
import { Lock } from 'lucide-react'
import { CHAPTERS } from '@/lib/apa-itu-adiwiyata/chapters'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import type { ChapterId, Report } from '@/lib/apa-itu-adiwiyata/types'

const BARIS: { kunci: keyof Report; label: string; bab: ChapterId; keterangan: string }[] = [
  { kunci: 'sampah', label: 'Sampah', bab: 'kantin', keterangan: 'Memilah dan mengurangi sampah' },
  { kunci: 'energi', label: 'Energi', bab: 'air-energi', keterangan: 'Hemat listrik di sekolah' },
  { kunci: 'air', label: 'Air', bab: 'air-energi', keterangan: 'Menampung dan menghemat air' },
  { kunci: 'hijau', label: 'Hijau', bab: 'kompos', keterangan: 'Kompos dan kebun sekolah' },
  {
    kunci: 'biodiversitas',
    label: 'Biodiversitas',
    bab: 'biodiversitas',
    keterangan: 'Pohon, burung, dan kupu-kupu',
  },
]

export function RaporSekolah() {
  const { save } = useCampaign()

  return (
    <div className="aia-stack">
      <p className="aia-muted">
        Rapor ini naik setiap kali kamu menyelesaikan bab. Indikator yang masih terkunci akan terbuka
        setelah bab terkait dimainkan.
      </p>
      {BARIS.map((baris) => {
        const nilai = save.report[baris.kunci]
        const terkunci = nilai <= 0
        return (
          <article key={baris.kunci} className="aia-card">
            <div className="aia-progress-row">
              <strong>{baris.label}</strong>
              <span>{terkunci ? 'Terkunci' : `${nilai}/100`}</span>
            </div>
            <p className="aia-muted" style={{ margin: '4px 0 8px' }}>
              {baris.keterangan}
            </p>
            <div
              className="aia-progress"
              role="progressbar"
              aria-valuenow={nilai}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Rapor ${baris.label}`}
            >
              <span style={{ width: `${nilai}%` }} />
            </div>
            {terkunci && (
              <p className="aia-muted" style={{ margin: '8px 0 0' }}>
                <Lock aria-hidden="true" style={{ width: 14, height: 14, verticalAlign: -2 }} /> Selesaikan
                misi {CHAPTERS[baris.bab].judul} untuk membuka indikator ini.
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}
