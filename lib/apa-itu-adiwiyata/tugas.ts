// Metadata trek paralel "Misi Kader": 8 misi penuh untuk 8 tim kader yang
// belum punya misi di kampanye 6 bab. Judul dan deskripsi diambil dari
// lib/adiwiyata-site-content.ts (divisions: duties). NPC pemberi misi adalah
// tokoh fiktif — BUKAN nama koordinator asli dari SK.
// File ini hanya data; mini-game dan UI dibuat agen lain.
import type { TugasKaderId } from './types'

export const TUGAS: Record<
  TugasKaderId,
  { id: TugasKaderId; judul: string; deskripsi: string; npcId: string; zona: string; menit: number; icon: string }
> = {
  'bank-sampah': {
    id: 'bank-sampah',
    judul: 'Bank Sampah dan Daur Ulang',
    deskripsi:
      'Mengelola Bank Sampah Sekolah: menimbang, mencatat, dan menabung sampah anorganik supaya bisa didaur ulang atau dimanfaatkan.',
    npcId: 'npc-bank-sampah',
    zona: 'Bank Sampah',
    menit: 10,
    icon: '',
  },
  'lingkungan-sehat': {
    id: 'lingkungan-sehat',
    judul: 'Lingkungan Sehat',
    deskripsi:
      'Menjaga kebersihan toilet, drainase, dan taman sekolah serta budaya hidup bersih dan sehat (PHBS).',
    npcId: 'npc-lingkungan-sehat',
    zona: 'Taman & Toilet',
    menit: 10,
    icon: '',
  },
  'edu-lingkungan': {
    id: 'edu-lingkungan',
    judul: 'Edu-Lingkungan',
    deskripsi:
      'Mengedukasi warga sekolah tentang lingkungan hidup dan perilaku ramah lingkungan, dari pilah sampah sampai hemat air dan energi.',
    npcId: 'npc-edu-lingkungan',
    zona: 'Kebun',
    menit: 10,
    icon: '',
  },
  'inovasi-hijau': {
    id: 'inovasi-hijau',
    judul: 'Inovasi Hijau',
    deskripsi:
      'Mengembangkan literasi, riset, dan produk inovasi ramah lingkungan — dari poster dan infografis sampai alat sederhana buatan sendiri.',
    npcId: 'npc-inovasi-hijau',
    zona: 'Taman',
    menit: 10,
    icon: '',
  },
  'kantin-hijau': {
    id: 'kantin-hijau',
    judul: 'Kantin Hijau',
    deskripsi:
      'Memastikan kantin bersih, higienis, dan bebas plastik sekali pakai, dengan jajanan yang sehat dan bergizi.',
    npcId: 'npc-kantin-hijau',
    zona: 'Kantin',
    menit: 10,
    icon: '',
  },
  'data-hijau': {
    id: 'data-hijau',
    judul: 'Data Hijau',
    deskripsi:
      'Mengumpulkan, memeriksa, dan melaporkan data program Adiwiyata — dari berat sampah sampai pemakaian air dan listrik.',
    npcId: 'npc-data-hijau',
    zona: 'Pos Data',
    menit: 10,
    icon: '',
  },
  'eco-communication': {
    id: 'eco-communication',
    judul: 'Eco-Communication',
    deskripsi:
      'Mengelola media sosial dan konten edukasi lingkungan sekolah, supaya kabar baiknya sampai ke semua orang.',
    npcId: 'npc-eco-communication',
    zona: 'Kebun',
    menit: 10,
    icon: '',
  },
  'jejaring-hijau': {
    id: 'jejaring-hijau',
    judul: 'Jejaring Hijau',
    deskripsi:
      'Menjadi penghubung sekolah dengan DLH, mitra usaha, dan komunitas lingkungan di sekitar kita.',
    npcId: 'npc-jejaring-hijau',
    zona: 'Gerbang',
    menit: 10,
    icon: '',
  },
}
