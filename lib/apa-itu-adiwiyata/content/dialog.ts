// Dialog pembuka singkat tiap bab. Magi ramah dan membantu, Pak Plastik
// pengacau lucu yang suka membuang sampah sembarangan tapi bisa diajak
// berubah, Narator memberi konteks. Nada santai, tidak menggurui.
import type { ChapterId, PakPlastikStatus } from '../types'

export interface DialogLine {
  tokoh: 'Magi' | 'Pak Plastik' | 'Narator'
  teks: string
}

export const DIALOG_AWAL: Record<ChapterId, DialogLine[]> = {
  gerbang: [
    {
      tokoh: 'Narator',
      teks: 'Hari pertama di sekolah baru. Gerbangnya ramai, tapi di pinggir jalan berserakan botol dan bungkus plastik.',
    },
    {
      tokoh: 'Magi',
      teks: 'Hai! Aku Magi. Aku tinggal di Pos Maggot, di ujung sekolah. Kamu siswa baru yang ditugaskan bikin sekolah ini Adiwiyata, ya?',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Hehehe, aku Pak Plastik! Botolku ada di mana-mana. Buang saja, nanti juga ada yang beresin. Eh, kok pada melotot?',
    },
    {
      tokoh: 'Magi',
      teks: 'Tenang, kita mulai dari yang kecil. Hari ini: isi tasmu dengan barang yang bisa dipakai ulang. Siap?',
    },
  ],
  kantin: [
    {
      tokoh: 'Narator',
      teks: 'Jam istirahat. Kantin penuh, dan tempat sampahnya juga penuh. Tapi isinya tercampur semua.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Bungkus berminyak? Masukkan saja ke tong hijau, biar sekalian jadi kompos! Hehehe.',
    },
    {
      tokoh: 'Magi',
      teks: 'Jangan didengar. Bungkus berminyak itu tidak bisa jadi kompos atau didaur ulang. Salah tong, maggotku bisa sakit nanti.',
    },
    {
      tokoh: 'Narator',
      teks: 'Tugasmu: lempar setiap sampah ke tong yang benar. Organik yang kamu pilah dengan benar akan jadi pakan maggot.',
    },
  ],
  maggot: [
    {
      tokoh: 'Narator',
      teks: 'Di Pos Maggot, kotak-kotak kayu berisi ribuan larva mungil yang sibuk makan.',
    },
    {
      tokoh: 'Magi',
      teks: 'Ini rumahku! Kami makan sisa nasi dan sayur dari kantin. Tapi kalau dikasih yang berminyak atau plastik, perut kami langsung rewel.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Aku bawa bungkus snack buat Magi, nih. Eh, kok Magi malah sembunyi?',
    },
    {
      tokoh: 'Magi',
      teks: 'Bantu aku jaga kelembapan, suhu, dan bau kotak ini. Kalau semua pas, panennya bisa jadi pakan ikan dan pupuk kebun.',
    },
  ],
  kompos: [
    {
      tokoh: 'Narator',
      teks: 'Di kebun sekolah, tumpukan kompos menunggu diaduk. Cabai dan kangkung sudah mulai tumbuh di bedengan.',
    },
    {
      tokoh: 'Magi',
      teks: 'Kasgot dari panenku sudah sampai di sini. Campur dengan daun kering dan sisa sayur, lapis demi lapis.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Aku siram tanaman pakai botol plastik bekas saja, biar hemat. Eh, kok daunnya malah layu?',
    },
    {
      tokoh: 'Magi',
      teks: 'Tanaman butuh air yang cukup, cahaya, dan pupuk yang benar. Rawat baik-baik, nanti sayurnya kembali ke kantin.',
    },
  ],
  'air-energi': [
    {
      tokoh: 'Narator',
      teks: 'Hujan deras semalam membuat halaman tergenang. Di dalam sekolah, ada lampu menyala di kelas kosong dan keran yang menetes.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Air kan banyak, hujan terus. Keran menetes sedikit tidak apa-apa, kan?',
    },
    {
      tokoh: 'Magi',
      teks: 'Setetes demi setetes, dalam sehari bisa jadi ember penuh. Yuk, bor biopori supaya air hujan meresap, dan cari semua yang boros listrik.',
    },
    {
      tokoh: 'Narator',
      teks: 'Tugasmu: buat lubang biopori, tampung air hujan, dan matikan yang boros.',
    },
  ],
  biodiversitas: [
    {
      tokoh: 'Narator',
      teks: 'Pohon yang kamu tanam mulai rindang. Tapi halaman sekolah masih sepi, jarang ada burung atau kupu-kupu.',
    },
    {
      tokoh: 'Magi',
      teks: 'Kalau pohonnya sehat dan tidak ada sampah berserakan, mereka akan datang sendiri. Coba tanam lagi dan lihat siapa yang mampir.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Aku janji tidak buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Aku sudah belajar memilah.',
    },
    {
      tokoh: 'Narator',
      teks: 'Hari ini tim Adiwiyata datang menilai sekolah. Buktikan semua yang kamu pelajari dari bab pertama sampai sekarang.',
    },
  ],
}

// ------------------------------------------------- Varian per status ----
//
// DIALOG_AWAL di atas adalah versi NETRAL. Dua baris Pak Plastik diganti
// mengikuti statusnya, karena kalau tidak, dialognya bertentangan dengan
// pilihan yang baru saja dibuat pemain:
//
// - Gerbang: titik-1 dipilih di dialog NPC BARU SAJA sebelum misi dimulai.
//   Pak Plastik yang baru dibujuk/ditantang lalu berkata "Buang saja, nanti
//   juga ada yang beresin" adalah kontradiksi langsung.
// - Biodiversitas (Bab 6): baris ini adalah klaim penebusan — payoff dari
//   seluruh alur Pak Plastik — jadi harus mengingat bagaimana ia sampai
//   di sini (dibujuk / dilawan / dijebak).
//
// Misi 2-5 SENGAJA tidak diubah: Pak Plastik di sana tetap usil, dan Magi
// langsung membetulkan usul salahnya di baris berikutnya. Itu momen
// belajarnya — dibujuk bukan berarti langsung sempurna, ia masih belajar
// pelan-pelan. Dialog ingatan NPC (DIALOG_PAK_PLASTIK) yang mencatat
// perubahan sikapnya; intro misi mencatat kebiasaan lamanya yang kambuh.

/** Baris Pak Plastik di Gerbang per status (indeks 2 dari DIALOG_AWAL.gerbang). */
const GERBANG_PAK_PLASTIK: Record<PakPlastikStatus, string> = {
  netral: 'Hehehe, aku Pak Plastik! Botolku ada di mana-mana. Buang saja, nanti juga ada yang beresin. Eh, kok pada melotot?',
  dibujuk: 'Hehehe, aku Pak Plastik! Kamu ajak aku memilah, ya? Baiklah... botolku ada di mana-mana, ayo beresin bareng.',
  dilawan: 'Hehehe, aku Pak Plastik! Kamu tantang aku lomba pilah? Siap-siap kalah, ya!',
  dijebak: 'Hehehe, aku Pak Plastik! Botolku ada di mana-mana. Buang saja, nanti juga ada yang beresin. Eh, kok pada melotot?',
}

/** Baris Pak Plastik di Biodiversitas per status (indeks 2 dari DIALOG_AWAL.biodiversitas). */
const BAB6_PAK_PLASTIK: Record<PakPlastikStatus, string> = {
  netral: 'Aku janji tidak buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Aku sudah belajar memilah.',
  dibujuk: 'Aku janji tidak buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Sejak kamu ajak memilah, aku sudah belajar.',
  dilawan: 'Aku janji tidak buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Lomba pilah kemarin bikin aku latihan tiap pagi.',
  dijebak: 'Aku janji tidak buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Sejak keluar dari tong itu, aku jadi mikir sebelum mengacau.',
}

/**
 * Dialog pembuka misi dengan ingatan status Pak Plastik. Dipakai MisiShell
 * sebagai intro sebelum tahap pertama. Mengembalikan salinan (DIALOG_AWAL
 * tidak diubah). Status 'dijebak' tidak mungkin ada di Gerbang (jebakan
 * baru terjadi di misi 2), jadi baris Gerbang-nya sama dengan netral.
 */
export function dialogAwalUntuk(misi: ChapterId, pakPlastik: PakPlastikStatus): DialogLine[] {
  const dasar = DIALOG_AWAL[misi]
  if (misi === 'gerbang' && pakPlastik !== 'netral') {
    return dasar.map((baris, i) =>
      i === 2 && baris.tokoh === 'Pak Plastik' ? { ...baris, teks: GERBANG_PAK_PLASTIK[pakPlastik] } : baris,
    )
  }
  if (misi === 'biodiversitas' && pakPlastik !== 'netral') {
    return dasar.map((baris, i) =>
      i === 2 && baris.tokoh === 'Pak Plastik' ? { ...baris, teks: BAB6_PAK_PLASTIK[pakPlastik] } : baris,
    )
  }
  return [...dasar]
}
