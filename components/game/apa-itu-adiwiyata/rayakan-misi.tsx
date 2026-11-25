'use client'

// Ledakan perayaan DOM — padanan tier BESAR feedback() canvas untuk layar
// yang tidak punya canvas (Pos Hijau di MisiShell, klaim Hadiah Harian).
// 28 titik (daun hijau + bintang emas) beterbangan dari tengah kartu lewat
// animasi CSS sekali jalan (0,9 detik, ease-out), tanpa JavaScript per
// frame. pointer-events: none, aria-hidden: true — hanya hiasan, hadiah
// tetap tertulis sebagai teks. prefers-reduced-motion: disembunyikan
// (lihat .aia-ledakan di apa-itu-adiwiyata.css). Kartu induk wajib
// position: relative + overflow: hidden supaya titik tidak keluar kartu.

const WARNA = ['#66bb6a', '#4e9a3d', '#8bc34a', '#ffd54a', '#ffd54a', '#aed581']

// Posisi akhir tiap titik (sudut + jarak), deterministik supaya hasil
// render stabil antar render — dihitung sekali di level modul.
const TITIK: { dx: number; dy: number; warna: string; ukuran: number; tunda: number }[] = (() => {
  let a = 20261125
  const acak = () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const daftar = []
  for (let i = 0; i < 28; i += 1) {
    const sudut = (i / 28) * Math.PI * 2 + acak() * 0.35
    const jarak = 46 + acak() * 84
    daftar.push({
      dx: Math.cos(sudut) * jarak,
      dy: Math.sin(sudut) * jarak - 24,
      warna: WARNA[i % WARNA.length],
      ukuran: 6 + acak() * 6,
      tunda: acak() * 0.12,
    })
  }
  return daftar
})()

export function RayakanMisi() {
  return (
    <div className="aia-ledakan" aria-hidden="true">
      {TITIK.map((t, i) => (
        <span
          key={i}
          // R4: tiap titik ke-4 berbentuk daun, bukan lingkaran — confetti
          // daun sesuai tema, tetap 28 titik dan 0,9 detik yang sama.
          className={`aia-ledakan-dot${i % 4 === 0 ? ' aia-ledakan-daun' : ''}`}
          style={{
            width: t.ukuran,
            height: t.ukuran,
            background: t.warna,
            animationDelay: `${t.tunda.toFixed(2)}s`,
            ['--dx' as string]: `${t.dx.toFixed(0)}px`,
            ['--dy' as string]: `${t.dy.toFixed(0)}px`,
          }}
        />
      ))}
    </div>
  )
}
