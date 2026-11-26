// Tipe data model kampanye "Apa itu Adiwiyata".
// Nama field TIDAK BOLEH diubah: dipakai agen mini-game dan sistem pendukung.

import type { DuniaHidup } from './dunia-hidup'

export type ChapterId = 'gerbang' | 'kantin' | 'maggot' | 'kompos' | 'air-energi' | 'biodiversitas'
export type TongSampah = 'organik' | 'anorganik' | 'kertas' | 'residu' | 'b3'

/** Status Pak Plastik dalam alur Cerita Bercabang (lihat content/cerita.ts). */
export type PakPlastikStatus = 'netral' | 'dibujuk' | 'dilawan' | 'dijebak'

// Trek paralel "Misi Kader": 8 misi penuh (masing-masing 3 tahap) untuk
// 8 tim kader yang belum tercakup kampanye 6 bab. Trek ini independen dari
// bab utama: semua misi tersedia sejak awal, tidak berantai.
export type TugasKaderId =
  | 'bank-sampah'
  | 'lingkungan-sehat'
  | 'edu-lingkungan'
  | 'inovasi-hijau'
  | 'kantin-hijau'
  | 'data-hijau'
  | 'eco-communication'
  | 'jejaring-hijau'

export const TUGAS_ORDER: TugasKaderId[] = [
  'bank-sampah',
  'lingkungan-sehat',
  'edu-lingkungan',
  'inovasi-hijau',
  'kantin-hijau',
  'data-hijau',
  'eco-communication',
  'jejaring-hijau',
]

export type StageStatus = 'locked' | 'open' | 'done'

export interface StageProgress {
  status: StageStatus
  bestScore: number
}

export interface ChapterProgress {
  stages: [StageProgress, StageProgress, StageProgress]
  done: boolean
  badgeEarned: boolean
}

/** Cermin ChapterProgress untuk satu Misi Kader. */
export interface TugasProgress {
  stages: [StageProgress, StageProgress, StageProgress]
  done: boolean
  badgeEarned: boolean
}

export interface Report {
  sampah: number
  energi: number
  air: number
  hijau: number
  biodiversitas: number
}

export interface Carryover {
  maggotKenaMinyak: boolean
  komposBau: boolean
}

/** Jenis kelamin karakter pemain: 'siswa' (celana panjang) atau 'siswi'
 * (rok). null = permainan baru yang belum memilih karakter. */
export type JenisKelamin = 'siswa' | 'siswi'

/** Peta yang sedang dibuka: 'rumah' (titik awal permainan baru) atau salah
 * satu peta sekolah (dunia Jelajah). Save lama 'sekolah' dipetakan ke
 * 'gerbang' saat dimuat (lihat loadSave). */
export type PetaAktif = 'rumah' | 'gerbang' | 'kantin' | 'kebun' | 'maggot' | 'taman'

export interface CampaignSave {
  version: 1
  nickname: string
  hideName: boolean
  /** Karakter yang dipilih pemain (null = belum pilih, hanya di permainan baru). */
  jenisKelamin: JenisKelamin | null
  coins: number
  streak: { count: number; lastDay: string | null; multiplierActive: boolean }
  chapters: Record<ChapterId, ChapterProgress>
  tugas: Record<TugasKaderId, TugasProgress>
  bestScores: Record<string, number>
  unlockedCards: string[]
  badges: string[]
  report: Report
  carryover: Carryover
  species: string[]
  muted: boolean
  volumeMusik: number
  volumeEfek: number
  /** Mode satu-ketukan: mini-game memakai versi tombol (tanpa gestur seret/putar/tahan). */
  modeSatuKetukan: boolean
  /** Simulasi Dunia Hidup: kebun, maggot, sampah liar (lihat dunia-hidup.ts). */
  dunia: DuniaHidup
  /** Pilihan Cerita Bercabang: kunci `${misi}:${titikId}` -> id opsi (lihat content/cerita.ts). */
  cerita: Record<string, string>
  /** Status Pak Plastik dalam alur Cerita Bercabang. */
  pakPlastik: PakPlastikStatus
  /** Skor terbaik dua game arkade di dunia (Tangkap Sampah, Kuis Adiwiyata). */
  arkade: { tangkap: number; kuis: number }
  /** Batas harian arkade (F13): tanggal lokal (YYYY-MM-DD) terakhir koin
   * arkade diberikan + total Koin Hijau arkade hari itu (maks 150/hari
   * gabungan kedua game). Save lama tanpa field ini -> null / 0. */
  arkadeTanggal: string | null
  arkadeKoinHariIni: number
  /** Bar lapar & haus (0-100). Berkurang tiap tahap selesai dan tiap hari
   * berlalu di Dunia Hidup; dipulihkan lewat Kantin / bekal / air keran.
   * Bila salah satunya 0, pemain "lemas" dan tidak bisa mulai tahap baru
   * (bukan hukuman: tidak ada progres/koin yang hilang). */
  lapar: number
  haus: number
  /** Uang (Rp) untuk belanja makanan/minuman di Kantin. */
  uang: number
  /** Koin Daun: mata uang hadiah untuk gear, pohon, dan kostum. */
  koinDaun: number
  /** Id gear/kostum yang sudah dibeli di Toko Kantin. */
  inventaris: string[]
  /** Kostum yang sedang dipakai tokoh pemain (null = seragam biasa). */
  kostumDipakai: string | null
  /** Jumlah pohon yang ditanam lewat Toko Kantin (100 Koin Daun/pohon). */
  pohonDitanam: number
  /** Skor Adiwiyata: pohon +5 per pohon, panel surya +20, misi utama
   * selesai pertama kali +5. Save lama tanpa field ini -> pohonDitanam*5
   * (lihat loadSave). */
  skorAdiwiyata: number
  /** Eco-Shop (bayar Koin Hijau): sepatu = jalan +35%, pin = aura hijau +
   * diskon kantin 25% — keduanya BUFF 10 menit sejak dibeli (lihat
   * buffBerakhir), bukan permanen; panel = panel biru di atap sekolah,
   * sekali beli, Skor Adiwiyata +20 langsung masuk dan tetap. */
  sepatuEco: boolean
  pinDuta: boolean
  panelSurya: boolean
  /** Batas akhir buff gear (epoch ms, Date.now()): kunci = id gear
   * ('tumbler', 'tas-kain', 'lunch-box', 'sepatu-eco', 'pin-duta').
   * Buff aktif bila Date.now() < buffBerakhir[id] — tetap berjalan walau
   * game ditutup. Beli ulang memperbarui batas akhir ke sekarang+10 menit.
   * Save lama tanpa field ini -> {} (buff tidak aktif sampai beli ulang);
   * nilai kedaluwarsa tetap tersimpan, hanya dianggap tidak aktif. */
  buffBerakhir: Record<string, number>
  /** Bekal darurat di layar lemas: tanggal lokal (YYYY-MM-DD) terakhir
   * bekal darurat dipakai (1x per hari kalender WIB, lihat
   * PAKAI_BEKAL_DARURAT). Save lama tanpa field ini -> null. */
  bekalDaruratTanggal: string | null
  /** Bekal gratis harian: tanggal lokal terakhir bekal diambil + berapa
   * kali diambil hari itu (jatah 1x/hari, 2x/hari bila punya Lunch Box). */
  bekalTanggal: string | null
  bekalDipakai: number
  /** Hadiah Harian: tanggal lokal (YYYY-MM-DD) klaim terakhir + hari
   * terakhir yang diklaim dalam siklus 1-7 (hari berikutnya = siklus % 7 + 1).
   * Terpisah dari streak harian: terlewat sehari hanya mengulang siklus
   * dari hari 1, tidak ada yang hilang. */
  hadiahTerakhir: string | null
  hadiahSiklus: number
  /** Peta yang sedang dibuka: 'rumah' (titik awal permainan baru) atau
   * salah satu peta sekolah (dunia Jelajah). Save lama 'sekolah' dipetakan
   * ke 'gerbang' saat dimuat (lihat loadSave). */
  petaAktif: PetaAktif
  /** Uang saku Ibu: tanggal lokal (YYYY-MM-DD) terakhir Ibu memberi uang
   * saku + sarapan (1x per hari kalender lokal). */
  ibuTanggal: string | null
  /** Istirahat kasur (B-7): tanggal lokal (YYYY-MM-DD) terakhir kasur
   * dipakai istirahat (1x per hari kalender lokal, seperti uang saku Ibu).
   * Save lama tanpa field ini -> null (boleh istirahat sekali). */
  kasurTanggal: string | null
  /** Minum dari kulkas: timestamp (ms, Date.now()) terakhir kulkas dipakai
   * minum (jeda 30 menit waktu nyata). Save lama tanpa field ini -> null
   * (boleh minum sekali). */
  kulkasTerakhir: number | null
  /** Sampah liar yang dipungut di dunia dan dibawa (jumlah per jenis bak).
   * Dipilah di Tempat Sampah Terpilah dekat Gerbang: bak benar = +5 Koin
   * Hijau + Rp200 per sampah. Save lama tanpa field ini -> {}. */
  sampahDibawa: Record<string, number>
  completedAt: string | null
  updatedAt: string
}
