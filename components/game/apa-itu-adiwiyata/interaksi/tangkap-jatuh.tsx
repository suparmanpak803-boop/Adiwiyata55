// TangkapJatuh — tangkap objek yang jatuh dengan keranjang.
// Objek jatuh satu per satu dari atas; keranjang digerakkan mengikuti
// pointer (mouse/sentuh) atau tombol panah keyboard. Objek benar yang
// tertangkap = poin; objek salah yang tertangkap = pengurang skor kecil
// (tanpa hukuman keras); objek benar yang jatuh ke tanah = terlewat.
// Mode satu-ketukan: jatuh lebih pelan + keranjang lebih lebar.
// Skor akhir 0–100 = persen objek benar yang tertangkap, dikurangi 5
// per tangkapan salah (minimal 0). Generik: tidak ada konten misi.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { benar, getar, klik, koin, salah, tik } from '../suara'
import { clamp, useKurangiAnimasi } from './util'
import { EfekBenar, EfekSalah } from './umpan-balik'

export interface ObjekJatuh {
  id: string
  label: string
  benar: boolean
  ikon?: ReactNode
}

export interface TangkapJatuhProps {
  objek: ObjekJatuh[]
  /** Jeda (ms) sebelum objek berikutnya muncul. */
  intervalMs?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Jeda: bekukan jatuhnya objek & kemunculan objek berikutnya. */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

interface JatuhAktif {
  objek: ObjekJatuh
  x: number
  y: number
}

export function TangkapJatuh({
  objek,
  intervalMs = 1400,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onSelesai,
}: TangkapJatuhProps) {
  const kurangi = useKurangiAnimasi()
  const [keranjangX, setKeranjangX] = useState(50)
  const [jatuh, setJatuh] = useState<JatuhAktif | null>(null)
  const [hitung, setHitung] = useState({ benar: 0, salah: 0, terlewat: 0 })
  const [umpan, setUmpan] = useState<'benar' | 'salah' | null>(null)
  const [selesai, setSelesai] = useState(false)

  const areaRef = useRef<HTMLDivElement>(null)
  const keranjangRef = useRef(50)
  const jatuhRef = useRef<JatuhAktif | null>(null)
  const idxRef = useRef(0)
  const benarRef = useRef(0)
  const salahRef = useRef(0)
  const terlewatRef = useRef(0)
  const selesaiRef = useRef(false)
  const rafRef = useRef(0)
  const spawnTimerRef = useRef<number | null>(null)
  const umpanTimerRef = useRef<number | null>(null)
  const onSelesaiRef = useRef(onSelesai)
  onSelesaiRef.current = onSelesai
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled
  const modeRef = useRef(modeSatuKetukan)
  modeRef.current = modeSatuKetukan
  const terjedaRef = useRef(terjeda)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])

  const totalBenar = objek.filter((o) => o.benar).length
  const lebarKeranjang = modeSatuKetukan ? 34 : 22

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      if (spawnTimerRef.current) window.clearTimeout(spawnTimerRef.current)
      if (umpanTimerRef.current) window.clearTimeout(umpanTimerRef.current)
    },
    [],
  )

  const tampilUmpan = (jenis: 'benar' | 'salah') => {
    setUmpan(jenis)
    if (umpanTimerRef.current) window.clearTimeout(umpanTimerRef.current)
    umpanTimerRef.current = window.setTimeout(() => setUmpan(null), 900)
  }

  const akhiri = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    const dasar = totalBenar > 0 ? (benarRef.current / totalBenar) * 100 : 100
    const skor = clamp(Math.round(dasar - 5 * salahRef.current), 0, 100)
    koin()
    setSelesai(true)
    onSelesaiRef.current(skor)
  }

  const munculkan = (i: number) => {
    const o = objek[i]
    if (!o) return
    const aktif: JatuhAktif = { objek: o, x: 8 + Math.random() * 84, y: 0 }
    jatuhRef.current = aktif
    setJatuh({ ...aktif })
  }

  // Kemunculan objek berikutnya: bila sedang terjeda, tunda sampai jeda selesai.
  const munculTertunda = (i: number) => {
    if (terjedaRef.current) {
      spawnTimerRef.current = window.setTimeout(() => munculTertunda(i), 100)
      return
    }
    munculkan(i)
  }

  const lanjut = () => {
    const i = idxRef.current + 1
    idxRef.current = i
    if (i >= objek.length) {
      akhiri()
      return
    }
    spawnTimerRef.current = window.setTimeout(() => munculTertunda(i), intervalMs)
  }

  // Loop jatuh (rAF) + kemunculan objek pertama.
  useEffect(() => {
    if (objek.length === 0) {
      akhiri()
      return
    }
    idxRef.current = 0
    munculkan(0)
    let terakhir = performance.now()
    const langkah = (t: number) => {
      // Jeda: bekukan jatuhnya objek — buang dt selama jeda supaya
      // objek tidak melompat saat lanjut.
      if (terjedaRef.current) {
        terakhir = t
        rafRef.current = requestAnimationFrame(langkah)
        return
      }
      const dt = Math.min(100, t - terakhir)
      terakhir = t
      const j = jatuhRef.current
      if (j && !selesaiRef.current && !disabledRef.current) {
        const cepat = modeRef.current ? 0.028 : 0.045 // % tinggi area per ms
        j.y += cepat * dt
        const lebar = modeRef.current ? 34 : 22
        const garisTangkap = 84
        if (j.y >= garisTangkap && Math.abs(j.x - keranjangRef.current) <= lebar / 2 + 5) {
          jatuhRef.current = null
          setJatuh(null)
          if (j.objek.benar) {
            benarRef.current += 1
            benar()
            getar(20)
            tampilUmpan('benar')
          } else {
            salahRef.current += 1
            salah()
            getar([40, 40, 40])
            tampilUmpan('salah')
          }
          setHitung({
            benar: benarRef.current,
            salah: salahRef.current,
            terlewat: terlewatRef.current,
          })
          lanjut()
        } else if (j.y >= 100) {
          jatuhRef.current = null
          setJatuh(null)
          if (j.objek.benar) {
            terlewatRef.current += 1
            tik()
            setHitung({
              benar: benarRef.current,
              salah: salahRef.current,
              terlewat: terlewatRef.current,
            })
          }
          lanjut()
        } else {
          setJatuh({ ...j })
        }
      }
      rafRef.current = requestAnimationFrame(langkah)
    }
    rafRef.current = requestAnimationFrame(langkah)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (spawnTimerRef.current) window.clearTimeout(spawnTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const geserKeranjangKe = (clientX: number) => {
    const el = areaRef.current
    if (!el || disabled || selesaiRef.current) return
    const r = el.getBoundingClientRect()
    const x = clamp(((clientX - r.left) / r.width) * 100, 6, 94)
    keranjangRef.current = x
    setKeranjangX(x)
  }

  const geserKeranjang = (arah: -1 | 1) => {
    if (disabled || selesaiRef.current) return
    klik()
    const x = clamp(keranjangRef.current + arah * 8, 6, 94)
    keranjangRef.current = x
    setKeranjangX(x)
  }

  const skorSementara =
    totalBenar > 0
      ? clamp(Math.round((hitung.benar / totalBenar) * 100 - 5 * hitung.salah), 0, 100)
      : 100

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-tangkap-area { position: relative; height: 320px; border: 1px solid var(--line, #e5e7eb); border-radius: 14px; overflow: hidden; background: linear-gradient(180deg, color-mix(in srgb, #3b7ea1 10%, var(--card, #fff)), var(--card, #fff)); touch-action: none; }
        .aia-gi-tangkap-objek { position: absolute; transform: translate(-50%, 0); display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 56px; min-height: 56px; padding: 6px; border-radius: 12px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 700; font-size: 13px; pointer-events: none; }
        .aia-gi-tangkap-keranjang { position: absolute; bottom: 10px; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; min-height: 48px; border-radius: 12px; background: #2f7d4f; color: #fff; font-weight: 800; font-size: 22px; pointer-events: none; }
        .aia-gi-tangkap-tanah { position: absolute; left: 0; right: 0; bottom: 0; height: 8px; background: color-mix(in srgb, #2f7d4f 35%, var(--card, #fff)); }
        .aia-gi-tangkap-area:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-tangkap-panah { min-width: 56px; min-height: 48px; }
      `}</style>

      <div className="aia-stats" aria-label="Progres tangkapan">
        <span className="aia-stat">
          Tertangkap {hitung.benar}/{totalBenar} benar
        </span>
        <span className="aia-stat">Salah tangkap {hitung.salah}</span>
        <span className="aia-stat">Terlewat {hitung.terlewat}</span>
        <span className="aia-stat">Skor {skorSementara}</span>
      </div>

      <div
        ref={areaRef}
        className="aia-gi-tangkap-area"
        role="application"
        tabIndex={0}
        aria-label="Area permainan: gerakkan keranjang dengan pointer atau tombol panah untuk menangkap objek yang jatuh"
        onPointerMove={(e) => geserKeranjangKe(e.clientX)}
        onPointerDown={(e) => geserKeranjangKe(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            geserKeranjang(-1)
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            geserKeranjang(1)
          }
        }}
      >
        <EfekBenar tampil={umpan === 'benar'} label="Tertangkap!" />
        {jatuh && (
          <div
            className="aia-gi-tangkap-objek"
            style={{ left: `${jatuh.x}%`, top: `${jatuh.y}%` }}
            aria-hidden="true"
          >
            {jatuh.objek.ikon ?? <span style={{ fontSize: 22 }}>●</span>}
            {jatuh.objek.label}
          </div>
        )}
        <div className="aia-gi-tangkap-tanah" aria-hidden="true" />
        <div
          className="aia-gi-tangkap-keranjang"
          style={{ left: `${keranjangX}%`, width: `${lebarKeranjang}%` }}
          aria-hidden="true"
        >
          ▽
        </div>
      </div>

      <div className="aia-actions" style={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          className="aia-btn aia-gi-tangkap-panah"
          disabled={disabled || selesai}
          aria-label="Geser keranjang ke kiri"
          onClick={() => geserKeranjang(-1)}
        >
          <ChevronLeft aria-hidden="true" /> Kiri
        </button>
        <p className="aia-muted" style={{ margin: 0, textAlign: 'center' }}>
          {selesai
            ? 'Selesai! Semua objek sudah jatuh.'
            : kurangi
              ? 'Gerakkan keranjang untuk menangkap objek yang benar.'
              : 'Gerakkan keranjang mengikuti objek yang jatuh!'}
        </p>
        <button
          type="button"
          className="aia-btn aia-gi-tangkap-panah"
          disabled={disabled || selesai}
          aria-label="Geser keranjang ke kanan"
          onClick={() => geserKeranjang(1)}
        >
          Kanan <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <EfekSalah tampil={umpan === 'salah'} petunjuk="Itu bukan yang dicari — biarkan jatuh saja." />
    </div>
  )
}
