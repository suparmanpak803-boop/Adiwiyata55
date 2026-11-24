// HoldAction — tahan untuk menyiram, menuang, atau mengisi (Pointer Events).
// Bar progres melingkar terisi selama ditahan; selesai bila penuh.
// Mode satu-ketukan: ketuk sekali untuk mengisi otomatis, ketuk lagi batal.
// Generik: tidak ada konten misi di sini.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { benar, klik, koin } from '../suara'
import { clamp, useKurangiAnimasi } from './util'

export interface HoldActionProps {
  label: string
  /** Waktu tahan sampai penuh (ms). Default 1500. */
  durasiMs?: number
  ikon?: ReactNode
  /** Bila true, tahan diganti ketuk sekali (isi otomatis). */
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda: progres tahan dibekukan. */
  terjeda?: boolean
  onSelesai: () => void
  onBatal?: () => void
}

const R = 40
const KELILING = 2 * Math.PI * R

export function HoldAction({
  label,
  durasiMs = 1500,
  ikon,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onSelesai,
  onBatal,
}: HoldActionProps) {
  const kurangi = useKurangiAnimasi()
  const [progress, setProgress] = useState(0)
  const [menahan, setMenahan] = useState(false)

  const progressRef = useRef(0)
  const mulaiRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const selesaiRef = useRef(false)
  const menahanRef = useRef(false)
  // Jeda: rAF dilewati selama terjeda dengan menggeser baseline sebesar
  // waktu yang berlalu, supaya progres tidak maju selama jeda.
  const terjedaRef = useRef(false)
  const terakhirRef = useRef(0)
  useEffect(() => { terjedaRef.current = terjeda }, [terjeda])

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const selesaikan = () => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    menahanRef.current = false
    setMenahan(false)
    benar()
    koin()
    onSelesai()
  }

  const mulai = () => {
    if (disabled || selesaiRef.current) return
    klik()
    menahanRef.current = true
    setMenahan(true)
    // Lanjutkan dari progres saat ini (untuk mode ketuk yang dijeda).
    mulaiRef.current = performance.now() - progressRef.current * durasiMs
    terakhirRef.current = performance.now()
    const langkah = (waktu: number) => {
      if (terjedaRef.current) {
        // Jeda: bekukan progres (geser baseline sebesar waktu yang berlalu).
        mulaiRef.current += waktu - terakhirRef.current
        terakhirRef.current = waktu
        rafRef.current = requestAnimationFrame(langkah)
        return
      }
      terakhirRef.current = waktu
      const p = clamp((waktu - mulaiRef.current) / durasiMs, 0, 1)
      progressRef.current = p
      setProgress(p)
      if (p >= 1) {
        rafRef.current = null
        selesaikan()
        return
      }
      rafRef.current = requestAnimationFrame(langkah)
    }
    rafRef.current = requestAnimationFrame(langkah)
  }

  const berhenti = () => {
    if (!menahanRef.current) return
    menahanRef.current = false
    setMenahan(false)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const sempat = progressRef.current
    progressRef.current = 0
    setProgress(0)
    if (sempat > 0.02) onBatal?.()
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || selesaiRef.current) return
    if (modeSatuKetukan) {
      // Ketuk sekali: isi otomatis; ketuk lagi: batal.
      if (menahanRef.current) berhenti()
      else mulai()
      return
    }
    mulai()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const onPointerUp = () => {
    if (modeSatuKetukan) return
    berhenti()
  }

  const onPointerCancel = () => {
    if (modeSatuKetukan) return
    berhenti()
  }

  // Keyboard: tahan Spasi/Enter = menahan (lepas tombol = berhenti).
  // Mode satu-ketukan: sekali tekan = isi otomatis, tekan lagi = batal.
  // preventDefault mencegah klik bawaan tombol supaya tidak dobel.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || selesaiRef.current) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (e.repeat) return
    if (modeSatuKetukan) {
      if (menahanRef.current) berhenti()
      else mulai()
      return
    }
    mulai()
  }

  const onKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (modeSatuKetukan) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    berhenti()
  }

  // Fokus lepas saat menahan (mis. Tab) = berhenti, seperti lepas pointer.
  const onBlur = () => {
    if (!modeSatuKetukan) berhenti()
  }

  return (
    <div className="aia-stack" style={{ alignItems: 'center' }}>
      <style>{`
        .aia-gi-tahan { position: relative; width: 132px; height: 132px; border-radius: 50%; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        .aia-gi-tahan.menahan { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        @media (hover: hover) { .aia-gi-tahan:hover { box-shadow: 0 4px 14px rgba(0,0,0,.15); } }
        .aia-gi-tahan:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-tahan-tengah { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; pointer-events: none; }
      `}</style>
      <button
        type="button"
        className={`aia-gi-tahan${menahan ? ' menahan' : ''}`}
        style={{ minWidth: 132, minHeight: 132 }}
        disabled={disabled || selesaiRef.current}
        aria-label={`${label}. ${modeSatuKetukan ? 'Ketuk sekali untuk mengisi otomatis.' : 'Tahan untuk mengisi. Tahan Spasi atau Enter juga bisa.'}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg width={132} height={132} viewBox="0 0 120 120" aria-hidden="true">
          <circle cx={60} cy={60} r={R} fill="none" stroke="var(--line, #e5e7eb)" strokeWidth={10} />
          <circle
            cx={60}
            cy={60}
            r={R}
            fill="none"
            stroke="#2f7d4f"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={KELILING}
            strokeDashoffset={KELILING * (1 - progress)}
            transform="rotate(-90 60 60)"
            style={{ transition: menahan || kurangi ? 'none' : 'stroke-dashoffset 0.25s ease' }}
          />
        </svg>
        <span className="aia-gi-tahan-tengah">
          {ikon}
          <strong style={{ fontSize: 18 }}>{Math.round(progress * 100)}%</strong>
        </span>
      </button>
      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progres ${label}`}
        style={{ width: '100%', maxWidth: 240 }}
      >
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="aia-muted" style={{ textAlign: 'center', margin: 0 }}>
        {modeSatuKetukan
          ? menahan
            ? `Mengisi ${label}… ketuk lagi untuk batal.`
            : `Ketuk sekali untuk mengisi ${label}.`
          : `Tahan untuk ${label} sampai cincin penuh (atau tahan Spasi/Enter).`}
      </p>
    </div>
  )
}
