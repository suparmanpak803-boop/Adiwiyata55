// DragDrop — seret benda ke target (Pointer Events: touch + mouse).
// Zona target menyala saat benda mendekat; "snap" saat dilepas di tempat
// benar; benda kembali ke posisi awal bila dilepas di target yang salah.
// Mode satu-ketukan: ketuk benda untuk memilih, lalu ketuk target.
// Generik: tidak ada konten misi di sini.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ambil, benar, getar, klik, lepas, plop, salah } from '../suara'
import { useKurangiAnimasi } from './util'

export interface BendaDrag {
  id: string
  label: string
  konten: ReactNode
}

export interface TargetDrop {
  id: string
  label: string
  ikon?: ReactNode
}

export interface DragDropProps {
  benda: BendaDrag
  /** Target yang benar. */
  target: TargetDrop
  /** Target lain yang ditampilkan (dilepas di sini = salah). */
  targetLain?: TargetDrop[]
  /** Bila true, area target membesar (kesulitan adaptif setelah 2 gagal). */
  perbesarTarget?: boolean
  /** Bila true, seret diganti ketuk benda lalu ketuk target. */
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda: panggilan selesai ditunda sampai lanjut. */
  terjeda?: boolean
  onBenar: (bendaId: string) => void
  /** Dipanggil saat dilepas di target yang salah (argumen kedua = id target itu). */
  onSalah: (bendaId: string, targetId?: string) => void
}

interface Pos {
  x: number
  y: number
}

export function DragDrop({
  benda,
  target,
  targetLain = [],
  perbesarTarget = false,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onBenar,
  onSalah,
}: DragDropProps) {
  const kurangi = useKurangiAnimasi()
  const [pos, setPosState] = useState<Pos | null>(null)
  const [sedangDrag, setSedangDrag] = useState(false)
  const [targetAktif, setTargetAktif] = useState<string | null>(null)
  const [menempel, setMenempel] = useState<string | null>(null)
  const [dipilih, setDipilih] = useState(false)

  const posRef = useRef<Pos | null>(null)
  const seretRef = useRef<{ x0: number; y0: number; bergerak: boolean } | null>(null)
  const abaikanKlikRef = useRef(false)
  const selesaiRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  // Jeda: panggilan selesai ditunda selama terjeda (ref supaya callback
  // timeout membaca nilai terbaru).
  const terjedaRef = useRef(false)
  useEffect(() => { terjedaRef.current = terjeda }, [terjeda])
  const bendaRef = useRef<HTMLButtonElement | null>(null)
  const targetRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const semuaTarget = [target, ...targetLain]
  const pad = perbesarTarget ? 28 : 12

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const aturPos = (p: Pos | null) => {
    posRef.current = p
    setPosState(p)
  }

  /** Target yang titik layarnya berada di dalamnya (dengan toleransi pad). */
  const cekTarget = (clientX: number, clientY: number): string | null => {
    for (const t of semuaTarget) {
      const el = targetRefs.current.get(t.id)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (
        clientX >= r.left - pad &&
        clientX <= r.right + pad &&
        clientY >= r.top - pad &&
        clientY <= r.bottom + pad
      ) {
        return t.id
      }
    }
    return null
  }

  const selesaikanKe = (targetId: string) => {
    if (disabled || menempel) return
    if (targetId === target.id) {
      // Snap: geser benda agar pusatnya menempel ke pusat target.
      const elBenda = bendaRef.current
      const elTarget = targetRefs.current.get(targetId)
      if (elBenda && elTarget) {
        const a = elBenda.getBoundingClientRect()
        const b = elTarget.getBoundingClientRect()
        const dx = b.left + b.width / 2 - (a.left + a.width / 2)
        const dy = b.top + b.height / 2 - (a.top + a.height / 2)
        const p = posRef.current ?? { x: 0, y: 0 }
        aturPos({ x: p.x + dx, y: p.y + dy })
      }
      setMenempel(targetId)
      plop()
      benar()
      getar(20)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      // Selesai ditunda selama jeda (cek ulang tiap 100 ms).
      const jadwalkanBenar = (ms: number) => {
        timerRef.current = window.setTimeout(() => {
          if (terjedaRef.current) { jadwalkanBenar(100); return }
          if (selesaiRef.current) return
          selesaiRef.current = true
          onBenar(benda.id)
        }, ms)
      }
      jadwalkanBenar(kurangi ? 60 : 450)
    } else {
      salah()
      getar([40, 40, 40])
      aturPos(null)
      onSalah(benda.id, targetId)
    }
    setTargetAktif(null)
    setDipilih(false)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || menempel) return
    if (modeSatuKetukan) {
      klik()
      setDipilih((v) => !v)
      return
    }
    ambil()
    seretRef.current = { x0: e.clientX, y0: e.clientY, bergerak: false }
    setSedangDrag(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Abaikan: perangkat tidak mendukung pointer capture.
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = seretRef.current
    if (!d || modeSatuKetukan) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (Math.abs(dx) + Math.abs(dy) > 10) d.bergerak = true
    aturPos({ x: dx, y: dy })
    setTargetAktif(cekTarget(e.clientX, e.clientY))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = seretRef.current
    seretRef.current = null
    setSedangDrag(false)
    if (!d) return
    if (!d.bergerak) return // Ketuk biasa — ditangani onClick.
    abaikanKlikRef.current = true
    const kena = cekTarget(e.clientX, e.clientY)
    if (kena) {
      lepas()
      selesaikanKe(kena)
    } else {
      lepas()
      aturPos(null)
      setTargetAktif(null)
    }
  }

  const onPointerCancel = () => {
    seretRef.current = null
    setSedangDrag(false)
    aturPos(null)
    setTargetAktif(null)
  }

  const onClickBenda = () => {
    if (abaikanKlikRef.current) {
      abaikanKlikRef.current = false
      return
    }
    if (disabled || menempel) return
    klik()
    setDipilih((v) => !v)
  }

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-drag-benda { display: block; width: 100%; padding: 18px; border-radius: 14px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; }
        .aia-gi-drag-benda.dipilih { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        @media (hover: hover) { .aia-gi-drag-benda:hover { box-shadow: 0 4px 14px rgba(0,0,0,.12); } .aia-gi-drag-target:hover { transform: scale(1.03); box-shadow: 0 4px 14px rgba(0,0,0,.12); } }
        .aia-gi-drag-benda:focus-visible, .aia-gi-drag-target:focus-visible { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-drag-target { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: var(--card, #fff); color: var(--foreground, #111); font-weight: 700; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, outline .15s ease; }
        .aia-gi-drag-target.aktif { outline: 3px solid var(--green, #2f7d4f); outline-offset: 2px; transform: scale(1.05); box-shadow: 0 6px 18px rgba(0,0,0,.18); }
        .aia-gi-drag-target.siap { outline: 2px dashed var(--green, #2f7d4f); outline-offset: 2px; }
        .aia-gi-drag-target.menempel { outline: 3px solid var(--green, #2f7d4f); background: color-mix(in srgb, #2f7d4f 12%, var(--card, #fff)); }
        @media (prefers-reduced-motion: reduce) { .aia-gi-drag-target { transition: none; } }
      `}</style>

      <button
        type="button"
        ref={bendaRef}
        className={`aia-gi-drag-benda${dipilih ? ' dipilih' : ''}`}
        style={{
          transform: pos ? `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x * 0.04}deg)` : undefined,
          transition: sedangDrag || kurangi ? 'none' : 'transform 0.3s ease',
          opacity: menempel ? 0.85 : 1,
          pointerEvents: disabled || menempel ? 'none' : undefined,
        }}
        aria-pressed={dipilih}
        aria-label={`${benda.label}. ${modeSatuKetukan ? 'Ketuk untuk memilih, lalu ketuk target.' : 'Seret ke target yang benar, atau ketuk untuk memilih.'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onClickBenda}
      >
        {benda.konten}
        <strong style={{ display: 'block', marginTop: 6, fontSize: 16 }}>{benda.label}</strong>
        <small className="aia-muted">
          {modeSatuKetukan
            ? dipilih
              ? 'Sudah dipilih — ketuk targetnya'
              : 'Ketuk untuk memilih'
            : dipilih
              ? 'Sudah dipilih — ketuk targetnya'
              : 'Seret ke target, atau ketuk untuk memilih'}
        </small>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${semuaTarget.length}, 1fr)`,
          gap: 10,
        }}
      >
        {semuaTarget.map((t) => (
          <button
            key={t.id}
            type="button"
            ref={(el) => {
              if (el) targetRefs.current.set(t.id, el)
              else targetRefs.current.delete(t.id)
            }}
            className={`aia-gi-drag-target${targetAktif === t.id ? ' aktif' : ''}${dipilih ? ' siap' : ''}${menempel === t.id ? ' menempel' : ''}`}
            style={{
              minHeight: perbesarTarget ? 120 : 88,
              padding: perbesarTarget ? '16px 8px' : '12px 6px',
              fontSize: perbesarTarget ? 16 : 14,
            }}
            disabled={disabled || menempel !== null}
            aria-label={`Target ${t.label}`}
            onClick={() => {
              if (dipilih) selesaikanKe(t.id)
            }}
          >
            {t.ikon}
            {t.label}
            {menempel === t.id ? ' ✓' : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
