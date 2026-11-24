// PipePuzzle — susun dan putar potongan pipa agar air mengalir dari sumber
// ke tujuan. Ketuk potongan untuk memutar 90°. Aliran dicek dengan BFS.
// Setelah 2 putaran yang tidak menambah aliran, sel perbatasan diberi
// sorotan petunjuk (kesulitan adaptif). Generik: tanpa konten misi.

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Droplets, Flag } from 'lucide-react'
import { benar, klik, koin, siram } from '../suara'

export type JenisPipa = 'lurus' | 'belok' | 'tiga' | 'silang'
export type RotasiPipa = 0 | 90 | 180 | 270
export type Arah = 'atas' | 'kanan' | 'bawah' | 'kiri'

export interface PotonganPipa {
  id: string
  jenis: JenisPipa
  rotasi: RotasiPipa
  /** Bila true, potongan tidak bisa diputar. */
  tetap?: boolean
}

export interface PipePuzzleProps {
  /** Lebar grid (N x N). */
  ukuran: number
  /** Potongan awal, urutan baris-per-baris (panjang ukuran x ukuran). */
  potongan: PotonganPipa[]
  /** Sel sumber air + sisi tempat air masuk ke sel itu. */
  awal: { baris: number; kolom: number; dari: Arah }
  /** Sel tujuan air. */
  akhir: { baris: number; kolom: number }
  /** Bila true, sorotan petunjuk muncul lebih cepat (setelah 1 putaran gagal). */
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda: panggilan selesai ditunda sampai lanjut. */
  terjeda?: boolean
  onSelesai: () => void
  onPutar?: (id: string, rotasiBaru: RotasiPipa) => void
}

// Sisi: 0 atas, 1 kanan, 2 bawah, 3 kiri.
const ARAH_INDEX: Record<Arah, number> = { atas: 0, kanan: 1, bawah: 2, kiri: 3 }
const DELTA: [number, number][] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
]

/** Sisi yang terhubung pada satu potongan menurut jenis + rotasi. */
export function sisiPipa(jenis: JenisPipa, rotasi: RotasiPipa): Set<number> {
  const r = (rotasi / 90) % 4
  switch (jenis) {
    case 'lurus':
      return new Set(r % 2 === 0 ? [1, 3] : [0, 2])
    case 'belok':
      return new Set([(0 + r) % 4, (1 + r) % 4])
    case 'tiga':
      return new Set([(0 + r) % 4, (1 + r) % 4, (3 + r) % 4])
    case 'silang':
      return new Set([0, 1, 2, 3])
  }
}

/** Cek aliran air (BFS) dari sumber ke tujuan. */
export function cekAliran(
  ukuran: number,
  potongan: PotonganPipa[],
  awal: { baris: number; kolom: number; dari: Arah },
  akhir: { baris: number; kolom: number },
): { terhubung: boolean; basah: boolean[] } {
  const basah: boolean[] = new Array(ukuran * ukuran).fill(false)
  const idx = (b: number, k: number) => b * ukuran + k
  const antri: { sel: number; masuk: number }[] = [
    { sel: idx(awal.baris, awal.kolom), masuk: ARAH_INDEX[awal.dari] },
  ]
  const dikunjungi = new Set<string>()
  while (antri.length > 0) {
    const langkah = antri.shift()
    if (!langkah) break
    const kunci = `${langkah.sel}:${langkah.masuk}`
    if (dikunjungi.has(kunci)) continue
    dikunjungi.add(kunci)
    const pot = potongan[langkah.sel]
    if (!pot) continue
    const sisi = sisiPipa(pot.jenis, pot.rotasi)
    if (!sisi.has(langkah.masuk)) continue
    basah[langkah.sel] = true
    const b = Math.floor(langkah.sel / ukuran)
    const k = langkah.sel % ukuran
    for (const s of sisi) {
      if (s === langkah.masuk) continue
      const [db, dk] = DELTA[s]
      const nb = b + db
      const nk = k + dk
      if (nb < 0 || nb >= ukuran || nk < 0 || nk >= ukuran) continue
      antri.push({ sel: idx(nb, nk), masuk: (s + 2) % 4 })
    }
  }
  return { terhubung: basah[idx(akhir.baris, akhir.kolom)], basah }
}

/**
 * Acak rotasi potongan (kecuali yang tetap). Puzzle tetap bisa
 * diselesaikan karena hanya rotasinya yang diubah.
 */
export function acakRotasiPotongan(potongan: PotonganPipa[]): PotonganPipa[] {
  const pilihan: RotasiPipa[] = [0, 90, 180, 270]
  return potongan.map((p) =>
    p.tetap ? p : { ...p, rotasi: pilihan[Math.floor(Math.random() * 4)] as RotasiPipa },
  )
}

const UJUNG: [number, number][] = [
  [20, 2],
  [38, 20],
  [20, 38],
  [2, 20],
]

function PipaSvg({ jenis, rotasi, basah }: { jenis: JenisPipa; rotasi: RotasiPipa; basah: boolean }) {
  const sisi = sisiPipa(jenis, rotasi)
  const warna = basah ? '#2563eb' : '#64748b'
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      {Array.from(sisi).map((s) => (
        <line
          key={s}
          x1={20}
          y1={20}
          x2={UJUNG[s][0]}
          y2={UJUNG[s][1]}
          stroke={warna}
          strokeWidth={7}
          strokeLinecap="round"
        />
      ))}
      <circle cx={20} cy={20} r={5} fill={warna} />
    </svg>
  )
}

export function PipePuzzle({
  ukuran,
  potongan,
  awal,
  akhir,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onSelesai,
  onPutar,
}: PipePuzzleProps) {
  const [daftar, setDaftar] = useState(potongan)
  const [gagal, setGagal] = useState(0)
  const selesaiRef = useRef(false)
  const basahHitungRef = useRef(-1)
  const timerRef = useRef<number | null>(null)
  // Jeda: panggilan selesai ditunda selama terjeda (ref supaya callback
  // timeout membaca nilai terbaru).
  const terjedaRef = useRef(false)
  useEffect(() => { terjedaRef.current = terjeda }, [terjeda])

  useEffect(() => {
    setDaftar(potongan)
    setGagal(0)
    selesaiRef.current = false
    basahHitungRef.current = -1
  }, [potongan])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const { terhubung, basah } = useMemo(
    () => cekAliran(ukuran, daftar, awal, akhir),
    [ukuran, daftar, awal, akhir],
  )

  useEffect(() => {
    if (terhubung && !selesaiRef.current) {
      selesaiRef.current = true
      siram()
      benar()
      koin()
      // Selesai ditunda selama jeda: bila jeda aktif saat timer habis,
      // jadwalkan ulang tiap 100 ms sampai jeda selesai.
      const jadwalkan = (ms: number) => {
        timerRef.current = window.setTimeout(() => {
          if (terjedaRef.current) { jadwalkan(100); return }
          onSelesai()
        }, ms)
      }
      jadwalkan(700)
    }
  }, [terhubung, onSelesai])

  // Sel perbatasan: belum basah tapi bersebelahan dengan sel basah.
  const perbatasan = useMemo(() => {
    const hasil = new Set<number>()
    for (let i = 0; i < basah.length; i += 1) {
      if (!basah[i]) continue
      const b = Math.floor(i / ukuran)
      const k = i % ukuran
      for (const [db, dk] of DELTA) {
        const nb = b + db
        const nk = k + dk
        if (nb < 0 || nb >= ukuran || nk < 0 || nk >= ukuran) continue
        const j = nb * ukuran + nk
        if (!basah[j]) hasil.add(j)
      }
    }
    return hasil
  }, [basah, ukuran])

  const ambangPetunjuk = modeSatuKetukan ? 1 : 2
  const tampilPetunjuk = gagal >= ambangPetunjuk && !terhubung

  const putar = (id: string) => {
    if (disabled || selesaiRef.current) return
    const baru = daftar.map((p) => {
      if (p.id !== id || p.tetap) return p
      return { ...p, rotasi: ((p.rotasi + 90) % 360) as RotasiPipa }
    })
    const diputar = baru.find((p) => p.id === id)
    if (!diputar || diputar.rotasi === daftar.find((p) => p.id === id)?.rotasi) return
    const hasil = cekAliran(ukuran, baru, awal, akhir)
    const hitungBaru = hasil.basah.filter(Boolean).length
    if (basahHitungRef.current === -1) {
      basahHitungRef.current = cekAliran(ukuran, daftar, awal, akhir).basah.filter(Boolean).length
    }
    if (hitungBaru <= basahHitungRef.current) setGagal((g) => g + 1)
    basahHitungRef.current = hitungBaru
    onPutar?.(id, diputar.rotasi)
    klik()
    setDaftar(baru)
  }

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-pipa-sel { position: relative; aspect-ratio: 1; min-width: 56px; min-height: 56px; padding: 4px; border-radius: 10px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); cursor: pointer; }
        .aia-gi-pipa-sel.basah { background: color-mix(in srgb, #2563eb 14%, var(--card, #fff)); }
        .aia-gi-pipa-sel.tetap { cursor: default; opacity: .75; }
        .aia-gi-pipa-petunjuk { outline: 3px solid #b45309; outline-offset: 1px; animation: aia-gi-denyut 1s ease-in-out infinite alternate; }
        @keyframes aia-gi-denyut { from { outline-color: #b45309; } to { outline-color: #f59e0b; } }
        .aia-gi-pipa-tanda { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; background: var(--card, #fff); border: 1px solid var(--line, #e5e7eb); display: flex; align-items: center; justify-content: center; color: #2563eb; }
        .aia-gi-pipa-tanda svg { width: 12px; height: 12px; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-pipa-petunjuk { animation: none; } }
      `}</style>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${ukuran}, minmax(0, 1fr))`,
          gap: 6,
        }}
        role="group"
        aria-label="Teka-teki pipa: ketuk potongan untuk memutar"
      >
        {daftar.map((p, i) => {
          const isAwal = i === awal.baris * ukuran + awal.kolom
          const isAkhir = i === akhir.baris * ukuran + akhir.kolom
          return (
            <button
              key={p.id}
              type="button"
              className={`aia-gi-pipa-sel${basah[i] ? ' basah' : ''}${p.tetap ? ' tetap' : ''}${tampilPetunjuk && perbatasan.has(i) ? ' aia-gi-pipa-petunjuk' : ''}`}
              disabled={disabled || p.tetap || selesaiRef.current}
              aria-label={`Pipa ${p.jenis}, rotasi ${p.rotasi} derajat${p.tetap ? ', tidak bisa diputar' : ''}${basah[i] ? ', ada air' : ''}${isAwal ? ', sumber air' : ''}${isAkhir ? ', tujuan air' : ''}`}
              onClick={() => putar(p.id)}
            >
              <PipaSvg jenis={p.jenis} rotasi={p.rotasi} basah={basah[i]} />
              {isAwal && (
                <span className="aia-gi-pipa-tanda" aria-hidden="true">
                  <Droplets aria-hidden="true" />
                </span>
              )}
              {isAkhir && (
                <span className="aia-gi-pipa-tanda" aria-hidden="true">
                  <Flag aria-hidden="true" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="aia-muted" style={{ textAlign: 'center', margin: 0 }}>
        {terhubung
          ? 'Air mengalir sampai tujuan!'
          : tampilPetunjuk
            ? 'Petunjuk: perhatikan potongan yang berdenyut di tepi aliran air.'
            : 'Ketuk potongan pipa untuk memutarnya sampai air mengalir ke bendera.'}
      </p>
    </div>
  )
}
