// ThrowAim — tarik dan lepas untuk melempar (Pointer Events: touch + mouse).
// Lintasan titik-titik tampil saat menarik; kekuatan sesuai panjang tarikan.
// Mode satu-ketukan: ketuk target untuk melempar.
// Generik: tidak ada konten misi di sini.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getar, klik, lempar as sfxLempar } from '../suara'
import { clamp, useKurangiAnimasi } from './util'

export interface ThrowAimProps {
  label: string
  ikon?: ReactNode
  /** Label target untuk mode satu-ketukan (bila tidak diisi, tombol "Lempar!"). */
  targetLabel?: string
  /** Bila true, tarik diganti ketuk target untuk melempar. */
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** kekuatan 0..1, arah derajat (0 = kanan, -90 = lurus ke atas). */
  onLempar: (kekuatan: number, arahDerajat: number) => void
}

interface Titik {
  x: number
  y: number
}

const TARIK_MAKS = 120
const AREA_TINGGI = 280

export function ThrowAim({
  label,
  ikon,
  targetLabel,
  modeSatuKetukan = false,
  disabled = false,
  onLempar,
}: ThrowAimProps) {
  const kurangi = useKurangiAnimasi()
  const [tarik, setTarik] = useState<Titik | null>(null)
  const [titik, setTitik] = useState<Titik[]>([])
  const [terbang, setTerbang] = useState(false)

  const areaRef = useRef<HTMLDivElement | null>(null)
  const bendaRef = useRef<HTMLButtonElement | null>(null)
  const awalRef = useRef<Titik | null>(null)
  const tarikRef = useRef<Titik | null>(null)
  const asalRef = useRef<Titik>({ x: 48, y: 220 })
  const lebarRef = useRef(600)
  const animRef = useRef<Animation | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (animRef.current) animRef.current.cancel()
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  /** Titik lintasan parabola dari kecepatan awal (koordinat area). */
  const hitungLintasan = (asal: Titik, v: Titik): Titik[] => {
    const g = 1500
    const hasil: Titik[] = []
    for (let t = 0.05; t <= 0.5; t += 0.05) {
      const p = { x: asal.x + v.x * t, y: asal.y + v.y * t + 0.5 * g * t * t }
      if (p.x < 0 || p.x > lebarRef.current || p.y < 0 || p.y > AREA_TINGGI) break
      hasil.push(p)
    }
    return hasil
  }

  const lemparSekarang = (kekuatan: number, arahDerajat: number, v: Titik) => {
    const el = bendaRef.current
    setTerbang(true)
    sfxLempar()
    getar(15)
    const panggil = () => {
      setTerbang(false)
      setTarik(null)
      setTitik([])
      tarikRef.current = null
      onLempar(kekuatan, arahDerajat)
    }
    if (kurangi || !el || !el.animate) {
      panggil()
      return
    }
    const asal = asalRef.current
    const lintasan = hitungLintasan(asal, v)
    const bingkai = lintasan.map((p) => ({
      transform: `translate(${p.x - asal.x}px, ${p.y - asal.y}px)`,
    }))
    if (bingkai.length === 0) {
      panggil()
      return
    }
    try {
      const anim = el.animate(bingkai, { duration: 500, easing: 'cubic-bezier(.2,.6,.4,1)' })
      animRef.current = anim
      anim.onfinish = () => {
        anim.cancel()
        panggil()
      }
    } catch {
      panggil()
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || terbang || modeSatuKetukan) return
    klik()
    const area = areaRef.current
    const benda = bendaRef.current
    if (area && benda) {
      const ra = area.getBoundingClientRect()
      const rb = benda.getBoundingClientRect()
      lebarRef.current = ra.width
      asalRef.current = { x: rb.left + rb.width / 2 - ra.left, y: rb.top + rb.height / 2 - ra.top }
    }
    awalRef.current = { x: e.clientX, y: e.clientY }
    tarikRef.current = { x: 0, y: 0 }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const awal = awalRef.current
    if (!awal || modeSatuKetukan) return
    let dx = e.clientX - awal.x
    let dy = e.clientY - awal.y
    const panjang = Math.hypot(dx, dy)
    if (panjang > TARIK_MAKS) {
      dx = (dx / panjang) * TARIK_MAKS
      dy = (dy / panjang) * TARIK_MAKS
    }
    const p = { x: dx, y: dy }
    tarikRef.current = p
    setTarik(p)
    const v = { x: -dx * 5, y: -dy * 5 }
    setTitik(hitungLintasan(asalRef.current, v))
  }

  const onPointerUp = () => {
    const p = tarikRef.current
    awalRef.current = null
    if (!p) return
    const panjang = Math.hypot(p.x, p.y)
    if (panjang < 14) {
      setTarik(null)
      setTitik([])
      tarikRef.current = null
      return
    }
    const kekuatan = clamp(panjang / TARIK_MAKS, 0, 1)
    const v = { x: -p.x * 5, y: -p.y * 5 }
    const arah = (Math.atan2(v.y, v.x) * 180) / Math.PI
    lemparSekarang(kekuatan, arah, v)
  }

  const onPointerCancel = () => {
    awalRef.current = null
    tarikRef.current = null
    setTarik(null)
    setTitik([])
  }

  const lemparSatuKetukan = () => {
    if (disabled || terbang) return
    const v = { x: 350, y: -450 }
    lemparSekarang(0.7, -60, v)
  }

  const kekuatan = tarik ? clamp(Math.hypot(tarik.x, tarik.y) / TARIK_MAKS, 0, 1) : 0

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-lempar-area { position: relative; height: ${AREA_TINGGI}px; border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: linear-gradient(to bottom, color-mix(in srgb, #38bdf8 10%, var(--card, #fff)), var(--card, #fff)); overflow: hidden; touch-action: none; }
        .aia-gi-lempar-benda { position: absolute; left: 24px; bottom: 24px; width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--green, #2f7d4f); background: var(--card, #fff); color: var(--foreground, #111); display: flex; align-items: center; justify-content: center; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
        .aia-gi-lempar-titik { position: absolute; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: #b45309; opacity: .8; pointer-events: none; }
        .aia-gi-lempar-meter { height: 10px; border-radius: 999px; background: var(--line, #e5e7eb); overflow: hidden; }
        .aia-gi-lempar-meter span { display: block; height: 100%; background: #b45309; transition: width .05s linear; }
        @media (prefers-reduced-motion: reduce) { .aia-gi-lempar-meter span { transition: none; } }
      `}</style>

      <div
        ref={areaRef}
        className="aia-gi-lempar-area"
        aria-label={`Area lempar: ${label}`}
      >
        {titik.map((p, i) => (
          <span key={i} className="aia-gi-lempar-titik" style={{ left: p.x, top: p.y }} aria-hidden="true" />
        ))}
        <button
          type="button"
          ref={bendaRef}
          className="aia-gi-lempar-benda"
          style={{
            transform: tarik ? `translate(${tarik.x}px, ${tarik.y}px)` : undefined,
            opacity: terbang ? 0.4 : 1,
            cursor: modeSatuKetukan ? 'default' : 'grab',
          }}
          disabled={disabled || terbang}
          aria-label={`${label}. ${modeSatuKetukan ? 'Ketuk target untuk melempar.' : 'Tahan lalu tarik ke belakang, lepas untuk melempar.'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {ikon}
        </button>
      </div>

      <div className="aia-gi-lempar-meter" role="progressbar" aria-valuenow={Math.round(kekuatan * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Kekuatan lemparan">
        <span style={{ width: `${kekuatan * 100}%` }} />
      </div>
      <p className="aia-muted" style={{ textAlign: 'center', margin: 0 }}>
        {modeSatuKetukan
          ? `Ketuk target untuk melempar ${label}.`
          : tarik
            ? `Kekuatan ${Math.round(kekuatan * 100)}% — lepas untuk melempar!`
            : `Tahan ${label}, tarik ke belakang, lalu lepas untuk melempar.`}
      </p>

      {modeSatuKetukan && (
        <button
          type="button"
          className="aia-btn aia-btn-primary aia-btn-block"
          style={{ minHeight: 48 }}
          disabled={disabled || terbang}
          onClick={lemparSatuKetukan}
        >
          {targetLabel ? `Lempar ke ${targetLabel}` : 'Lempar!'}
        </button>
      )}
    </div>
  )
}
