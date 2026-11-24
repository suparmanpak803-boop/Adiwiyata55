'use client'

// Koleksi spesies Bab 6 — terbuka saat Bab 6 (Biodiversitas) selesai.
// Spesies yang belum terbuka tampil sebagai "???" supaya tetap penasaran.
import { Bird, Bug, Flower2, Leaf } from 'lucide-react'
import { SPESIES } from '@/lib/apa-itu-adiwiyata/content/spesies'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'

const IKON_JENIS = {
  burung: Bird,
  'kupu-kupu': Bug,
  serangga: Bug,
  tanaman: Flower2,
} as const

export function KoleksiSpesies() {
  const { save } = useCampaign()
  const terbuka = save.species.length
  return (
    <section aria-label="Koleksi spesies">
      <h3 className="aia-section-title">Koleksi Spesies</h3>
      <p className="aia-muted">
        {terbuka === 0
          ? 'Selesaikan Misi 6 untuk membuka koleksi spesies halaman sekolah.'
          : `${terbuka} dari ${SPESIES.length} spesies sudah datang ke halaman sekolah.`}
      </p>
      <div className="aia-stack">
        {SPESIES.map((sp) => {
          const sudah = save.species.includes(sp.id)
          const Ikon = IKON_JENIS[sp.jenis] ?? Leaf
          return (
            <article key={sp.id} className="aia-card">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="aia-bab-icon" aria-hidden="true">
                  <Ikon />
                </span>
                <div className="aia-bab-body">
                  <strong>{sudah ? sp.nama : '???'}</strong>
                  <p>
                    {sudah
                      ? sp.deskripsi
                      : 'Spesies ini belum datang. Selesaikan Misi 6 untuk mengundangnya.'}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
