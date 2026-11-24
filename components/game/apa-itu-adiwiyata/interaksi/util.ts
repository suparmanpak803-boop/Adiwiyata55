// Helper bersama pustaka interaksi gestur (Pointer Events, touch + mouse).
// Dipakai semua komponen di folder ini; tidak ada konten misi di sini.

import { useEffect, useState } from 'react'

/** Batasi nilai ke rentang [min, maks]. */
export function clamp(nilai: number, min: number, maks: number): number {
  return Math.min(maks, Math.max(min, nilai))
}

/** Acak urutan salinan array (Fisher-Yates). */
export function acak<T>(daftar: T[]): T[] {
  const salin = [...daftar]
  for (let i = salin.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = salin[i]
    salin[i] = salin[j]
    salin[j] = tmp
  }
  return salin
}

/** True bila pengguna meminta kurangi animasi (prefers-reduced-motion). */
export function useKurangiAnimasi(): boolean {
  const [kurangi, setKurangi] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setKurangi(mq.matches)
    const onUbah = (e: MediaQueryListEvent) => setKurangi(e.matches)
    mq.addEventListener('change', onUbah)
    return () => mq.removeEventListener('change', onUbah)
  }, [])
  return kurangi
}

/**
 * Sudut (derajat) dari titik pusat ke titik lain.
 * 0 = kanan, 90 = bawah, -90 = atas (koordinat layar, y ke bawah).
 */
export function sudutDariPusat(px: number, py: number, cx: number, cy: number): number {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI
}

/** Selisih sudut ternormalisasi ke rentang [-180, 180]. */
export function deltaSudut(dari: number, ke: number): number {
  let d = (ke - dari) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}
