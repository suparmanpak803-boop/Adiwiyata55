// Data Toko Kantin — bar lapar/haus, uang (Rp), Koin Daun, gear, pohon, kostum.
// Harga dan efek sudah diputuskan user (25 Nov 2026). Angka di sini adalah
// harga permainan, bukan harga asli kantin sekolah.

import type { CampaignSave } from '../types'

/** Durasi buff gear: 10 menit waktu nyata sejak dibeli (Date.now()).
 * Berlaku untuk semua gear yang efeknya berjalan (bukan sekali pakai):
 * tumbler, tas-kain, lunch-box, sepatu-eco, pin-duta. */
export const BUFF_GEAR_MS = 10 * 60 * 1000

/** Id gear yang efeknya berupa buff 10 menit (bukan sekali pakai). */
export type BuffGearId = 'tumbler' | 'tas-kain' | 'lunch-box' | 'sepatu-eco' | 'pin-duta'

/** True bila buff gear masih berlaku: batas akhirnya tersimpan dan
 * Date.now() masih di bawahnya. Tanpa batas akhir (belum pernah dibeli /
 * save lama) atau sudah lewat -> false. Kedaluwarsa = tidak aktif, bukan
 * dihapus paksa — kepemilikan gear di inventaris tetap ada. */
export function buffAktif(
  save: Pick<CampaignSave, 'buffBerakhir'> | null | undefined,
  gearId: string,
): boolean {
  if (!save) return false
  const berakhir = (save.buffBerakhir ?? {})[gearId]
  return typeof berakhir === 'number' && Number.isFinite(berakhir) && Date.now() < berakhir
}

/** Sisa waktu buff dalam menit (dibulatkan ke atas, 0 bila tidak aktif).
 * Dipakai tampilan "tersisa N mnt" di Toko dan Profil. */
export function sisaBuffMenit(
  save: Pick<CampaignSave, 'buffBerakhir'> | null | undefined,
  gearId: string,
): number {
  if (!save) return 0
  const berakhir = (save.buffBerakhir ?? {})[gearId]
  if (typeof berakhir !== 'number' || !Number.isFinite(berakhir)) return 0
  return Math.max(0, Math.ceil((berakhir - Date.now()) / 60_000))
}

/** Teks sisa buff untuk gear yang dimiliki: "tersisa N mnt" bila aktif,
 * "kedaluwarsa" bila batas akhirnya sudah lewat (atau tidak tercatat —
 * mis. save lama dari masa efek gear masih permanen). */
export function teksSisaBuff(
  save: Pick<CampaignSave, 'buffBerakhir'> | null | undefined,
  gearId: string,
): string {
  return buffAktif(save, gearId) ? `tersisa ${sisaBuffMenit(save, gearId)} mnt` : 'kedaluwarsa'
}

/** Bekal darurat di layar lemas: +20 lapar, 1x per hari kalender lokal
 * (lihat PAKAI_BEKAL_DARURAT di context). */
export const BEKAL_DARURAT_LAPAR = 20

export interface MakananToko {
  id: string
  nama: string
  harga: number
  lapar: number
  deskripsi: string
}

export interface MinumanToko {
  id: string
  nama: string
  harga: number
  haus: number
  deskripsi: string
}

export interface GearToko {
  id: string
  nama: string
  hargaKoinDaun: number
  efek: string
  deskripsi: string
}

export interface KostumToko {
  id: string
  nama: string
  hargaKoinDaun: number
  /** Warna baju tokoh pemain di canvas Jelajah bila kostum ini dipakai. */
  baju: string
  kerah: string
  /** Warna rambut/topi tokoh pemain (bila tidak diisi, rambut biasa). */
  rambut?: string
  deskripsi: string
}

/** Makanan (bayar Rp, pulihkan lapar). */
export const MAKANAN: MakananToko[] = [
  { id: 'nasi-lauk', nama: 'Nasi Lauk', harga: 8000, lapar: 50, deskripsi: 'Seporsi nasi dengan lauk kantin. Paling mengenyangkan.' },
  { id: 'roti-isi', nama: 'Roti Isi', harga: 5000, lapar: 30, deskripsi: 'Roti isi sayur dan telur, praktis dibawa.' },
  { id: 'buah-potong', nama: 'Buah Potong', harga: 3000, lapar: 20, deskripsi: 'Potongan buah segar dari kebun sekolah.' },
]

/** Minuman (bayar Rp, pulihkan haus). */
export const MINUMAN: MinumanToko[] = [
  { id: 'air-mineral', nama: 'Air Mineral', harga: 3000, haus: 40, deskripsi: 'Air minum kemasan isi ulang.' },
  { id: 'jus-buah', nama: 'Jus Buah', harga: 5000, haus: 50, deskripsi: 'Jus buah segar tanpa gula tambahan.' },
  { id: 'es-teh', nama: 'Es Teh', harga: 4000, haus: 30, deskripsi: 'Es teh manis, dingin dan menyegarkan.' },
]

/** Gratis, tanpa batas maupun jatah harian (lihat PAKAI_BEKAL di context). */
export const AIR_KERAN_HAUS = 15
export const BEKAL_LAPAR = 30
export const BEKAL_LAPAR_LUNCH_BOX = 50
export const BEKAL_JATAH = 1
export const BEKAL_JATAH_LUNCH_BOX = 2

/** Gear (bayar Koin Daun; efeknya buff 10 menit sejak dibeli, bisa dibeli
 * lagi untuk memperpanjang 10 menit — lihat buffBerakhir di types.ts). */
export const GEAR: GearToko[] = [
  {
    id: 'tumbler',
    nama: 'Tumbler',
    hargaKoinDaun: 30,
    efek: 'Haus berkurang setengah tiap tahap selesai, selama 10 menit sejak dibeli.',
    deskripsi: 'Tumbler guna ulang. Bawa minum sendiri, hemat dan tidak menambah sampah.',
  },
  {
    id: 'tas-kain',
    nama: 'Tas Kain',
    hargaKoinDaun: 25,
    efek: '+5 Koin Hijau tiap tahap selesai, selama 10 menit sejak dibeli.',
    deskripsi: 'Tas kain kuat untuk belanja dan membawa bekal, ganti kantong plastik.',
  },
  {
    id: 'lunch-box',
    nama: 'Lunch Box',
    hargaKoinDaun: 30,
    efek: 'Bekal rumah jadi +50 lapar dan 2x sehari, selama 10 menit sejak dibeli.',
    deskripsi: 'Kotak bekal guna ulang. Bekal dari rumah lebih mengenyangkan dan lebih sering.',
  },
]

/** Harga 1 pohon dalam Koin Daun; menanam 1 pohon menaikkan rapor hijau +5. */
export const HARGA_POHON_KOIN_DAUN = 100
export const POHON_HIJAU = 5

/** Skor Adiwiyata: +5 per pohon ditanam, +20 saat membeli Panel Surya,
 * +5 saat satu misi utama selesai pertama kali (bukan ulangan). */
export const SKOR_POHON = 5
export const SKOR_PANEL_SURYA = 20
export const SKOR_MISI_PERTAMA = 5

/** Item Eco-Shop (bayar Koin Hijau). Sepatu Eco-Runner dan Pin Duta:
 * buff 10 menit sejak dibeli, bisa dibeli lagi untuk memperpanjang.
 * Panel Surya: sekali beli — Skor Adiwiyata +20 langsung masuk saat
 * pembelian dan tetap (bukan buff, jadi tidak kedaluwarsa). */
export interface ItemEcoShop {
  id: string
  nama: string
  hargaKoinHijau: number
  efek: string
  deskripsi: string
}

export const ECO_SHOP: ItemEcoShop[] = [
  {
    id: 'sepatu-eco',
    nama: 'Sepatu Eco-Runner',
    hargaKoinHijau: 150,
    efek: 'Kecepatan jalan +35%, selama 10 menit sejak dibeli.',
    deskripsi: 'Sepatu lari ringan dari bahan daur ulang. Jalanmu di rumah dan di sekolah jadi lebih cepat.',
  },
  {
    id: 'pin-duta',
    nama: 'Pin Duta Adiwiyata',
    hargaKoinHijau: 100,
    efek: 'Aura hijau di sekitarmu + diskon 25% di kantin, selama 10 menit sejak dibeli.',
    deskripsi: 'Pin hijau Duta Adiwiyata. Makanan dan minuman di kantin jadi lebih murah.',
  },
  {
    id: 'panel-surya',
    nama: 'Panel Surya',
    hargaKoinHijau: 200,
    efek: 'Panel biru di atap sekolah + Skor Adiwiyata +20.',
    deskripsi: 'Panel surya di atap gedung sekolah. Sekolahmu makin hemat energi.',
  },
]

/** Harga kantin setelah diskon Duta 25% (bila punya Pin Duta): harga
 * dikali 0,75 lalu dibulatkan ke bawah ke kelipatan 100 terdekat supaya
 * tetap rapi — mis. 8000 -> 6000, 5000 -> 3700, 3000 -> 2200. */
export function hargaDiskonDuta(harga: number): number {
  return Math.floor((harga * 0.75) / 100) * 100
}

/** Kostum (bayar Koin Daun, sekali beli, bisa dipakai bergantian). */
export const KOSTUM: KostumToko[] = [
  {
    id: 'baju-hijau',
    nama: 'Baju Hijau',
    hargaKoinDaun: 40,
    baju: '#2e7d32',
    kerah: '#f5f5f5',
    deskripsi: 'Seragam hijau Adiwiyata. Baju tokohmu jadi hijau di dunia.',
  },
  {
    id: 'topi-magi',
    nama: 'Topi Magi',
    hargaKoinDaun: 50,
    baju: '#ffb74d',
    kerah: '#2e7d32',
    rambut: '#e65100',
    deskripsi: 'Topi oranye ala Magi. Baju jadi oranye dan rambutmu jadi topi Magi.',
  },
  {
    id: 'syal-daun',
    nama: 'Syal Daun',
    hargaKoinDaun: 30,
    baju: '#a5d6a7',
    kerah: '#1b5e20',
    deskripsi: 'Syal dan baju hijau muda. Baju tokohmu jadi hijau muda.',
  },
]

/** Warna seragam biasa (tanpa kostum). */
export const WARNA_BAJU_BIASA = { baju: '#f5f5f5', kerah: '#2e7d32', rambut: '#4e342e' }

export interface WarnaKostum {
  baju: string
  kerah: string
  rambut: string
}

/** Warna baju tokoh pemain dari kostum yang dipakai (null/tidak dikenal = biasa). */
export function warnaKostum(kostumDipakai: string | null | undefined): WarnaKostum {
  if (!kostumDipakai) return WARNA_BAJU_BIASA
  const kostum = KOSTUM.find((k) => k.id === kostumDipakai)
  if (!kostum) return WARNA_BAJU_BIASA
  return { baju: kostum.baju, kerah: kostum.kerah, rambut: kostum.rambut ?? WARNA_BAJU_BIASA.rambut }
}

/** Jatah bekal hari ini (sisa), dari state bekal di save. */
export function sisaBekal(
  bekalTanggal: string | null | undefined,
  bekalDipakai: number | undefined,
  hariIni: string,
  punyaLunchBox: boolean,
): number {
  const jatah = punyaLunchBox ? BEKAL_JATAH_LUNCH_BOX : BEKAL_JATAH
  const dipakai = bekalTanggal === hariIni ? (bekalDipakai ?? 0) : 0
  return Math.max(0, jatah - dipakai)
}
