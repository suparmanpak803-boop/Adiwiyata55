// Daftar lencana kampanye "Apa itu Adiwiyata".
// Lencana bab diberikan saat bab selesai (COMPLETE_CHAPTER + EARN_BADGE);
// lencana tugas diberikan saat Misi Kader selesai (COMPLETE_TUGAS +
// EARN_BADGE); 'kader-lengkap' diberikan saat kedelapan Misi Kader selesai;
// 'streak-5-hari' diberikan saat streak harian mencapai 5 hari.
import type { ChapterId, TugasKaderId } from './types'

export interface Lencana {
  id: string
  nama: string
  deskripsi: string
  syarat: string
}

export const LENCANA: Lencana[] = [
  {
    id: 'pejuang-tumbler',
    nama: 'Pejuang Tumbler',
    deskripsi: 'Kamu membawa tumbler dan lunch box sendiri, dan meninggalkan barang sekali pakai.',
    syarat: 'Selesaikan Misi 1: Kader Budaya Lingkungan',
  },
  {
    id: 'master-pilah',
    nama: 'Master Pilah',
    deskripsi: 'Kamu memilah sampah ke tong yang benar, termasuk kasus abu-abu yang menjebak.',
    syarat: 'Selesaikan Misi 2: Kader Pilah',
  },
  {
    id: 'juragan-maggot',
    nama: 'Juragan Maggot',
    deskripsi: 'Kamu merawat maggot BSF dan memanen pakan ikan serta kasgot untuk kebun.',
    syarat: 'Selesaikan Misi 3: Kader Maggot',
  },
  {
    id: 'petani-muda',
    nama: 'Petani Muda',
    deskripsi: 'Kamu menyusun kompos dengan rasio tepat dan merawat cabai serta kangkung sampai tumbuh.',
    syarat: 'Selesaikan Misi 4: Kader Olah Organik',
  },
  {
    id: 'penjaga-air',
    nama: 'Penjaga Air',
    deskripsi: 'Kamu membuat biopori, menampung air hujan, dan memburu keran serta lampu yang boros.',
    syarat: 'Selesaikan Misi 5: Kader Air & Energi Lestari',
  },
  {
    id: 'pahlawan-energi',
    nama: 'Pahlawan Energi',
    deskripsi: 'Kamu menemukan semua peralatan boros di sekolah dan menghemat energi bersama warga sekolah.',
    syarat: 'Selesaikan Misi 5: Kader Air & Energi Lestari',
  },
  {
    id: 'penjaga-biodiversitas',
    nama: 'Penjaga Biodiversitas',
    deskripsi: 'Kamu menanam pohon, menyambut burung dan kupu-kupu, dan lolos Inspeksi Tim Adiwiyata.',
    syarat: 'Selesaikan Misi 6: Kader Hijau dan Biodiversitas',
  },
  {
    id: 'streak-5-hari',
    nama: 'Streak 5 Hari',
    deskripsi: 'Kamu kembali bermain lima hari berturut-turut. Konsisten itu yang paling sulit.',
    syarat: 'Capai streak 5 hari berturut-turut',
  },
  {
    id: 'juragan-bank-sampah',
    nama: 'Juragan Bank Sampah',
    deskripsi: 'Kamu menimbang, mencatat, dan menabung sampah anorganik di Bank Sampah Sekolah.',
    syarat: 'Selesaikan Misi 1: Bank Sampah dan Daur Ulang',
  },
  {
    id: 'penjaga-sehat',
    nama: 'Penjaga Sehat',
    deskripsi: 'Kamu menjaga toilet, drainase, dan taman tetap bersih serta membudayakan hidup sehat.',
    syarat: 'Selesaikan Misi 2: Lingkungan Sehat',
  },
  {
    id: 'guru-lingkungan',
    nama: 'Guru Lingkungan',
    deskripsi: 'Kamu mengajari warga sekolah tentang pilah sampah, kompos, dan hemat air serta energi.',
    syarat: 'Selesaikan Misi 3: Edu-Lingkungan',
  },
  {
    id: 'inovator-hijau',
    nama: 'Inovator Hijau',
    deskripsi: 'Kamu membuat poster, infografis, dan ide alat sederhana yang ramah lingkungan.',
    syarat: 'Selesaikan Misi 4: Inovasi Hijau',
  },
  {
    id: 'penjaga-kantin',
    nama: 'Penjaga Kantin',
    deskripsi: 'Kamu memastikan kantin bersih, higienis, dan bebas plastik sekali pakai.',
    syarat: 'Selesaikan Misi 5: Kantin Hijau',
  },
  {
    id: 'juru-data',
    nama: 'Juru Data',
    deskripsi: 'Kamu mencatat dan membaca data sampah, air, listrik, dan tanaman sekolah dengan teliti.',
    syarat: 'Selesaikan Misi 6: Data Hijau',
  },
  {
    id: 'duta-komunikasi',
    nama: 'Duta Komunikasi',
    deskripsi: 'Kamu membuat konten lingkungan yang sampai ke semua orang lewat media sosial.',
    syarat: 'Selesaikan Misi 7: Eco-Communication',
  },
  {
    id: 'duta-jejaring',
    nama: 'Duta Jejaring',
    deskripsi: 'Kamu menghubungkan sekolah dengan DLH, pelaku usaha, dan komunitas lingkungan.',
    syarat: 'Selesaikan Misi 8: Jejaring Hijau',
  },
  {
    id: 'kader-lengkap',
    nama: 'Kader Lengkap',
    deskripsi: 'Kamu menyelesaikan semua 8 Misi Kader — seluruh tim Adiwiyata sudah kamu bantu.',
    syarat: 'Selesaikan semua 8 Misi Kader',
  },
]

/** Lencana yang dibuka tiap bab saat bab selesai. */
export const BAB_BADGE: Record<ChapterId, string> = {
  gerbang: 'pejuang-tumbler',
  kantin: 'master-pilah',
  maggot: 'juragan-maggot',
  kompos: 'petani-muda',
  'air-energi': 'penjaga-air',
  biodiversitas: 'penjaga-biodiversitas',
}

/** Lencana yang dibuka tiap Misi Kader saat misi selesai. */
export const TUGAS_BADGE: Record<TugasKaderId, string> = {
  'bank-sampah': 'juragan-bank-sampah',
  'lingkungan-sehat': 'penjaga-sehat',
  'edu-lingkungan': 'guru-lingkungan',
  'inovasi-hijau': 'inovator-hijau',
  'kantin-hijau': 'penjaga-kantin',
  'data-hijau': 'juru-data',
  'eco-communication': 'duta-komunikasi',
  'jejaring-hijau': 'duta-jejaring',
}
