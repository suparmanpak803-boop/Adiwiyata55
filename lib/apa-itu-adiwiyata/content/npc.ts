// Dialog NPC mode "Jelajah". Nada santai seperti dialog bab: Magi ramah,
// Pak Plastik lucu dan sedang berubah, yang lain hangat dan membantu.
// Tidak menggurui, tidak mengarang angka pasti atas nama sekolah.
import { DIALOG_MAGI_PAK_PLASTIK, DIALOG_PAK_PLASTIK } from './cerita'
import { DIALOG_TUGAS } from './tugas'
import { TUGAS } from '../tugas'
import type { PakPlastikStatus, TugasKaderId } from '../types'

export interface DialogNpc {
  sapaan: string
  baris: string[]
  tips?: string
}

// Dialog NPC pemberi Misi Kader, dipetakan dari DIALOG_TUGAS (content/tugas.ts)
// lewat TUGAS (npcId per misi) supaya isinya tidak disalin ke mana-mana.
// content/tugas.ts hanya mengimpor tipe DialogNpc dari file ini, jadi tidak
// ada siklus impor runtime.
const DIALOG_TUGAS_NPC: Record<string, DialogNpc> = Object.fromEntries(
  (Object.keys(TUGAS) as TugasKaderId[]).map((tugasId) => [TUGAS[tugasId].npcId, DIALOG_TUGAS[tugasId]]),
)

export const DIALOG_NPC: Record<string, DialogNpc> = {
  magi: {
    sapaan: 'Hai! Aku Magi, larva maggot yang tinggal di Pos Maggot.',
    baris: [
      'Aku makan sisa nasi dan sayur dari kantin. Yang berminyak atau plastik bikin perutku rewel, jadi jangan dikasih itu ya.',
      'Kalau aku sehat, panenku bisa jadi pakan ikan dan pupuk buat kebun. Siklusnya jalan terus!',
      'Kotakku harus pas: tidak terlalu basah, tidak terlalu panas, dan tidak bau.',
    ],
    tips: 'Sisa sayur dan buah yang bersih adalah pakan maggot paling bagus.',
  },
  'pak-plastik': {
    sapaan: 'Hehehe, aku Pak Plastik! Ketemu lagi, ya?',
    baris: [
      'Dulu aku suka dibuang sembarangan. Sekarang aku lagi belajar berubah, pelan-pelan.',
      'Botolku itu sebenarnya masih berguna kalau dibersihkan dan dipilah ke tong yang benar.',
      'Kamu sudah main Tas Pagi? Isi tasmu dengan barang yang bisa dipakai ulang, biar aku tidak nambah-nambah.',
    ],
    tips: 'Botol plastik bersih masuk tong Anorganik, bukan tong Organik.',
  },
  'kang-kantin': {
    sapaan: 'Selamat datang di kantin! Makan dulu, pilah belakangan juga boleh.',
    baris: [
      'Di sini yang paling penting: sisa makanan ke tong Organik, botol dan kardus bersih ke Anorganik.',
      'Bungkus berminyak jangan masuk tong hijau, nanti maggot-nya Magi bisa sakit.',
      'Kalau bingung, lihat tongnya: warnanya beda-beda, tinggal ikuti saja.',
    ],
    tips: 'Kertas basah dan masker masuk tong Residu, bukan Anorganik.',
  },
  'pak-kebun': {
    sapaan: 'Halo, nak. Kebunnya lagi bagus-bagusnya ini.',
    baris: [
      'Kompos itu seperti masak: lapis cokelat, lapis hijau, diaduk, ditunggu. Tidak bisa diburu-buru.',
      'Kasgot dari maggot itu pupuk yang bagus. Tanaman di sini tumbuh karena itu.',
      'Cabai dan kangkung ini nanti kembali ke kantin. Begitu terus putarannya.',
    ],
    tips: 'Kompos yang bau biasanya kurang udara — aduk dan tambah bahan kering.',
  },
  'mbak-rani': {
    sapaan: 'Hai! Aku Mbak Rani, yang jagain air dan listrik sekolah.',
    baris: [
      'Keran menetes itu kelihatannya sepele, tapi setetes demi setetes bisa jadi ember penuh sehari.',
      'Lubang biopori bikin air hujan meresap ke tanah, jadi halaman tidak gampang banjir.',
      'Panel surya di sana itu yang bikin sebagian lampu sekolah menyala dari matahari.',
    ],
    tips: 'Lampu di kelas kosong dan AC terlalu dingin itu boros yang paling sering ketemu.',
  },
  'bu-sari': {
    sapaan: 'Selamat pagi, Nak. Ibu Sari, guru di sini.',
    baris: [
      'Tim Adiwiyata itu bukan datang untuk menakut-nakuti. Mereka datang melihat kebiasaan baik yang sudah jalan.',
      'Kalau setiap hari kamu memilah dan membawa tumbler, inspeksi itu cuma formalitas.',
      'Ibu bangga sama kalian yang mau belajar dari bab pertama sampai sekarang.',
    ],
    tips: 'Sekolah Adiwiyata itu soal budaya, bukan soal sekali bersih-bersih.',
  },
  dimas: {
    sapaan: 'Eh, hai! Aku Dimas, kelas sebelah.',
    baris: [
      'Aku baru mulai bawa tumbler minggu ini. Ternyata hemat juga, tidak beli minuman kemasan tiap hari.',
      'Tadi aku lihat Pak Plastik jalan-jalan di dekat gerbang. Dia lucu sih, tapi suka iseng.',
      'Kamu sudah sampai bab berapa? Aku masih di Kantin, pilahnya susah-susah gampang.',
    ],
    tips: 'Lunch box dari rumah itu lebih enak daripada jajan bungkus styrofoam.',
  },
  sinta: {
    sapaan: 'Hai! Aku Sinta, biasa jajan di kantin.',
    baris: [
      'Aku bawa tas kain ke mana-mana sekarang. Muat banyak dan tidak gampang sobek.',
      'Kadang aku masih bingung bedain Residu dan Anorganik. Bungkus berminyak itu Residu, kan?',
      'Eh, iya kan? Kalau ragu, tanya Kang Kantin saja, dia tahu semua.',
    ],
    tips: 'Sedotan plastik sekali pakai itu gampang banget diganti: bawa sedotan sendiri atau minum langsung.',
  },
  // Pemberi Misi Kader (dialog dari DIALOG_TUGAS, lihat atas).
  ...DIALOG_TUGAS_NPC,
}

/**
 * Dialog NPC dengan ingatan alur Pak Plastik (Cerita Bercabang).
 * - id 'pak-plastik' + status bukan 'netral': sapaan + baris dari
 *   DIALOG_PAK_PLASTIK[status] (tips asli tetap dipakai).
 * - id 'magi' + status bukan 'netral': dialog Magi yang sudah ada ditambah
 *   baris DIALOG_MAGI_PAK_PLASTIK[status] (tips tetap).
 * - id lain, atau status 'netral': DIALOG_NPC[id] apa adanya.
 * Bila id tidak dikenal, kembalikan sapaan generik seperti fallback di jelajah.
 */
export function dialogDenganIngatan(id: string, pakPlastik: PakPlastikStatus): DialogNpc {
  const dasar = DIALOG_NPC[id]
  if (!dasar) return { sapaan: 'Halo!', baris: ['Senang bertemu denganmu!'] }
  if (pakPlastik === 'netral') return dasar
  if (id === 'pak-plastik') {
    return { ...DIALOG_PAK_PLASTIK[pakPlastik], tips: dasar.tips }
  }
  if (id === 'magi') {
    return { ...dasar, baris: [...dasar.baris, ...DIALOG_MAGI_PAK_PLASTIK[pakPlastik]] }
  }
  return dasar
}
