// Daftar lencana kampanye "Apa itu Adiwiyata".
// Lencana bab diberikan saat bab selesai (COMPLETE_CHAPTER + EARN_BADGE);
// 'streak-5-hari' diberikan saat streak harian mencapai 5 hari.
import type { ChapterId } from './types'

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
    syarat: 'Selesaikan Bab 1: Gerbang Sekolah',
  },
  {
    id: 'master-pilah',
    nama: 'Master Pilah',
    deskripsi: 'Kamu memilah sampah ke tong yang benar, termasuk kasus abu-abu yang menjebak.',
    syarat: 'Selesaikan Bab 2: Kantin',
  },
  {
    id: 'juragan-maggot',
    nama: 'Juragan Maggot',
    deskripsi: 'Kamu merawat maggot BSF dan memanen pakan ikan serta kasgot untuk kebun.',
    syarat: 'Selesaikan Bab 3: Pos Maggot',
  },
  {
    id: 'petani-muda',
    nama: 'Petani Muda',
    deskripsi: 'Kamu menyusun kompos dengan rasio tepat dan merawat cabai serta kangkung sampai tumbuh.',
    syarat: 'Selesaikan Bab 4: Kompos dan Kebun',
  },
  {
    id: 'penjaga-air',
    nama: 'Penjaga Air',
    deskripsi: 'Kamu membuat biopori, menampung air hujan, dan memburu keran serta lampu yang boros.',
    syarat: 'Selesaikan Bab 5: Air dan Energi',
  },
  {
    id: 'pahlawan-energi',
    nama: 'Pahlawan Energi',
    deskripsi: 'Kamu menemukan semua peralatan boros di sekolah dan menghemat energi bersama warga sekolah.',
    syarat: 'Selesaikan Bab 5: Air dan Energi',
  },
  {
    id: 'penjaga-biodiversitas',
    nama: 'Penjaga Biodiversitas',
    deskripsi: 'Kamu menanam pohon, menyambut burung dan kupu-kupu, dan lolos Inspeksi Tim Adiwiyata.',
    syarat: 'Selesaikan Bab 6: Biodiversitas dan Inspeksi',
  },
  {
    id: 'streak-5-hari',
    nama: 'Streak 5 Hari',
    deskripsi: 'Kamu kembali bermain lima hari berturut-turut. Konsisten itu yang paling sulit.',
    syarat: 'Capai streak 5 hari berturut-turut',
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
