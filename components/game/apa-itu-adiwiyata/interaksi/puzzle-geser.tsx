// PuzzleGeser — grid 3×3 berisi 9 potongan yang diacak; ketuk 2 petak
// untuk menukar isinya. Saat urutan grid sama dengan urutan benar
// (urutan array `potongan`), puzzle selesai + bunyi benar. Petak ≥56px.
// Mode satu-ketukan: tiap potongan menampilkan nomor urutan benarnya
// sebagai petunjuk.
// TUTORIAL: saat puzzle pertama kali muncul di perangkat, kartu panduan
// 3 langkah tampil menutupi grid (overlay) sampai ditutup — penanda
// disimpan di localStorage kunci sendiri ('aia-tutorial-puzzle-dilihat'),
// BUKAN field save. Tombol "?" di baris statistik membuka lagi kapan saja.
// ATURAN SKOR (0–100): mulai dari 100, dikurangi 5 poin untuk setiap
// pertukaran di atas jumlah minimal yang dibutuhkan untuk menyelesaikan
// susunan acak awal (jumlah minimal = 9 − jumlah siklus permutasi).
// Contoh: bila susunan awal butuh minimal 4 tukar dan pemain selesai
// dalam 6 tukar, skor = 100 − 5 × (6 − 4) = 90. Minimal 0.
// Generik: tidak ada konten misi.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { benar, getar, klik, koin } from '../suara'
import { acak, clamp, useKurangiAnimasi } from './util'

export interface PotonganPuzzle {
  id: string
  konten: ReactNode
  label: string
}

export interface PuzzleGeserProps {
  potongan: PotonganPuzzle[]
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda. Komponen ini tidak punya jam sendiri,
   *  jadi prop diterima saja. */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

/** Jumlah tukar minimal untuk mengurutkan permutasi (n − jumlah siklus). */
function tukarMinimal(urutan: number[]): number {
  const n = urutan.length
  const dikunjungi = new Array<boolean>(n).fill(false)
  let siklus = 0
  for (let i = 0; i < n; i += 1) {
    if (dikunjungi[i]) continue
    siklus += 1
    let j = i
    while (!dikunjungi[j]) {
      dikunjungi[j] = true
      j = urutan[j]
    }
  }
  return n - siklus
}

/** Acak urutan 0..n-1, dijamin belum terselesaikan. */
function acakUrutan(n: number): number[] {
  const u = acak(Array.from({ length: n }, (_, i) => i))
  if (n < 2) return u
  if (u.every((v, i) => v === i)) {
    const tmp = u[0]
    u[0] = u[1]
    u[1] = tmp
  }
  return u
}

/** Penanda "tutorial puzzle sudah dilihat" per perangkat — kunci
 *  localStorage sendiri, BUKAN field save (skema save tidak berubah). */
const KUNCI_TUTORIAL_PUZZLE = 'aia-tutorial-puzzle-dilihat'

export function PuzzleGeser({
  potongan,
  modeSatuKetukan = false,
  disabled = false,
  onSelesai,
}: PuzzleGeserProps) {
  const kurangi = useKurangiAnimasi()
  const kunciPotongan = potongan.map((p) => p.id).join(',')
  const [urutan, setUrutan] = useState<number[]>(() => acakUrutan(potongan.length))
  const [dipilih, setDipilih] = useState<number | null>(null)
  const [tukar, setTukar] = useState(0)
  const [selesai, setSelesai] = useState(false)
  // Tutorial pertama kali: mulai tertutup supaya render server dan
  // render pertama klien sama (tanpa mismatch hidrasi); dibuka lewat
  // efek setelah mount bila penanda localStorage belum ada.
  const [tutorialTerbuka, setTutorialTerbuka] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KUNCI_TUTORIAL_PUZZLE) !== '1') setTutorialTerbuka(true)
    } catch {
      setTutorialTerbuka(true)
    }
  }, [])

  const tutupTutorial = () => {
    klik()
    try {
      window.localStorage.setItem(KUNCI_TUTORIAL_PUZZLE, '1')
    } catch {
      // localStorage tidak tersedia (mode privat dsb.) — tutorial tetap
      // ditutup untuk sesi ini; tampil lagi di kunjungan berikutnya.
    }
    setTutorialTerbuka(false)
  }

  const bukaTutorial = () => {
    klik()
    setTutorialTerbuka(true)
  }

  const selesaiRef = useRef(false)
  const minTukarRef = useRef(tukarMinimal(urutan))
  const onSelesaiRef = useRef(onSelesai)
  onSelesaiRef.current = onSelesai

  // Set potongan baru = acak ulang dan mulai dari nol lagi.
  useEffect(() => {
    const u = acakUrutan(potongan.length)
    setUrutan(u)
    minTukarRef.current = tukarMinimal(u)
    setDipilih(null)
    setTukar(0)
    setSelesai(false)
    selesaiRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciPotongan])

  const ketukPetak = (posisi: number) => {
    if (disabled || selesaiRef.current) return
    if (dipilih === null) {
      klik()
      setDipilih(posisi)
      return
    }
    if (dipilih === posisi) {
      setDipilih(null)
      return
    }
    const baru = [...urutan]
    const tmp = baru[dipilih]
    baru[dipilih] = baru[posisi]
    baru[posisi] = tmp
    const jumlahTukar = tukar + 1
    setTukar(jumlahTukar)
    setUrutan(baru)
    setDipilih(null)
    klik()
    getar(10)
    if (baru.every((v, i) => v === i)) {
      selesaiRef.current = true
      const skor = clamp(100 - 5 * Math.max(0, jumlahTukar - minTukarRef.current), 0, 100)
      benar()
      koin()
      setSelesai(true)
      onSelesaiRef.current(skor)
    }
  }

  return (
    <div className="aia-stack" style={{ position: 'relative' }}>
      <style>{`
        .aia-gi-puzzle-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .aia-gi-puzzle-petak { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 84px; min-width: 56px; padding: 8px 4px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 700; font-size: 14px; cursor: pointer; touch-action: manipulation; transition: transform .15s ease, outline .15s ease; }
        .aia-gi-puzzle-petak.dipilih { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; transform: scale(1.04); }
        @media (hover: hover) { .aia-gi-puzzle-petak:hover:not(:disabled) { transform: scale(1.04); box-shadow: 0 4px 14px rgba(0,0,0,.12); } }
        .aia-gi-puzzle-petak:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-puzzle-nomor { font-size: 11px; color: var(--green, #2f7d4f); font-weight: 800; }
        .aia-gi-puzzle-demo { display: flex; gap: 8px; margin: 8px 0 2px; }
        .aia-gi-puzzle-demo-petak { flex: 1; min-height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 800; font-size: 16px; }
        .aia-gi-puzzle-demo-kiri { animation: aia-puzzle-demo-kiri 2.4s ease-in-out infinite alternate; }
        .aia-gi-puzzle-demo-kanan { animation: aia-puzzle-demo-kanan 2.4s ease-in-out infinite alternate; }
        @keyframes aia-puzzle-demo-kiri { from { transform: translateX(0); } to { transform: translateX(calc(100% + 8px)); } }
        @keyframes aia-puzzle-demo-kanan { from { transform: translateX(0); } to { transform: translateX(calc(-100% - 8px)); } }
        @media (prefers-reduced-motion: reduce) { .aia-gi-puzzle-petak { transition: none; } .aia-gi-puzzle-petak.dipilih { transform: none; } .aia-gi-puzzle-demo-kiri, .aia-gi-puzzle-demo-kanan { animation: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres puzzle">
        <span className="aia-stat">Pertukaran {tukar}</span>
        <span className="aia-stat">Minimal {minTukarRef.current} tukar</span>
        <button
          type="button"
          className="aia-icon-btn"
          style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 18 }}
          onClick={bukaTutorial}
          aria-label="Buka panduan puzzle"
        >
          ?
        </button>
      </div>

      <div className="aia-gi-puzzle-grid" role="group" aria-label="Puzzle geser 3 kali 3">
        {urutan.map((indeksPotongan, posisi) => {
          const p = potongan[indeksPotongan]
          if (!p) return null
          return (
            <button
              key={posisi}
              type="button"
              className={`aia-gi-puzzle-petak${dipilih === posisi ? ' dipilih' : ''}`}
              disabled={disabled || selesai || tutorialTerbuka}
              aria-pressed={dipilih === posisi}
              aria-label={`Petak ${posisi + 1}: ${p.label}${dipilih === posisi ? ', sudah dipilih, ketuk petak lain untuk menukar' : ''}`}
              onClick={() => ketukPetak(posisi)}
            >
              {p.konten}
              <span>{p.label}</span>
              {modeSatuKetukan && (
                <span className="aia-gi-puzzle-nomor">Urutan benar: {indeksPotongan + 1}</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="aia-muted" style={{ margin: 0, textAlign: 'center' }}>
        {selesai
          ? `Selesai dalam ${tukar} pertukaran!`
          : kurangi
            ? 'Ketuk dua petak untuk menukar isinya sampai urut.'
            : 'Ketuk dua petak untuk menukar isinya sampai urut!'}
      </p>

      {tutorialTerbuka && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Panduan puzzle geser"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.45)',
            borderRadius: 12,
          }}
        >
          <section
            className="aia-card"
            style={{ width: '100%', maxWidth: 420, margin: 'auto', maxHeight: '100%', overflowY: 'auto' }}
            aria-labelledby="aia-puzzle-tutorial-title"
          >
            <span className="aia-kicker">Panduan</span>
            <h3 id="aia-puzzle-tutorial-title" className="aia-section-title" style={{ marginTop: 4 }}>
              Cara menyusun puzzle
            </h3>
            <ol style={{ margin: '0 0 4px', paddingLeft: 20, fontSize: 14, lineHeight: 1.6 }}>
              <li>
                <strong>Tujuan.</strong> Susun 9 potongan jadi kalimat poster yang benar. Baca seperti buku: kiri
                ke kanan, atas ke bawah.
              </li>
              <li>
                <strong>Cara tukar.</strong> Ketuk satu petak (dapat garis hijau), lalu ketuk petak kedua — isinya
                bertukar. Ketuk petak yang sama lagi untuk batal.
                <div className="aia-gi-puzzle-demo" aria-hidden="true">
                  <span className="aia-gi-puzzle-demo-petak aia-gi-puzzle-demo-kiri">A</span>
                  <span className="aia-gi-puzzle-demo-petak aia-gi-puzzle-demo-kanan">B</span>
                </div>
              </li>
              <li>
                <strong>Strategi &amp; skor.</strong> Baca semua potongan dulu. Cari potongan awal (biasanya judul),
                dan potongan yang diakhiri titik menutup kalimat. &quot;Pertukaran&quot; = jumlah tukarmu;
                &quot;Minimal&quot; = tukar paling sedikit dari acakan awal — makin dekat ke minimal, makin tinggi
                skormu. Mentok? Ketuk &quot;Minta petunjuk Magi&quot;.
              </li>
            </ol>
            <p className="aia-muted" style={{ fontSize: 13, margin: '8px 0 0' }}>
              Mode satu-ketukan (di Profil) menampilkan nomor urutan di tiap petak.
            </p>
            <div className="aia-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="aia-btn aia-btn-primary"
                style={{ minHeight: 44 }}
                onClick={tutupTutorial}
              >
                Mengerti, mulai susun
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
