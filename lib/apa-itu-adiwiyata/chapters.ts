// Metadata 6 bab kampanye "Apa itu Adiwiyata".
// Konten isi (dialog, fakta, soal) ada di lib/apa-itu-adiwiyata/content/
// dan dibuat agen lain; file ini hanya berisi data struktur bab dan peta.

import type { LucideIcon } from 'lucide-react'
import { Bug, DoorOpen, Droplets, Sprout, Trees, UtensilsCrossed } from 'lucide-react'
import type { ChapterId } from './types'

export type ChapterIconName = 'DoorOpen' | 'UtensilsCrossed' | 'Bug' | 'Sprout' | 'Droplets' | 'Trees'

export const CHAPTER_ICONS: Record<ChapterIconName, LucideIcon> = {
  DoorOpen,
  UtensilsCrossed,
  Bug,
  Sprout,
  Droplets,
  Trees,
}

export interface ChapterMeta {
  id: ChapterId
  judul: string
  deskripsi: string
  menit: number
  /** Zona peta sekolah yang dibuka bab ini. */
  zona: string[]
  icon: ChapterIconName
}

export const CHAPTER_ORDER: ChapterId[] = ['gerbang', 'kantin', 'maggot', 'kompos', 'air-energi', 'biodiversitas']

export const CHAPTERS: Record<ChapterId, ChapterMeta> = {
  gerbang: {
    id: 'gerbang',
    judul: 'Gerbang Sekolah',
    deskripsi: 'Hari pertama sebagai siswa baru. Apa saja yang wajib ada di tasmu?',
    menit: 8,
    zona: ['Gerbang'],
    icon: 'DoorOpen',
  },
  kantin: {
    id: 'kantin',
    judul: 'Kantin',
    deskripsi: 'Pilah sampah kantin ke tong yang benar. Organik jadi pakan maggot.',
    menit: 10,
    zona: ['Kantin'],
    icon: 'UtensilsCrossed',
  },
  maggot: {
    id: 'maggot',
    judul: 'Pos Maggot',
    deskripsi: 'Rawat larva maggot Black Soldier Fly dan panen pakan ikan serta kasgot.',
    menit: 10,
    zona: ['Pos Maggot'],
    icon: 'Bug',
  },
  kompos: {
    id: 'kompos',
    judul: 'Kompos dan Kebun',
    deskripsi: 'Susun lapisan kompos dengan rasio tepat, lalu rawat cabai dan kangkung.',
    menit: 10,
    zona: ['Kompos', 'Kebun'],
    icon: 'Sprout',
  },
  'air-energi': {
    id: 'air-energi',
    judul: 'Air dan Energi',
    deskripsi: 'Buat biopori, tampung air hujan, dan buru lampu, AC, dan keran yang boros.',
    menit: 10,
    zona: ['Taman Air', 'Panel Surya'],
    icon: 'Droplets',
  },
  biodiversitas: {
    id: 'biodiversitas',
    judul: 'Biodiversitas dan Inspeksi',
    deskripsi: 'Tanam pohon, sambut burung dan kupu-kupu, lalu hadapi Inspeksi Tim Adiwiyata.',
    menit: 12,
    zona: ['Pohon'],
    icon: 'Trees',
  },
}

export interface ZoneMeta {
  id: string
  label: string
  chapterId: ChapterId
}

export const ZONES: ZoneMeta[] = [
  { id: 'gerbang', label: 'Gerbang', chapterId: 'gerbang' },
  { id: 'kantin', label: 'Kantin', chapterId: 'kantin' },
  { id: 'pos-maggot', label: 'Pos Maggot', chapterId: 'maggot' },
  { id: 'kompos', label: 'Kompos', chapterId: 'kompos' },
  { id: 'kebun', label: 'Kebun', chapterId: 'kompos' },
  { id: 'taman-air', label: 'Taman Air', chapterId: 'air-energi' },
  { id: 'panel-surya', label: 'Panel Surya', chapterId: 'air-energi' },
  { id: 'pohon', label: 'Pohon', chapterId: 'biodiversitas' },
]

/** Total menit seluruh kampanye (±60 menit). */
export const TOTAL_MENIT = CHAPTER_ORDER.reduce((total, id) => total + CHAPTERS[id].menit, 0)
