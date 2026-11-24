// RotateDial — gerakan melingkar untuk memutar keran atau bor (Pointer Events).
// Menghitung sudut putaran; selesai setelah mencapai sudut target.
// Mode satu-ketukan: ketuk dua kali untuk memutar 90°.
// Generik: tidak ada konten misi di sini.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { benar, klik, koin } from '../suara'
import { clamp, deltaSudut, sudutDariPusat, useKurangiAnimasi } from './util'

export interface RotateDialProps {
  label: string
  /** Sudut total yang harus diputar (derajat). Default 360 (satu putaran penuh). */
  sudutTarget?: number
  ikon?: ReactNode
  /** Bila true, putar diganti ketuk dua kali (= 90°). */
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda. Komponen ini tidak punya jam sendiri
   *  (Date.now hanya untuk deteksi ketuk ganda), jadi prop diterima saja. */
  terjeda?: boolean
  onSelesai: () => void
  onPutar?: (sudutTotal: number) => void
}

const R = 52
const KELILING = 2 * Math.PI * R
const KETUK_GANDA_MS = 350

export function RotateDial({
  label,
  sudutTarget = 360,
  ikon,
  modeSatuKetukan = false,
  disabled = false,
  onSelesai,
  onPutar,
}: RotateDialProps) {
  const kurangi = useKurangiAnimasi()
  const [putaran, setPutaran] = useState(0)
  const [sedangPutar, setSedangPutar] = useState(false)

  const totalRef = useRef(0)
  const sudutAkhirRef = useRef<number | null>(null)
  const tickRef = useRef(0)
  const selesaiRef = useRef(false)
  const ketukTerakhirRef = useRef(0)
  const dialRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    totalRef.current = 0
    tickRef.current = 0
  }, [sudutTarget])

  const terapkanPutaran = (totalBaru: number) => {
    totalRef.current = totalBaru
    setPutaran(totalBaru)
    onPutar?.(totalBaru)
    const tick = Math.floor(Math.abs(totalBaru) / 45)
    if (tick !== tickRef.current) {
      tickRef.current = tick
      klik()
    }
    if (Math.abs(totalBaru) >= sudutTarget && !selesaiRef.current) {
      selesaiRef.current = true
      benar()
      koin()
      onSelesai()
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || selesaiRef.current || modeSatuKetukan) return
    const el = dialRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    sudutAkhirRef.current = sudutDariPusat(e.clientX, e.clientY, cx, cy)
    setSedangPutar(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (modeSatuKetukan) return
    const akhir = sudutAkhirRef.current
    const el = dialRef.current
    if (akhir === null || !el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const sudut = sudutDariPusat(e.clientX, e.clientY, cx, cy)
    const delta = deltaSudut(akhir, sudut)
    sudutAkhirRef.current = sudut
    terapkanPutaran(totalRef.current + delta)
  }

  const akhiriPutar = () => {
    sudutAkhirRef.current = null
    setSedangPutar(false)
  }

  // Keyboard: panah = putar 15° (Shift = 45°). Mode satu-ketukan:
  // Enter/Spasi = satu putaran 90° (setara ketuk dua kali).
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || selesaiRef.current) return
    if (modeSatuKetukan) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (e.repeat) return
        terapkanPutaran(totalRef.current + 90)
      }
      return
    }
    const langkah = e.shiftKey ? 45 : 15
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      terapkanPutaran(totalRef.current + langkah)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      terapkanPutaran(totalRef.current - langkah)
    }
  }

  const onPointerUp = () => {
    if (!modeSatuKetukan) {
      akhiriPutar()
      return
    }
    // Mode satu-ketukan: dua ketuk cepat = putar 90°.
    const sekarang = Date.now()
    if (sekarang - ketukTerakhirRef.current <= KETUK_GANDA_MS) {
      ketukTerakhirRef.current = 0
      terapkanPutaran(totalRef.current + 90)
    } else {
      ketukTerakhirRef.current = sekarang
    }
  }

  const progres = clamp(Math.abs(putaran) / sudutTarget, 0, 1)

  return (
    <div className="aia-stack" style={{ alignItems: 'center' }}>
      <style>{`
        .aia-gi-putar { position: relative; width: 148px; height: 148px; border-radius: 50%; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
        @media (hover: hover) { .aia-gi-putar:hover { box-shadow: 0 4px 14px rgba(0,0,0,.15); } }
        .aia-gi-putar:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-putar-cakram { position: absolute; inset: 18px; border-radius: 50%; background: color-mix(in srgb, #2f7d4f 14%, var(--card, #fff)); border: 2px solid var(--green, #2f7d4f); display: flex; align-items: center; justify-content: center; pointer-events: none; }
        .aia-gi-putar-tanda { position: absolute; top: 6px; left: 50%; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: #b45309; }
      `}</style>
      <button
        type="button"
        ref={dialRef}
        className="aia-gi-putar"
        style={{ minWidth: 148, minHeight: 148 }}
        disabled={disabled || selesaiRef.current}
        aria-label={`${label}. ${modeSatuKetukan ? 'Ketuk dua kali untuk memutar 90 derajat, atau tekan Enter/Spasi.' : 'Putar dengan gerakan melingkar, atau pakai tombol panah.'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={akhiriPutar}
        onKeyDown={onKeyDown}
      >
        <svg
          width={148}
          height={148}
          viewBox="0 0 120 120"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0 }}
        >
          <circle cx={60} cy={60} r={R} fill="none" stroke="var(--line, #e5e7eb)" strokeWidth={8} />
          <circle
            cx={60}
            cy={60}
            r={R}
            fill="none"
            stroke="#2f7d4f"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={KELILING}
            strokeDashoffset={KELILING * (1 - progres)}
            transform="rotate(-90 60 60)"
            style={{ transition: sedangPutar || kurangi ? 'none' : 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <span
          className="aia-gi-putar-cakram"
          style={{
            transform: `rotate(${putaran % 360}deg)`,
            transition: sedangPutar || kurangi ? 'none' : 'transform 0.3s ease',
          }}
        >
          <span className="aia-gi-putar-tanda" aria-hidden="true" />
          {ikon}
        </span>
      </button>
      <p className="aia-muted" style={{ textAlign: 'center', margin: 0 }}>
        Sudut: {Math.round(Math.abs(putaran))}° / {sudutTarget}°
        {modeSatuKetukan ? ' — ketuk dua kali (atau Enter/Spasi) untuk memutar 90°.' : ' — putar melingkar sampai penuh, atau pakai tombol panah.'}
      </p>
    </div>
  )
}
