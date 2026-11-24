// SliderLever — geser tuas untuk mengatur nilai, mis. suhu atau kelembapan
// (Pointer Events: touch + mouse). Nilai saat ini tampil besar.
// Bisa juga dipakai keyboard (panah/Home/End). Mode satu-ketukan: tombol
// kurang/tambah per langkah. Generik: tidak ada konten misi di sini.

'use client'

import { useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { klik } from '../suara'
import { clamp } from './util'

export interface SliderLeverProps {
  label: string
  min?: number
  max?: number
  nilaiAwal?: number
  langkah?: number
  satuan?: string
  /** Bila true, tampil tombol kurang/tambah per langkah. */
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda. Komponen ini tidak punya jam sendiri,
   *  jadi prop diterima saja. */
  terjeda?: boolean
  onUbah: (nilai: number) => void
  onSelesai?: (nilai: number) => void
}

export function SliderLever({
  label,
  min = 0,
  max = 100,
  nilaiAwal,
  langkah = 1,
  satuan = '',
  modeSatuKetukan = false,
  disabled = false,
  onUbah,
  onSelesai,
}: SliderLeverProps) {
  const awal = nilaiAwal ?? min
  const [nilai, setNilai] = useState(() => clamp(awal, min, max))
  const [sedangGeser, setSedangGeser] = useState(false)

  const nilaiRef = useRef(nilai)
  const langkahTerakhirRef = useRef(Math.round((nilai - min) / langkah))
  const trackRef = useRef<HTMLDivElement | null>(null)

  const rapikan = (mentah: number): number => {
    const langkahKe = Math.round((mentah - min) / langkah)
    return clamp(min + langkahKe * langkah, min, max)
  }

  const aturNilai = (mentah: number) => {
    const baru = rapikan(mentah)
    if (baru === nilaiRef.current) return
    nilaiRef.current = baru
    setNilai(baru)
    const indeks = Math.round((baru - min) / langkah)
    if (indeks !== langkahTerakhirRef.current) {
      langkahTerakhirRef.current = indeks
      klik()
    }
    onUbah(baru)
  }

  const nilaiDariX = (clientX: number): number => {
    const el = trackRef.current
    if (!el) return nilaiRef.current
    const r = el.getBoundingClientRect()
    const rasio = clamp((clientX - r.left) / r.width, 0, 1)
    return min + rasio * (max - min)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    setSedangGeser(true)
    aturNilai(nilaiDariX(e.clientX))
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sedangGeser || disabled) return
    aturNilai(nilaiDariX(e.clientX))
  }

  const akhiriGeser = () => {
    if (!sedangGeser) return
    setSedangGeser(false)
    onSelesai?.(nilaiRef.current)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      aturNilai(nilaiRef.current + langkah)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      aturNilai(nilaiRef.current - langkah)
    } else if (e.key === 'Home') {
      e.preventDefault()
      aturNilai(min)
    } else if (e.key === 'End') {
      e.preventDefault()
      aturNilai(max)
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      aturNilai(nilaiRef.current + langkah * 5)
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      aturNilai(nilaiRef.current - langkah * 5)
    }
  }

  const persen = max > min ? ((nilai - min) / (max - min)) * 100 : 0

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-tuas-lintasan { position: relative; height: 16px; border-radius: 999px; background: var(--line, #e5e7eb); touch-action: none; cursor: pointer; }
        .aia-gi-tuas-isi { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: var(--green, #2f7d4f); }
        .aia-gi-tuas-pegangan { position: absolute; top: 50%; width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%; border: 2px solid var(--green, #2f7d4f); background: var(--card, #fff); color: var(--foreground, #111); display: flex; align-items: center; justify-content: center; font-weight: 800; cursor: grab; touch-action: none; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
        .aia-gi-tuas-pegangan:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        @media (hover: hover) { .aia-gi-tuas-pegangan:hover { transform: scale(1.08); box-shadow: 0 4px 14px rgba(0,0,0,.2); } }
      `}</style>

      <div style={{ textAlign: 'center' }}>
        <span className="aia-kicker">{label}</span>
        <strong style={{ display: 'block', fontSize: 28, lineHeight: 1.2 }}>
          {nilai}
          {satuan ? ` ${satuan}` : ''}
        </strong>
      </div>

      <div
        ref={trackRef}
        className="aia-gi-tuas-lintasan"
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={akhiriGeser}
        onPointerCancel={akhiriGeser}
      >
        <span className="aia-gi-tuas-isi" style={{ width: `${persen}%` }} aria-hidden="true" />
        <button
          type="button"
          className="aia-gi-tuas-pegangan"
          style={{ left: `${persen}%` }}
          disabled={disabled}
          role="slider"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={nilai}
          aria-valuetext={`${nilai}${satuan ? ` ${satuan}` : ''}`}
          onKeyDown={onKeyDown}
        >
          ↕
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <small className="aia-muted">
          {min}
          {satuan}
        </small>
        <small className="aia-muted">
          {max}
          {satuan}
        </small>
      </div>

      {modeSatuKetukan && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            type="button"
            className="aia-btn aia-btn-ghost"
            style={{ minWidth: 56, minHeight: 48 }}
            disabled={disabled || nilai <= min}
            aria-label={`Kurangi ${label}`}
            onClick={() => aturNilai(nilaiRef.current - langkah)}
          >
            <Minus aria-hidden="true" /> {langkah}
          </button>
          <button
            type="button"
            className="aia-btn aia-btn-ghost"
            style={{ minWidth: 56, minHeight: 48 }}
            disabled={disabled || nilai >= max}
            aria-label={`Tambah ${label}`}
            onClick={() => aturNilai(nilaiRef.current + langkah)}
          >
            <Plus aria-hidden="true" /> {langkah}
          </button>
        </div>
      )}
    </div>
  )
}
