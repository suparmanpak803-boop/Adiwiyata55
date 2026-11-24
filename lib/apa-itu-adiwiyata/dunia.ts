// Data dunia mode "Jelajah" kampanye "Apa itu Adiwiyata".
// Denah top-down 960x640: Gerbang di bawah-tengah (titik spawn), zona lain
// tersebar ke atas, koridor utama bebas dari dinding (tengah, kiri, kanan,
// dan dua koridor horizontal) sehingga semua zona bisa dicapai jalan kaki.
// Koordinat dalam satuan dunia; y=0 di atas, y=640 di bawah.
import type { ChapterId } from './types'

export interface ZonaDunia {
  id: string
  nama: string
  chapterId: ChapterId | null
  x: number
  y: number
  w: number
  h: number
  warna: string
}

export interface Dinding {
  x: number
  y: number
  w: number
  h: number
}

export interface NpcDunia {
  id: string
  nama: string
  peran: string
  chapterId: ChapterId | null
  x: number
  y: number
  warna: string
  gerak: boolean
  radiusGerak?: number
}

export interface SampahJatuh {
  x: number
  y: number
}

export const DUNIA: {
  lebar: number
  tinggi: number
  spawn: { x: number; y: number }
  zona: ZonaDunia[]
  dinding: Dinding[]
  sampah: SampahJatuh[]
} = {
  lebar: 960,
  tinggi: 640,
  spawn: { x: 480, y: 580 },
  zona: [
    { id: 'gerbang', nama: 'Gerbang', chapterId: 'gerbang', x: 370, y: 500, w: 220, h: 110, warna: '#f4d35e' },
    { id: 'kantin', nama: 'Kantin', chapterId: 'kantin', x: 40, y: 290, w: 200, h: 140, warna: '#ee964b' },
    { id: 'pos-maggot', nama: 'Pos Maggot', chapterId: 'maggot', x: 720, y: 290, w: 200, h: 140, warna: '#4d8a4f' },
    { id: 'kompos', nama: 'Kompos', chapterId: 'kompos', x: 40, y: 40, w: 200, h: 140, warna: '#8b5a2b' },
    { id: 'kebun', nama: 'Kebun', chapterId: 'kompos', x: 270, y: 40, w: 200, h: 140, warna: '#6a994e' },
    { id: 'taman-air', nama: 'Taman Air', chapterId: 'air-energi', x: 500, y: 40, w: 180, h: 140, warna: '#3b7ea1' },
    { id: 'panel-surya', nama: 'Panel Surya', chapterId: 'air-energi', x: 710, y: 40, w: 210, h: 140, warna: '#7b5ea7' },
    { id: 'pohon', nama: 'Pohon', chapterId: 'biodiversitas', x: 360, y: 250, w: 240, h: 150, warna: '#2d6a4f' },
  ],
  dinding: [
    // Pembatas tepi dunia.
    { x: 0, y: 0, w: 960, h: 12 },
    { x: 0, y: 628, w: 960, h: 12 },
    { x: 0, y: 0, w: 12, h: 640 },
    { x: 948, y: 0, w: 12, h: 640 },
    // Gerbang: dua tiang pagar dengan celah di tengah (jalur keluar ke atas).
    { x: 370, y: 500, w: 90, h: 16 },
    { x: 500, y: 500, w: 90, h: 16 },
    // Bangunan tiap zona (zona tetap bisa dimasuki, bangunan tidak menutupnya).
    { x: 60, y: 310, w: 110, h: 80 }, // gedung kantin
    { x: 790, y: 310, w: 110, h: 80 }, // rumah maggot
    { x: 60, y: 60, w: 100, h: 60 }, // bak kompos
    { x: 290, y: 60, w: 120, h: 40 }, // bedeng kebun 1
    { x: 290, y: 120, w: 120, h: 40 }, // bedeng kebun 2
    { x: 540, y: 70, w: 100, h: 70 }, // kolam taman air
    { x: 740, y: 60, w: 140, h: 60 }, // deret panel surya
    // Pohon di taman Pohon (empat sudut, jalur tengah tetap lewat).
    { x: 368, y: 258, w: 24, h: 24 },
    { x: 568, y: 258, w: 24, h: 24 },
    { x: 368, y: 368, w: 24, h: 24 },
    { x: 568, y: 368, w: 24, h: 24 },
    // Pohon di sela antarzona (bukan di koridor).
    { x: 248, y: 90, w: 24, h: 24 },
    { x: 476, y: 90, w: 24, h: 24 },
    { x: 686, y: 90, w: 24, h: 24 },
    { x: 300, y: 16, w: 24, h: 24 },
    { x: 600, y: 16, w: 24, h: 24 },
    { x: 20, y: 560, w: 24, h: 24 },
  ],
  sampah: [
    { x: 480, y: 545 }, // jalur tengah, di atas Gerbang
    { x: 480, y: 300 }, // tengah taman Pohon
    { x: 480, y: 210 }, // koridor horizontal tengah
    { x: 300, y: 460 }, // koridor kiri bawah
    { x: 300, y: 210 }, // koridor kiri atas
    { x: 660, y: 460 }, // koridor kanan bawah
    { x: 660, y: 210 }, // koridor kanan atas
    { x: 150, y: 460 }, // halaman kiri bawah
    { x: 810, y: 460 }, // halaman kanan bawah
    { x: 150, y: 210 }, // koridor horizontal kiri
    { x: 810, y: 210 }, // koridor horizontal kanan
    { x: 420, y: 460 }, // halaman tengah bawah
  ],
}

export const NPCS: NpcDunia[] = [
  {
    id: 'magi',
    nama: 'Magi',
    peran: 'Maskot Maggot',
    chapterId: 'maggot',
    x: 750,
    y: 360,
    warna: '#2e7d32',
    gerak: false,
  },
  {
    id: 'pak-plastik',
    nama: 'Pak Plastik',
    peran: 'Pengacau lucu',
    chapterId: 'gerbang',
    x: 480,
    y: 560,
    warna: '#f5f5f5',
    gerak: true,
    radiusGerak: 40,
  },
  {
    id: 'kang-kantin',
    nama: 'Kang Kantin',
    peran: 'Penjaga Kantin',
    chapterId: 'kantin',
    x: 200,
    y: 360,
    warna: '#e67e22',
    gerak: false,
  },
  {
    id: 'pak-kebun',
    nama: 'Pak Kebun',
    peran: 'Penjaga Kebun',
    chapterId: 'kompos',
    x: 440,
    y: 90,
    warna: '#8b5a2b',
    gerak: false,
  },
  {
    id: 'mbak-rani',
    nama: 'Mbak Rani',
    peran: 'Penjaga Air & Energi',
    chapterId: 'air-energi',
    x: 660,
    y: 160,
    warna: '#3b7ea1',
    gerak: false,
  },
  {
    id: 'bu-sari',
    nama: 'Bu Sari',
    peran: 'Guru & Tim Inspeksi',
    chapterId: 'biodiversitas',
    x: 620,
    y: 540,
    warna: '#7b5ea7',
    gerak: false,
  },
  {
    id: 'dimas',
    nama: 'Dimas',
    peran: 'Siswa',
    chapterId: null,
    x: 480,
    y: 440,
    warna: '#c0392b',
    gerak: true,
    radiusGerak: 50,
  },
  {
    id: 'sinta',
    nama: 'Sinta',
    peran: 'Siswa',
    chapterId: null,
    x: 270,
    y: 360,
    warna: '#e75480',
    gerak: true,
    radiusGerak: 50,
  },
]
