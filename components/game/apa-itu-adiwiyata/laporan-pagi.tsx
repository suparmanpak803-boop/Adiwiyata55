'use client'

// Laporan Pagi — ringkasan perubahan Dunia Hidup sejak kunjungan terakhir.
// Ditampilkan sekali per sesi oleh runner (index.tsx) setelah save terhidrasi,
// hanya bila majukanDunia() menghasilkan peristiwa (hari baru + ada perubahan).
// Tidak tampil bila peristiwa kosong. Bisa ditutup, 1x per sesi.

import { Bug, Droplets, Sprout, Sun, Trash2, type LucideIcon } from 'lucide-react'
import { CHAPTER_ORDER, CHAPTERS } from '@/lib/apa-itu-adiwiyata/chapters'
import type { JenisPeristiwaDunia, PeristiwaDunia } from '@/lib/apa-itu-adiwiyata/dunia-hidup'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { LOKASI_PEMBERI, misiSaatIni, pemberiMisi } from '@/lib/apa-itu-adiwiyata/misi'

const IKON_PERISTIWA: Record<JenisPeristiwaDunia, LucideIcon> = {
  tumbuh: Sprout,
  layu: Droplets,
  lapar: Bug,
  sampah: Trash2,
}

export function LaporanPagi({
  peristiwa,
  onTutup,
}: {
  peristiwa: PeristiwaDunia[]
  onTutup: () => void
}) {
  // R8: satu tujuan hari ini di bawah kabar pagi — misi utama berikutnya
  // (bukan daftar). Bila semua misi utama selesai, ajak ke Misi Tambahan.
  // useCampaign di atas early return (aturan hooks).
  const { save } = useCampaign()
  if (peristiwa.length === 0) return null
  const berikut = misiSaatIni(save)
  const pemberi = berikut ? pemberiMisi(berikut) : undefined
  return (
    <section className="aia-card" role="status" aria-label="Laporan pagi">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sun aria-hidden="true" />
        <h2 className="aia-section-title" style={{ margin: 0 }}>
          Laporan Pagi
        </h2>
      </div>
      <p className="aia-muted" style={{ marginTop: 4 }}>
        Selamat pagi! Ini kabar dari sekolah sejak kunjunganmu terakhir.
      </p>
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 8 }}>
        {peristiwa.map((p, i) => {
          const Ikon = IKON_PERISTIWA[p.jenis]
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ikon aria-hidden="true" />
              <span>{p.teks}</span>
            </li>
          )
        })}
      </ul>
      <p style={{ margin: '12px 0 0', fontWeight: 700 }}>
        {berikut
          ? `Satu tujuan hari ini: Misi ${CHAPTER_ORDER.indexOf(berikut) + 1} — ${CHAPTERS[berikut].judul}${
              pemberi ? ` (temui ${pemberi.nama} di ${LOKASI_PEMBERI[pemberi.id] ?? 'sekolah'})` : ''
            }.`
          : 'Semua misi utama selesai! Misi Tambahan masih menunggumu di dunia.'}
      </p>
      <div className="aia-actions" style={{ marginTop: 12 }}>
        <button type="button" className="aia-btn aia-btn-aksi" style={{ minHeight: 44 }} onClick={onTutup}>
          Siap, mulai hari ini
        </button>
      </div>
    </section>
  )
}
