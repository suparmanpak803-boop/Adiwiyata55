// TapSpam — ketuk berulang, mis. mencangkul atau mengaduk (Pointer Events).
// Selesai setelah jumlah ketukan tercapai; tiap ketukan langsung memberi
// animasi + bunyi. Mode satu-ketukan: jumlah ketukan yang dibutuhkan
// menjadi setengah (dibulatkan ke atas). Generik: tanpa konten misi.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { benar, getar, klik, koin } from '../suara'
import { useKurangiAnimasi } from './util'

export interface TapSpamProps {
  label: string
  jumlahKetukan: number
  ikon?: ReactNode
  /** Bila true, jumlah ketukan yang dibutuhkan menjadi setengah. */
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Bila true, permainan dijeda. Komponen ini tidak punya jam sendiri,
   *  jadi prop diterima saja. */
  terjeda?: boolean
  onSelesai: () => void
  onKetuk?: (sisa: number) => void
}

export function TapSpam({
  label,
  jumlahKetukan,
  ikon,
  modeSatuKetukan = false,
  disabled = false,
  onSelesai,
  onKetuk,
}: TapSpamProps) {
  const kurangi = useKurangiAnimasi()
  const target = Math.max(1, modeSatuKetukan ? Math.ceil(jumlahKetukan / 2) : jumlahKetukan)
  const [hitung, setHitung] = useState(0)
  const selesaiRef = useRef(false)

  // Tahap baru (jumlah ketukan berubah) = mulai dari nol lagi.
  useEffect(() => {
    setHitung(0)
    selesaiRef.current = false
  }, [jumlahKetukan])

  const ketuk = () => {
    if (disabled || selesaiRef.current) return
    const baru = hitung + 1
    setHitung(baru)
    klik()
    getar(10)
    onKetuk?.(Math.max(0, target - baru))
    if (baru >= target) {
      selesaiRef.current = true
      benar()
      koin()
      onSelesai()
    }
  }

  const persen = Math.min(100, (hitung / target) * 100)

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-ketuk { display: block; width: 100%; min-height: 120px; padding: 20px; border-radius: 14px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
        .aia-gi-ketuk:active { transform: scale(.97); }
        .aia-gi-ketuk-ikon { display: inline-block; animation: aia-gi-pop .18s ease; }
        @keyframes aia-gi-pop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .aia-gi-ketuk:active { transform: none; } .aia-gi-ketuk-ikon { animation: none; } }
      `}</style>

      <button
        type="button"
        className="aia-gi-ketuk"
        disabled={disabled || selesaiRef.current}
        aria-label={`${label}. Ketuk ${target} kali. Sudah ${hitung} dari ${target}.`}
        onPointerDown={ketuk}
      >
        <span key={hitung} className="aia-gi-ketuk-ikon" aria-hidden="true">
          {ikon}
        </span>
        <strong style={{ display: 'block', marginTop: 8, fontSize: 18 }}>{label}</strong>
        <small className="aia-muted">
          {hitung} / {target} ketukan
          {modeSatuKetukan ? ' (mode mudah)' : ''}
        </small>
      </button>

      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={hitung}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`Progres ${label}`}
      >
        <span style={{ width: `${persen}%` }} />
      </div>
      <p className="aia-muted" style={{ textAlign: 'center', margin: 0 }}>
        {kurangi ? 'Ketuk tombol di atas.' : 'Ketuk berulang kali sampai penuh!'}
      </p>
    </div>
  )
}
