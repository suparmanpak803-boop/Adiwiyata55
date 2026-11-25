'use client'

// Layar Awal — tampil setiap kali /game dimuat (setelah gerbang nama).
// Pemain memilih: lanjutkan progres tersimpan, mulai dari awal (dengan
// konfirmasi bila sudah ada progres), atau baca Cara Bermain. Sebelum layar
// ini ada, runner langsung membuka dunia setelah nama terisi, sehingga
// pemain yang kembali tidak pernah ditawari pilihan.

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Flag, MapPin, Play, RotateCcw } from 'lucide-react'
import { CHAPTER_ORDER, CHAPTERS } from '@/lib/apa-itu-adiwiyata/chapters'
import { BAK } from '@/lib/apa-itu-adiwiyata/content/bak'
import { warnaKostum } from '@/lib/apa-itu-adiwiyata/content/toko'
import { gambarPemain, rr } from '@/lib/apa-itu-adiwiyata/gambar-pemain'
import { misiSaatIni, pemberiMisi, LOKASI_PEMBERI } from '@/lib/apa-itu-adiwiyata/misi'
import { hadiahBerikutnya, hariIniLokal } from '@/lib/apa-itu-adiwiyata/content/hadiah-harian'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { hasProgress } from '@/lib/apa-itu-adiwiyata/storage'
import { TUGAS_ORDER } from '@/lib/apa-itu-adiwiyata/types'
import { HadiahHarian } from './hadiah-harian'
import { klik, playPop } from './suara'

/**
 * Hero sampul Layar Awal (R1) — digambar ke canvas sekali saat mount,
 * tanpa aset eksternal: langit pagi + matahari kiri atas, chibi siswa,
 * Magi, dan 5 bak pilah warna sistem SMAN 55. Label bak ditulis di pil
 * putih dengan teks gelap (kontras ≥4,5:1), bukan putih di atas warna bak.
 */
function HeroAwal() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = 640
    const H = 360
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    // Langit pagi.
    const langit = ctx.createLinearGradient(0, 0, 0, 250)
    langit.addColorStop(0, '#a8d8f0')
    langit.addColorStop(1, '#eaf7d9')
    ctx.fillStyle = langit
    ctx.fillRect(0, 0, W, 250)
    // Matahari + glow di kiri atas (sesuai art-direction-brief).
    const glow = ctx.createRadialGradient(84, 48, 8, 84, 48, 120)
    glow.addColorStop(0, 'rgba(255,243,196,0.95)')
    glow.addColorStop(1, 'rgba(255,243,196,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 230, 190)
    ctx.fillStyle = '#ffd54a'
    ctx.beginPath()
    ctx.arc(84, 48, 26, 0, Math.PI * 2)
    ctx.fill()
    // Awan.
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    for (const [cx, cy, s] of [
      [300, 62, 1],
      [470, 96, 0.8],
      [210, 116, 0.7],
    ] as const) {
      ctx.beginPath()
      ctx.ellipse(cx, cy, 34 * s, 12 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(cx + 22 * s, cy + 4 * s, 24 * s, 10 * s, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    // Rumput + bunga kecil.
    ctx.fillStyle = '#7cb85c'
    ctx.fillRect(0, 250, W, 110)
    ctx.fillStyle = '#ffffff'
    for (const [fx, fy] of [
      [40, 340],
      [600, 338],
      [330, 344],
      [520, 352],
    ] as const) {
      ctx.beginPath()
      ctx.arc(fx, fy, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    // 5 bak pilah di kanan (zona chibi di kiri tetap kosong).
    BAK.forEach((b, i) => {
      const x = 170 + i * 94
      const y = 232
      ctx.fillStyle = b.warna
      rr(ctx, x, y, 84, 62, 8)
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(x + 3, y + 3, 78, 10)
      ctx.fillStyle = '#ffffff'
      rr(ctx, x - 4, y + 68, 92, 22, 11)
      ctx.fill()
      ctx.fillStyle = '#1c2b12'
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(b.nama, x + 42, y + 79)
    })
    // Chibi siswa di kiri, Magi di sampingnya.
    ctx.save()
    ctx.translate(88, 296)
    ctx.scale(2.1, 2.1)
    gambarPemain(
      ctx,
      { x: 0, y: 0, arah: 'bawah', bergerak: false, fase: 0 },
      false,
      warnaKostum(null),
      'siswa',
    )
    ctx.restore()
    ctx.fillStyle = '#8bc34a'
    ctx.beginPath()
    ctx.ellipse(148, 332, 15, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#212121'
    ctx.beginPath()
    ctx.arc(143, 330, 1.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(152, 330, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }, [])
  return (
    <canvas
      ref={ref}
      className="aia-hero-kanvas"
      role="img"
      aria-label="Sampul game: pagi di Gerbang sekolah, tokoh chibi berdiri di depan lima bak pilah warna-warni, Magi si larva maggot di sampingnya."
    />
  )
}

export function LayarAwal({
  onLanjutkan,
  onMulaiBaru,
  onBukaPanduan,
}: {
  /** Masuk dunia dengan progres yang ada (atau mulai permainan baru yang masih kosong). */
  onLanjutkan: () => void
  /** Hapus progres tersimpan (START_NEW) lalu masuk dunia dari nol. */
  onMulaiBaru: () => void
  /** Buka panduan Cara Bermain. */
  onBukaPanduan: () => void
}) {
  const { save, dispatch } = useCampaign()
  const [tanyaBaru, setTanyaBaru] = useState(false)
  // Hadiah Harian di Layar Awal: tampil bila belum diklaim hari ini, di
  // bawah tombol Lanjutkan/Mulai. Klaim bersifat opsional — tombol "Lewati"
  // selalu ada, dan kartu tetap menampilkan hasil bila baru saja diklaim
  // (supaya pesan "Kamu mendapat ..." tidak hilang sebelum pemain masuk).
  const [tampilkanHadiah, setTampilkanHadiah] = useState(true)
  const [klaimSelesai, setKlaimSelesai] = useState(false)
  const { bisaKlaim } = hadiahBerikutnya(save.hadiahTerakhir ?? null, save.hadiahSiklus ?? 1, hariIniLokal())
  const progres = hasProgress(save)
  const misiUtama = CHAPTER_ORDER.filter((id) => save.chapters[id].done).length
  const misiKader = TUGAS_ORDER.filter((id) => save.tugas[id].done).length
  // R8: satu tujuan saat kembali main — misi utama berikutnya (bukan
  // daftar panjang). Bila semua misi utama selesai, sorotan jadi
  // perayaan singkat.
  const berikut = misiSaatIni(save)
  const nomorBerikut = berikut ? CHAPTER_ORDER.indexOf(berikut) + 1 : 0
  const pemberiBerikut = berikut ? pemberiMisi(berikut) : undefined
  const tahapBerikut = berikut ? save.chapters[berikut].stages.filter((s) => s.status === 'done').length : 0
  // Pemilih karakter hanya untuk permainan baru: pemain lama (ada progres
  // atau jenis kelamin sudah tersimpan) langsung ke tombol Lanjutkan/Mulai.
  // Tombol Mulai terkunci sampai karakter dipilih.
  const tampilPemilih = !progres
  const perluPilihKarakter = !progres && save.jenisKelamin === null
  const PILIHAN_KARAKTER = [
    {
      id: 'siswa' as const,
      nama: 'Siswa',
      deskripsi: 'Seragam putih, dasi abu-abu, celana panjang abu-abu.',
    },
    {
      id: 'siswi' as const,
      nama: 'Siswi',
      deskripsi: 'Seragam putih, dasi abu-abu, rok abu-abu.',
    },
  ]

  return (
    <section className="aia-card aia-layar-awal" aria-labelledby="aia-awal-title">
      <HeroAwal />
      <span className="aia-kicker">Kampanye · Adiwiyata 55</span>
      <h2 id="aia-awal-title" className="aia-judul-hero">
        Apa itu Adiwiyata?
      </h2>
      <p className="aia-muted">
        Kamu siswa baru yang ditugaskan menjadikan sekolahmu Adiwiyata. Jelajahi sekolah, temui warga sekolah,
        dan selesaikan 6 misi bersama Magi si larva maggot. Tidak ada yang benar-benar sampah.
      </p>
      {progres ? (
        <section className="aia-card aia-spotlight" aria-label="Lanjutkan petualanganmu" style={{ marginTop: 12 }}>
          <span className="aia-kicker">Lanjutkan petualanganmu</span>
          {berikut ? (
            <>
              <strong style={{ fontSize: 17, lineHeight: 1.4 }}>
                <Flag aria-hidden="true" style={{ width: 16, height: 16, verticalAlign: -2 }} /> Lanjutkan: Misi{' '}
                {nomorBerikut} — {CHAPTERS[berikut].judul}
              </strong>
              <p className="aia-muted" style={{ marginBottom: 0 }}>
                {pemberiBerikut && (
                  <>
                    <MapPin aria-hidden="true" style={{ width: 14, height: 14, verticalAlign: -2 }} /> Temui{' '}
                    {pemberiBerikut.nama} di {LOKASI_PEMBERI[pemberiBerikut.id] ?? 'sekolah'}
                    {tahapBerikut > 0 ? ` · Tahap ${tahapBerikut}/3 selesai` : ' · Tahap 0/3'}
                    {'. '}
                  </>
                )}
                Misi utama {misiUtama}/6 · Misi Tambahan {misiKader}/8 · {save.coins} Koin Hijau
              </p>
            </>
          ) : (
            <>
              <strong style={{ fontSize: 17, lineHeight: 1.4 }}>
                Semua misi utama selesai — kamu Pahlawan Adiwiyata!
              </strong>
              <p className="aia-muted" style={{ marginBottom: 0 }}>
                Misi utama 6/6 · Misi Tambahan {misiKader}/8 · {save.coins} Koin Hijau
              </p>
            </>
          )}
        </section>
      ) : (
        <p className="aia-muted" role="status">
          Misi pertamamu: Misi 1 — {CHAPTERS.gerbang.judul}. Temui Pak Plastik di Gerbang.
        </p>
      )}
      {tampilPemilih && (
        <div style={{ marginTop: 4 }}>
          <p className="aia-label" id="aia-pilih-karakter-label" style={{ marginBottom: 8 }}>
            Pilih karaktermu
          </p>
          <div
            role="group"
            aria-labelledby="aia-pilih-karakter-label"
            style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}
          >
            {PILIHAN_KARAKTER.map((pilihan) => {
              const dipilih = save.jenisKelamin === pilihan.id
              return (
                <button
                  key={pilihan.id}
                  type="button"
                  className="aia-btn"
                  aria-pressed={dipilih}
                  style={{
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    minHeight: 44,
                    textAlign: 'left',
                    borderWidth: 2,
                    borderColor: dipilih ? '#2e7d32' : undefined,
                    background: dipilih ? 'rgba(46,125,50,0.08)' : undefined,
                  }}
                  onClick={() => {
                    klik()
                    dispatch({ type: 'PILIH_KARAKTER', jenisKelamin: pilihan.id })
                  }}
                >
                  <strong>
                    {pilihan.nama}
                    {dipilih && <span className="aia-chip done"> Dipilih</span>}
                  </strong>
                  <span className="aia-muted" style={{ fontWeight: 400 }}>
                    {pilihan.deskripsi}
                  </span>
                </button>
              )
            })}
          </div>
          {perluPilihKarakter && (
            <p className="aia-muted" role="status" style={{ marginTop: 8 }}>
              Pilih karakter dulu untuk mulai.
            </p>
          )}
        </div>
      )}
      <div className="aia-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {progres ? (
          <button
            type="button"
            className="aia-btn aia-btn-aksi aia-btn-block"
            style={{ minHeight: 48 }}
            onClick={() => {
              playPop()
              onLanjutkan()
            }}
          >
            <Play aria-hidden="true" /> Lanjutkan Petualangan
          </button>
        ) : (
          <button
            type="button"
            className="aia-btn aia-btn-aksi aia-btn-block"
            style={{ minHeight: 48 }}
            disabled={perluPilihKarakter}
            onClick={() => {
              playPop()
              onLanjutkan()
            }}
          >
            <Play aria-hidden="true" /> Mulai Petualangan
          </button>
        )}
        {progres && (
          <button
            type="button"
            className="aia-btn aia-btn-ghost aia-btn-block"
            style={{ minHeight: 44 }}
            onClick={() => {
              klik()
              setTanyaBaru(true)
            }}
          >
            <RotateCcw aria-hidden="true" /> Mulai dari Awal
          </button>
        )}
        <button
          type="button"
          className="aia-btn aia-btn-ghost aia-btn-block"
          style={{ minHeight: 44 }}
          onClick={() => {
            klik()
            onBukaPanduan()
          }}
        >
          <BookOpen aria-hidden="true" /> Cara Bermain
        </button>
      </div>

      {tampilkanHadiah && (bisaKlaim || klaimSelesai) && (
        <div style={{ marginTop: 12 }}>
          <HadiahHarian onLewati={() => setTampilkanHadiah(false)} onKlaim={() => setKlaimSelesai(true)} />
        </div>
      )}

      {tanyaBaru && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mulai dari awal"
          style={{
            position: 'fixed',
            inset: 0,
            // B-6: konfirmasi mulai baru (65) di atas panduan (60), di bawah Jeda (70).
            zIndex: 65,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.5)',
          }}
        >
          <section className="aia-card" style={{ width: '100%', maxWidth: 420 }}>
            <h3 className="aia-section-title" style={{ marginTop: 0 }}>
              Mulai dari awal?
            </h3>
            <p className="aia-muted">Mulai dari awal akan menghapus progresmu yang tersimpan. Yakin?</p>
            <div className="aia-actions">
              <button
                type="button"
                className="aia-btn aia-btn-danger"
                style={{ minHeight: 44 }}
                onClick={() => {
                  playPop()
                  setTanyaBaru(false)
                  onMulaiBaru()
                }}
              >
                Ya, mulai baru
              </button>
              <button
                type="button"
                className="aia-btn aia-btn-ghost"
                style={{ minHeight: 44 }}
                onClick={() => {
                  klik()
                  setTanyaBaru(false)
                }}
              >
                Batal
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
