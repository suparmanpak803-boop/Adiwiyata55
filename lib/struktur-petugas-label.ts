// Label dan daftar ikon/warna tim untuk editor admin.
//
// Modul ini CLIENT-SAFE: tanpa impor apa pun, tanpa akses DB.
// Dipakai komponen klien (editor admin) dan modul server
// (lib/struktur-petugas-data.ts). Jangan pindahkan konstanta ini
// ke modul yang mengimpor pool/pg — komponen klien tidak boleh
// mengimpor nilai dari modul server.
import type { IkonTim, WarnaTim } from '@/lib/struktur-petugas-data'

export const IKON_TIM: IkonTim[] = [
  'daur-ulang',
  'taman',
  'air-energi',
  'kantin',
  'kompos',
  'pohon',
  'bunga',
  'tunas',
  'matahari',
  'petir',
  'daun',
  'grafik',
  'pesan',
]

export const IKON_TIM_LABEL: Record<IkonTim, string> = {
  'daur-ulang': 'Daur ulang',
  taman: 'Taman',
  'air-energi': 'Air dan energi',
  kantin: 'Kantin',
  kompos: 'Kompos',
  pohon: 'Pohon',
  bunga: 'Bunga',
  tunas: 'Tunas',
  matahari: 'Matahari',
  petir: 'Energi (petir)',
  daun: 'Daun',
  grafik: 'Data (grafik)',
  pesan: 'Komunikasi (pesan)',
}

export const WARNA_TIM: WarnaTim[] = ['hijau', 'daun', 'air', 'matahari', 'tanah']

export const WARNA_TIM_LABEL: Record<WarnaTim, string> = {
  hijau: 'Hijau',
  daun: 'Daun',
  air: 'Air',
  matahari: 'Matahari',
  tanah: 'Tanah',
}
