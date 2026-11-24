// GambarGrafik — diagram batang dengan semua batang mulai 0; tiap batang
// punya tombol naik/turun (langkah 1) untuk mengatur tingginya. Tombol
// "Periksa" mengecek semua batang (benar bila sama persis dengan
// nilaiBenar); batang yang benar terkunci hijau. Bila semua benar,
// selesai. Nilai tiap batang tampil sebagai angka.
// ATURAN SKOR (0–100): persen batang yang benar pada percobaan pertama,
// dikurangi 5 poin untuk setiap percobaan tambahan. Contoh: 4 batang,
// 3 benar di percobaan pertama lalu diperbaiki dan semua benar di
// percobaan ke-2 → skor = 75 − 5 = 70. Minimal 0.
// Mode satu-ketukan: langkah naik/turun tetap 1, tapi tombol lebih besar.
// Generik: tidak ada konten misi.

'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { benar, getar, klik, koin, salah } from '../suara'
import { clamp } from './util'

export interface BatangGrafik {
  id: string
  label: string
  nilaiBenar: number
  maks: number
  satuan?: string
}

export interface GambarGrafikProps {
  batang: BatangGrafik[]
  modeSatuKetukan?: boolean
  disabled?: boolean
  onSelesai: (skor: number) => void
}

export function GambarGrafik({
  batang,
  modeSatuKetukan = false,
  disabled = false,
  onSelesai,
}: GambarGrafikProps) {
  const kunciBatang = batang.map((b) => b.id).join(',')
  const [nilai, setNilai] = useState<Record<string, number>>(() =>
    Object.fromEntries(batang.map((b) => [b.id, 0])),
  )
  const [terkunci, setTerkunci] = useState<Set<string>>(new Set())
  const [percobaan, setPercobaan] = useState(0)
  const [umpan, setUmpan] = useState<string | null>(null)
  const [selesai, setSelesai] = useState(false)

  const selesaiRef = useRef(false)
  const benarPertamaRef = useRef<number | null>(null)
  const nilaiRef = useRef(nilai)
  nilaiRef.current = nilai
  const terkunciRef = useRef(terkunci)
  terkunciRef.current = terkunci
  const onSelesaiRef = useRef(onSelesai)
  onSelesaiRef.current = onSelesai

  // Set batang baru = mulai dari nol lagi.
  useEffect(() => {
    setNilai(Object.fromEntries(batang.map((b) => [b.id, 0])))
    setTerkunci(new Set())
    setPercobaan(0)
    setUmpan(null)
    setSelesai(false)
    selesaiRef.current = false
    benarPertamaRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciBatang])

  const ubahNilai = (id: string, delta: number) => {
    if (disabled || selesaiRef.current) return
    const b = batang.find((x) => x.id === id)
    if (!b || terkunciRef.current.has(id)) return
    klik()
    const sekarang = nilaiRef.current[id] ?? 0
    setNilai((v) => ({ ...v, [id]: clamp(sekarang + delta, 0, b.maks) }))
  }

  const periksa = () => {
    if (disabled || selesaiRef.current) return
    const jumlahPercobaan = percobaan + 1
    setPercobaan(jumlahPercobaan)
    const benarKini = batang.filter((b) => (nilaiRef.current[b.id] ?? 0) === b.nilaiBenar)
    if (benarPertamaRef.current === null) {
      benarPertamaRef.current = benarKini.length
    }
    const terkunciBaru = new Set(terkunciRef.current)
    benarKini.forEach((b) => terkunciBaru.add(b.id))
    setTerkunci(terkunciBaru)
    if (benarKini.length === batang.length) {
      const persenPertama =
        batang.length > 0 ? ((benarPertamaRef.current ?? 0) / batang.length) * 100 : 100
      const skor = clamp(Math.round(persenPertama - 5 * (jumlahPercobaan - 1)), 0, 100)
      benar()
      koin()
      setUmpan(`Semua batang benar! Skor ${skor}.`)
      selesaiRef.current = true
      setSelesai(true)
      onSelesaiRef.current(skor)
    } else if (benarKini.length > 0) {
      benar()
      getar(20)
      setUmpan(`${benarKini.length} dari ${batang.length} batang sudah benar dan terkunci. Perbaiki sisanya!`)
    } else {
      salah()
      getar([40, 40, 40])
      setUmpan('Belum ada yang benar — coba atur lagi tinggi batangnya.')
    }
  }

  const ukuranTombol = modeSatuKetukan ? 52 : 44

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-grafik { display: flex; align-items: flex-end; gap: 12px; padding: 16px 8px 8px; border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: var(--card, #fff); min-height: 240px; }
        .aia-gi-grafik-kolom { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
        .aia-gi-grafik-batang-luar { width: 100%; max-width: 72px; height: 140px; display: flex; align-items: flex-end; border-radius: 8px; background: color-mix(in srgb, #3b7ea1 10%, var(--card, #fff)); overflow: hidden; }
        .aia-gi-grafik-batang { width: 100%; background: #3b7ea1; transition: height .2s ease; }
        .aia-gi-grafik-batang.benar { background: #2f7d4f; }
        .aia-gi-grafik-tombol { display: flex; align-items: center; justify-content: center; width: 100%; max-width: 72px; border-radius: 10px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); cursor: pointer; touch-action: manipulation; }
        .aia-gi-grafik-tombol svg { width: 20px; height: 20px; }
        .aia-gi-grafik-nilai { font-weight: 800; font-size: 16px; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-grafik-batang { transition: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres grafik">
        <span className="aia-stat">
          Benar {terkunci.size}/{batang.length}
        </span>
        <span className="aia-stat">Percobaan {percobaan}</span>
      </div>

      <div className="aia-gi-grafik" role="group" aria-label="Diagram batang">
        {batang.map((b) => {
          const v = nilai[b.id] ?? 0
          const benarBatang = terkunci.has(b.id)
          const tinggi = b.maks > 0 ? (v / b.maks) * 100 : 0
          return (
            <div key={b.id} className="aia-gi-grafik-kolom">
              <button
                type="button"
                className="aia-gi-grafik-tombol"
                style={{ minHeight: ukuranTombol }}
                disabled={disabled || benarBatang || selesai}
                aria-label={`Naikkan ${b.label}`}
                onClick={() => ubahNilai(b.id, 1)}
              >
                <ChevronUp aria-hidden="true" />
              </button>
              <div className="aia-gi-grafik-batang-luar">
                <div
                  className={`aia-gi-grafik-batang${benarBatang ? ' benar' : ''}`}
                  style={{ height: `${tinggi}%` }}
                />
              </div>
              <span className="aia-gi-grafik-nilai" aria-label={`${b.label}: ${v}${b.satuan ? ` ${b.satuan}` : ''}`}>
                {v}
                {b.satuan ? ` ${b.satuan}` : ''}
                {benarBatang && <Check aria-hidden="true" style={{ width: 16, height: 16, verticalAlign: -2 }} />}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{b.label}</span>
              <button
                type="button"
                className="aia-gi-grafik-tombol"
                style={{ minHeight: ukuranTombol }}
                disabled={disabled || benarBatang || selesai}
                aria-label={`Turunkan ${b.label}`}
                onClick={() => ubahNilai(b.id, -1)}
              >
                <ChevronDown aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>

      <div className="aia-actions" style={{ justifyContent: 'space-between' }}>
        <p className="aia-muted" style={{ margin: 0 }}>
          {umpan ?? 'Atur tinggi tiap batang, lalu ketuk Periksa.'}
        </p>
        <button
          type="button"
          className="aia-btn"
          style={{ minHeight: 48 }}
          disabled={disabled || selesai}
          onClick={periksa}
        >
          Periksa
        </button>
      </div>
    </div>
  )
}
