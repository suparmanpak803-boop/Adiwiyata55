// Sistem 5 Bak SMAN 55 — satu sumber data untuk warna, nama, dan hadiah
// pilah. Dipakai misi Pilah, Tempat Sampah Terpilah di dunia Jelajah, dan
// Cara Bermain, supaya warnanya tidak ditulis ulang di tiap file.
// Warna persis sistem asli SMAN 55.
import type { TongSampah } from '../types'

export interface BakInfo {
  id: TongSampah
  nama: string
  /** Singkatan untuk label kecil di canvas dunia. */
  singkatan: string
  warna: string
  teks: string
}

export const BAK: BakInfo[] = [
  { id: 'organik', nama: 'Organik', singkatan: 'Org', warna: '#4d8a4f', teks: '#ffffff' },
  { id: 'anorganik', nama: 'Anorganik', singkatan: 'Anorg', warna: '#3b7ea1', teks: '#ffffff' },
  { id: 'kertas', nama: 'Kertas', singkatan: 'Kertas', warna: '#c98a2e', teks: '#ffffff' },
  { id: 'residu', nama: 'Residu', singkatan: 'Residu', warna: '#7a7a7a', teks: '#ffffff' },
  { id: 'b3', nama: 'B3', singkatan: 'B3', warna: '#a13b3b', teks: '#ffffff' },
]

export const NAMA_BAK: Record<TongSampah, string> = {
  organik: 'Organik',
  anorganik: 'Anorganik',
  kertas: 'Kertas',
  residu: 'Residu',
  b3: 'B3',
}

export function infoBak(id: TongSampah): BakInfo {
  return BAK.find((b) => b.id === id) ?? BAK[0]
}

/**
 * Warna latar TOMBOL bak (C-2): versi lebih gelap dari warna sistem di
 * atas, supaya teks putih di atasnya mencapai kontras ≥4,5:1 (AA).
 * Warna sistem SMAN 55 di BAK TIDAK diubah — peta ini hanya untuk latar
 * tombol (dialog Pilah di Jelajah, tombol bak di Pilah, tombol kelompok
 * di Bank Sampah). Kontras putih di atasnya: Organik 6,29:1, Anorganik
 * 6,80:1, Kertas 5,63:1, Residu 6,39:1, B3 6,55:1.
 */
export const WARNA_TOMBOL_BAK: Record<TongSampah, string> = {
  organik: '#3a6b38',
  anorganik: '#2c6178',
  kertas: '#8a5f14',
  residu: '#5f5f5f',
  b3: '#a13b3b',
}

export function warnaTombolBak(id: TongSampah): string {
  return WARNA_TOMBOL_BAK[id] ?? WARNA_TOMBOL_BAK.organik
}

/** Hadiah memilah 1 sampah liar ke bak yang benar di Tempat Sampah Terpilah. */
export const HADIAH_PILAH_KOIN = 5
export const HADIAH_PILAH_UANG = 200
