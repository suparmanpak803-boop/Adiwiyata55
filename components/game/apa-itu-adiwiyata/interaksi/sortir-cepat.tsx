// SortirCepat — item muncul satu per satu di "ban berjalan" dengan bar
// waktu per item; pemain mengetuk tombol target sebelum waktu habis.
// Benar = poin + bunyi benar; salah atau habis waktu = bunyi salah, lalu
// lanjut ke item berikutnya. Mode satu-ketukan: waktu per item 2× lipat.
// Skor 0–100 = persen jawaban benar. Generik: tidak ada konten misi.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { benar, getar, koin, salah } from '../suara'
import { useKurangiAnimasi } from './util'
import { EfekBenar, EfekSalah } from './umpan-balik'

export interface ItemSortir {
  id: string
  label: string
  target: string
  ikon?: ReactNode
}

export interface TargetSortir {
  id: string
  label: string
  ikon?: ReactNode
}

export interface SortirCepatProps {
  item: ItemSortir[]
  target: TargetSortir[]
  waktuPerItemMs?: number
  modeSatuKetukan?: boolean
  disabled?: boolean
  /** Jeda: bekukan hitung mundur waktu per item. */
  terjeda?: boolean
  onSelesai: (skor: number) => void
}

export function SortirCepat({
  item,
  target,
  waktuPerItemMs = 4000,
  modeSatuKetukan = false,
  disabled = false,
  terjeda = false,
  onSelesai,
}: SortirCepatProps) {
  const kurangi = useKurangiAnimasi()
  const waktu = modeSatuKetukan ? waktuPerItemMs * 2 : waktuPerItemMs
  const [idx, setIdx] = useState(0)
  const [sisaMs, setSisaMs] = useState(waktu)
  const [benarHitung, setBenarHitung] = useState(0)
  const [umpan, setUmpan] = useState<'benar' | 'salah' | null>(null)
  const [selesai, setSelesai] = useState(false)

  const selesaiRef = useRef(false)
  const umpanTimerRef = useRef<number | null>(null)
  const onSelesaiRef = useRef(onSelesai)
  onSelesaiRef.current = onSelesai
  const benarRef = useRef(0)
  const idxRef = useRef(0)
  idxRef.current = idx
  const terjedaRef = useRef(terjeda)
  useEffect(() => {
    terjedaRef.current = terjeda
  }, [terjeda])

  useEffect(
    () => () => {
      if (umpanTimerRef.current) window.clearTimeout(umpanTimerRef.current)
    },
    [],
  )

  // Reset waktu tiap item baru.
  useEffect(() => {
    setSisaMs(waktu)
  }, [idx, waktu])

  const tampilUmpan = (jenis: 'benar' | 'salah') => {
    setUmpan(jenis)
    if (umpanTimerRef.current) window.clearTimeout(umpanTimerRef.current)
    umpanTimerRef.current = window.setTimeout(() => setUmpan(null), 800)
  }

  const akhiri = (totalBenar: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    const skor = item.length > 0 ? Math.round((totalBenar / item.length) * 100) : 100
    koin()
    setSelesai(true)
    onSelesaiRef.current(skor)
  }

  const lanjut = (totalBenar: number) => {
    const berikutnya = idxRef.current + 1
    if (berikutnya >= item.length) {
      akhiri(totalBenar)
      return
    }
    setIdx(berikutnya)
  }

  // Hitung mundur per item.
  useEffect(() => {
    if (selesai || item.length === 0) return
    const id = window.setInterval(() => {
      // Jeda: lewati tick supaya sisa waktu tidak berkurang selama jeda.
      if (terjedaRef.current) return
      setSisaMs((s) => Math.max(0, s - 100))
    }, 100)
    return () => window.clearInterval(id)
  }, [idx, selesai, item.length])

  // Waktu habis = salah, lanjut item berikutnya.
  useEffect(() => {
    if (selesai || sisaMs > 0) return
    salah()
    getar([40, 40, 40])
    tampilUmpan('salah')
    lanjut(benarRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sisaMs, selesai])

  const jawab = (targetId: string) => {
    if (disabled || selesaiRef.current) return
    const kini = item[idxRef.current]
    if (!kini) return
    if (targetId === kini.target) {
      const baru = benarRef.current + 1
      benarRef.current = baru
      setBenarHitung(baru)
      benar()
      getar(20)
      tampilUmpan('benar')
      lanjut(baru)
    } else {
      salah()
      getar([40, 40, 40])
      tampilUmpan('salah')
      lanjut(benarRef.current)
    }
  }

  const kini = item[idx]
  const persenWaktu = waktu > 0 ? (sisaMs / waktu) * 100 : 100
  const detik = Math.ceil(sisaMs / 1000)

  return (
    <div className="aia-stack">
      <style>{`
        .aia-gi-sortir-ban { position: relative; min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 18px; border: 1px solid var(--line, #e5e7eb); border-radius: 14px; background: repeating-linear-gradient(90deg, var(--card, #fff) 0 26px, color-mix(in srgb, #2f7d4f 8%, var(--card, #fff)) 26px 28px); color: var(--foreground, #111); }
        .aia-gi-sortir-target { min-height: 64px; min-width: 64px; padding: 12px 10px; border-radius: 14px; border: 1px solid var(--line, #e5e7eb); background: var(--card, #fff); color: var(--foreground, #111); font-weight: 700; font-size: 15px; cursor: pointer; touch-action: manipulation; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
        .aia-gi-sortir-target:active { transform: scale(.96); }
        @media (prefers-reduced-motion: reduce) { .aia-gi-sortir-target:active { transform: none; } }
      `}</style>

      <div className="aia-stats" aria-label="Progres sortir">
        <span className="aia-stat">
          Item {Math.min(idx + 1, item.length)}/{item.length}
        </span>
        <span className="aia-stat">Benar {benarHitung}</span>
        <span className="aia-stat" aria-label={`Sisa waktu ${detik} detik`}>
          ⏱ {detik} detik
        </span>
      </div>

      <div
        className="aia-progress"
        role="progressbar"
        aria-valuenow={detik}
        aria-valuemin={0}
        aria-valuemax={Math.ceil(waktu / 1000)}
        aria-label="Sisa waktu item ini"
      >
        <span style={{ width: `${persenWaktu}%` }} />
      </div>

      <div className="aia-gi-sortir-ban" aria-live="polite">
        <EfekBenar tampil={umpan === 'benar'} label="Benar!" />
        {kini && !selesai ? (
          <>
            {kini.ikon}
            <strong style={{ fontSize: 20 }}>{kini.label}</strong>
            <small className="aia-muted">
              {kurangi ? 'Ketuk target yang benar.' : 'Cepat! Masukkan ke target yang benar.'}
            </small>
          </>
        ) : (
          <strong style={{ fontSize: 18 }}>Selesai! Semua item sudah disortir.</strong>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(1, target.length)}, 1fr)`,
          gap: 10,
        }}
      >
        {target.map((t) => (
          <button
            key={t.id}
            type="button"
            className="aia-gi-sortir-target"
            disabled={disabled || selesai}
            aria-label={`Target ${t.label}`}
            onClick={() => jawab(t.id)}
          >
            {t.ikon}
            {t.label}
          </button>
        ))}
      </div>

      <EfekSalah tampil={umpan === 'salah'} petunjuk="Belum tepat — perhatikan lagi itemnya." />
    </div>
  )
}
