// KartuMemori — grid kartu tertutup; ketuk untuk membalik (maks 2
// terbuka). Pasangan cocok terkunci hijau + bunyi benar; tidak cocok
// balik lagi setelah ~800ms + bunyi salah. Selesai saat semua pasangan
// ketemu. Mode satu-ketukan: kartu lebih besar.
// Skor 0–100 = pasangan / (pasangan + jumlah balik yang salah) × 100,
// jadi semakin sedikit salah, semakin tinggi skor. Generik: tidak ada
// konten misi.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { benar, getar, koin, salah } from '../suara'
import { acak, useKurangiAnimasi } from './util'

export interface KartuPasangan {
  id: string
  pasanganId: string
  konten: ReactNode
  label: string
}

export interface KartuMemoriProps {
  kartu: KartuPasangan[]
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Jeda: tunda baliknya kartu yang tidak cocok sampai jeda selesai. */
  terjeda?: boolean
  onPasangan?: (pasanganId: string) => void
  onSelesai: (skor: number) => void
}

interface KartuAcak extends KartuPasangan {
  inst: number
}

export function KartuMemori({
  kartu,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onPasangan,
  onSelesai,
}: KartuMemoriProps) {
  const kurangi = useKurangiAnimasi()
  const kunciKartu = kartu.map((k) => k.id).join(',')
  const [dek, setDek] = useState<KartuAcak[]>(() =>
    acak(kartu.map((k, i) => ({ ...k, inst: i }))),
  )
  const [terbuka, setTerbuka] = useState<number[]>([])
  const [cocok, setCocok] = useState<Set<string>>(new Set())
  const [salahBalik, setSalahBalik] = useState(0)
  const [selesai, setSelesai] = useState(false)

  const selesaiRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const cocokRef = useRef(cocok)
  cocokRef.current = cocok
  const salahRef = useRef(0)
  const onSelesaiRef = useRef(onSelesai)
  onSelesaiRef.current = onSelesai
  const onPasanganRef = useRef(onPasangan)
  onPasanganRef.current = onPasangan
  const terjedaRef = useRef(terjeda)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])

  const totalPasangan = new Set(kartu.map((k) => k.pasanganId)).size

  // Set kartu baru = acak ulang dan mulai dari nol lagi.
  useEffect(() => {
    setDek(acak(kartu.map((k, i) => ({ ...k, inst: i }))))
    setTerbuka([])
    setCocok(new Set())
    setSalahBalik(0)
    salahRef.current = 0
    setSelesai(false)
    selesaiRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciKartu])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const akhiri = (cocokBaru: Set<string>) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    const skor =
      totalPasangan > 0
        ? Math.round((totalPasangan / (totalPasangan + salahRef.current)) * 100)
        : 100
    koin()
    setSelesai(true)
    onSelesaiRef.current(skor)
  }

  // Balik kartu yang tidak cocok: bila sedang terjeda, tunda sampai jeda selesai.
  const balikTertunda = () => {
    if (terjedaRef.current) {
      timerRef.current = window.setTimeout(balikTertunda, 100)
      return
    }
    setTerbuka([])
  }

  const balik = (inst: number) => {
    if (disabled || selesaiRef.current) return
    const k = dek.find((d) => d.inst === inst)
    if (!k || cocokRef.current.has(k.pasanganId) || terbuka.includes(inst)) return
    if (terbuka.length >= 2) return
    const baru = [...terbuka, inst]
    setTerbuka(baru)
    if (baru.length < 2) return
    const [a, b] = baru.map((t) => dek.find((d) => d.inst === t))
    if (!a || !b) return
    if (a.pasanganId === b.pasanganId) {
      const cocokBaru = new Set(cocokRef.current)
      cocokBaru.add(a.pasanganId)
      setCocok(cocokBaru)
      setTerbuka([])
      benar()
      getar(20)
      onPasanganRef.current?.(a.pasanganId)
      if (cocokBaru.size >= totalPasangan) akhiri(cocokBaru)
    } else {
      salahRef.current += 1
      setSalahBalik(salahRef.current)
      salah()
      getar([40, 40, 40])
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(balikTertunda, kurangi ? 400 : 800)
    }
  }

  const ukuran = modeSatuKetukan ? 88 : 72

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-memori-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(72px, 1fr)); gap: 10px; }
        .aia-gi-memori-kartu { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border-radius: 14px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 700; font-size: 14px; cursor: pointer; touch-action: manipulation; transition: transform .15s ease, background .15s ease; }
        .aia-gi-memori-kartu.tertutup { background: color-mix(in srgb, #2f7d4f 14%, var(--card, #fff)); font-size: 22px; }
        .aia-gi-memori-kartu.terbuka { transform: scale(1.03); }
        .aia-gi-memori-kartu.cocok { border-color: var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 16%, var(--card, #fff)); }
        @media (prefers-reduced-motion: reduce) { .aia-gi-memori-kartu { transition: none; } .aia-gi-memori-kartu.terbuka { transform: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres memori">
        <span className="aia-stat">
          Pasangan {cocok.size}/{totalPasangan}
        </span>
        <span className="aia-stat">Balik salah {salahBalik}</span>
      </div>

      <div className="aia-gi-memori-grid" role="group" aria-label="Kartu memori">
        {dek.map((k) => {
          const ketemu = cocok.has(k.pasanganId)
          const dibuka = ketemu || terbuka.includes(k.inst)
          return (
            <button
              key={k.inst}
              type="button"
              className={`aia-gi-memori-kartu${kelasKartu(k, dibuka, ketemu)}`}
              style={{ minHeight: ukuran, minWidth: ukuran, height: ukuran }}
              disabled={disabled || ketemu || selesai}
              aria-label={dibuka ? `Kartu ${k.label}` : 'Kartu tertutup, ketuk untuk membalik'}
              onClick={() => balik(k.inst)}
            >
              {dibuka ? (
                <>
                  {k.konten}
                  <span style={{ fontSize: 12 }}>{k.label}</span>
                  {ketemu && <Check aria-hidden="true" style={{ width: 16, height: 16 }} />}
                </>
              ) : (
                <span aria-hidden="true">?</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="aia-muted" style={{ margin: 0, textAlign: 'center' }}>
        {selesai
          ? 'Hebat! Semua pasangan ketemu.'
          : 'Ketuk dua kartu — cari yang berpasangan!'}
      </p>
    </div>
  )
}

/** Kelas kartu: tertutup / terbuka / cocok. */
function kelasKartu(k: KartuAcak, dibuka: boolean, ketemu: boolean): string {
  if (ketemu) return ' cocok'
  if (dibuka) return ' terbuka'
  return ' tertutup'
}
