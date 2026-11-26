'use client'

// HUD dunia bersama Jelajah dan Rumah: bar Lapar/Haus + saldo + peringatan
// rendah. Dipakai di kedua peta supaya perilakunya sama.
//
// - Bar Lapar/Haus beranimasi (transisi lebar CSS 0,5 detik) saat nilainya
//   berubah, bukan lompat. Bila nilai ≤25%, isi bar berubah warna dan
//   muncul ikon + label "Rendah" — warna bukan satu-satunya sinyal.
// - Bila Lapar dan/atau Haus ≤25%, muncul peringatan lembut + tombol
//   "Ke Kantin" (jalan pintas ke Kantin/Toko, BUKAN hukuman: tidak ada
//   progres atau koin yang hilang).
// - Saldo (Rp, Koin Hijau, Koin Daun, Skor Adiwiyata) bertambah dengan
//   animasi hitung naik/turun (count-up) saat berubah, bukan lompat.
// - Teks HUD memakai var(--ink-soft): kontras 6,22:1 di mode terang dan
//   7,33:1 di mode gelap (≥4,5:1). Trek bar memakai var(--muted) supaya
//   tetap terlihat di kedua mode.

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Banknote, Leaf, UtensilsCrossed } from 'lucide-react'

const AMBANG_RENDAH = 25

/** Angka yang bergerak bertahap menuju `nilai` (count-up / count-down).
 * `prefers-reduced-motion: reduce` langsung melompat ke nilai akhir.
 * Nilai awal ditampilkan apa adanya (tanpa animasi saat pertama muncul),
 * kecuali `mulaiDariNol` — dipakai angka hadiah Pos Hijau / rapor yang
 * dihitung naik dari 0 begitu layarnya tampil (R4). */
export function useAngkaAnimasi(nilai: number, durasi = 500, mulaiDariNol = false): number {
  const [tampil, setTampil] = useState(mulaiDariNol ? 0 : nilai)
  const tampilRef = useRef(mulaiDariNol ? 0 : nilai)
  const rafRef = useRef(0)
  useEffect(() => {
    const dari = tampilRef.current
    if (dari === nilai) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tampilRef.current = nilai
      setTampil(nilai)
      return
    }
    const mulai = performance.now()
    const langkah = (t: number) => {
      const k = Math.min(1, (t - mulai) / durasi)
      const eased = 1 - Math.pow(1 - k, 3)
      const v = Math.round(dari + (nilai - dari) * eased)
      tampilRef.current = v
      setTampil(v)
      if (k < 1) rafRef.current = requestAnimationFrame(langkah)
    }
    rafRef.current = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(rafRef.current)
  }, [nilai, durasi])
  return tampil
}

/** Satu angka saldo dengan animasi hitung. `dariNol`: hitung naik dari 0
 * saat pertama tampil (angka hadiah Pos Hijau / rapor). */
export function AngkaAnimasi({
  nilai,
  format,
  dariNol,
}: {
  nilai: number
  format?: (v: number) => string
  dariNol?: boolean
}) {
  const tampil = useAngkaAnimasi(nilai, 500, dariNol ?? false)
  return <>{format ? format(tampil) : tampil.toLocaleString('id-ID')}</>
}

/** Satu bar kebutuhan (Lapar / Haus) dengan peringatan bila rendah. */
function BarKebutuhan({
  label,
  nilai,
  warna,
}: {
  label: 'Lapar' | 'Haus'
  nilai: number
  warna: string
}) {
  const rendah = nilai <= AMBANG_RENDAH
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span>
        {label} <AngkaAnimasi nilai={nilai} />
      </span>
      {rendah && (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 800 }}
          role="status"
        >
          <AlertTriangle aria-hidden="true" />
          <span>Rendah</span>
        </span>
      )}
      <span
        className="aia-hud-bar"
        role="progressbar"
        aria-label={rendah ? `${label} rendah` : label}
        aria-valuenow={nilai}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${nilai}%`, background: rendah ? 'var(--aia-merah)' : warna }} />
      </span>
    </span>
  )
}

/**
 * Baris HUD kedua (Lapar/Haus/Rp/Koin Daun) + peringatan lembut bila
 * Lapar/Haus rendah, dengan tombol jalan pintas ke Kantin.
 */
export function HudStatus({
  lapar,
  haus,
  uang,
  koinDaun,
  onKeKantin,
}: {
  lapar: number
  haus: number
  uang: number
  koinDaun: number
  /** Jalan pintas ke Kantin (peta Kantin, atau langsung Toko bila sudah di sana). */
  onKeKantin: () => void
}) {
  const laparRendah = lapar <= AMBANG_RENDAH
  const hausRendah = haus <= AMBANG_RENDAH
  const teksPeringatan =
    laparRendah && hausRendah
      ? 'Lapar dan haus mulai rendah — mampir ke Kantin, yuk.'
      : laparRendah
        ? 'Lapar mulai rendah — mampir ke Kantin, yuk.'
        : 'Haus mulai rendah — mampir ke Kantin, yuk.'
  return (
    <>
      <div className="aia-hud">
        <BarKebutuhan label="Lapar" nilai={lapar} warna="#e65100" />
        <BarKebutuhan label="Haus" nilai={haus} warna="#1e88e5" />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Banknote aria-hidden="true" /> Rp
          <AngkaAnimasi nilai={uang} />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Leaf aria-hidden="true" /> <AngkaAnimasi nilai={koinDaun} /> Koin Daun
        </span>
      </div>

      {(laparRendah || hausRendah) && (
        <div className="aia-hud aia-hud-peringatan" role="status">
          <AlertTriangle aria-hidden="true" />
          <span style={{ flex: '1 1 200px', minWidth: 0 }}>{teksPeringatan}</span>
          <button type="button" className="aia-btn aia-btn-primary" onClick={onKeKantin}>
            <UtensilsCrossed aria-hidden="true" /> Ke Kantin
          </button>
        </div>
      )}
    </>
  )
}
