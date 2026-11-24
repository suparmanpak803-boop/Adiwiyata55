'use client'

import { useEffect, useState } from 'react'
import type { OpsiCerita, TitikPilihan } from '@/lib/apa-itu-adiwiyata/content/cerita'
import { klik } from './suara'

/**
 * Satu titik Pilihan Cerita (Cerita Bercabang).
 * Menampilkan situasi + tombol-tombol opsi; setelah pemain memilih satu
 * opsi, menampilkan akibatnya + tombol "Lanjut" yang memanggil
 * `onSelesai(opsi)`. Komponen ini TIDAK memanggil dispatch — parent yang
 * menyimpan pilihan lewat aksi PILIH_CERITA di `onSelesai`.
 * Pilihan tidak pernah memblokir misi: semua opsi mengarah ke misi yang sama.
 */
export function PilihanCerita({
  titik,
  onSelesai,
}: {
  titik: TitikPilihan
  onSelesai: (opsi: OpsiCerita) => void
}) {
  const [dipilih, setDipilih] = useState<OpsiCerita | null>(null)

  // Reset pilihan saat titik berganti (mis. pindah misi / titik lain).
  useEffect(() => {
    setDipilih(null)
  }, [titik.misi, titik.id])

  return (
    <section className="aia-card" aria-label="Pilihan cerita">
      <span className="aia-kicker">Pilihan</span>
      <p style={{ margin: '0 0 12px' }}>{titik.situasi}</p>
      {dipilih ? (
        <>
          <p style={{ margin: '0 0 12px' }}>{dipilih.akibat}</p>
          <div className="aia-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="aia-btn aia-btn-primary"
              style={{ minHeight: 44 }}
              onClick={() => {
                klik()
                onSelesai(dipilih)
              }}
            >
              Lanjut
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {titik.opsi.map((opsi) => (
            <button
              key={opsi.id}
              type="button"
              className="aia-btn aia-btn-block"
              style={{ minHeight: 44 }}
              onClick={() => {
                klik()
                setDipilih(opsi)
              }}
            >
              {opsi.teks}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
