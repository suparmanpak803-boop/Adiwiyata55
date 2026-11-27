// Dialog pembuka singkat tiap bab. Cerita baru: siswa baru yang pernah
// ditertawakan karena peduli harus menjadikan sekolah barunya Adiwiyata,
// sementara Pak Plastik, yang dulu juga pernah peduli lalu menyerah,
// berusaha membuktikan bahwa peduli itu sia-sia. Magi bukti hidup tema,
// Pak Plastik memegang kebohongan yang sama dengan pemain. Nada santai,
// tidak menggurui.
import type { ChapterId, PakPlastikStatus } from '../types'

export interface DialogLine {
  tokoh: 'Magi' | 'Pak Plastik' | 'Narator'
  teks: string
}

export const DIALOG_AWAL: Record<ChapterId, DialogLine[]> = {
  gerbang: [
    {
      tokoh: 'Narator',
      teks: 'Hari pertama di sekolah baru. Di depan gerbang, botol plastik dilempar ke jalan dan semua orang pura-pura tidak melihat.',
    },
    {
      tokoh: 'Magi',
      teks: 'Hai! Aku Magi. Kamu siswa baru yang ditugaskan bikin sekolah ini Adiwiyata, ya? Di sini, satu orang yang berani duluan bisa bikin yang lain ikut.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Hehehe, aku Pak Plastik! Botolku ada di mana-mana. Buang saja, nanti juga ada yang beresin. Peduli itu capek, percuma.',
    },
    {
      tokoh: 'Magi',
      teks: 'Tenang, kita mulai dari yang kecil. Hari ini: isi tasmu dengan barang yang bisa dipakai ulang. Siap?',
    },
  ],
  kantin: [
    {
      tokoh: 'Narator',
      teks: 'Jam istirahat. Kantin penuh, dan tempat sampahnya juga penuh. Isinya tercampur semua, gara-gara iseng Pak Plastik kemarin.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Bungkus berminyak? Masukkan saja ke bak hijau, biar sekalian jadi kompos! Hehehe.',
    },
    {
      tokoh: 'Magi',
      teks: 'Jangan didengar. Bungkus berminyak itu tidak bisa jadi kompos atau didaur ulang. Salah bak, maggotku bisa sakit nanti.',
    },
    {
      tokoh: 'Narator',
      teks: 'Tugasmu: lempar setiap sampah ke bak yang benar. Organik yang kamu pilah dengan benar akan jadi pakan maggot.',
    },
  ],
  maggot: [
    {
      tokoh: 'Narator',
      teks: 'Di Pos Maggot, kotak-kotak kayu berisi ribuan larva mungil yang sibuk makan.',
    },
    {
      tokoh: 'Magi',
      teks: 'Ini rumahku! Kami makan sisa nasi dan sayur dari kantin. Tapi sejak ada yang nyelipin bungkus berminyak, perutku rewel terus.',
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
      teks: 'Di kebun sekolah, tumpukan kompos yang kemarin tercemar menunggu diaduk. Cabai dan kangkung sudah mulai tumbuh di bedengan.',
    },
    {
      tokoh: 'Magi',
      teks: 'Kasgot dari panenku sudah sampai di sini. Campur dengan daun kering dan sisa sayur, lapis demi lapis. Kalau ini jadi, kebun ini bukti pertamamu.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Aku siram tanaman pakai botol plastik bekas saja, biar hemat. Eh, kok daunnya malah layu?',
    },
    {
      tokoh: 'Magi',
      teks: 'Tanaman butuh air yang cukup, cahaya, dan pupuk yang benar. Aduk lagi, tambah daun kering, tumpukan ini masih bisa pulih.',
    },
  ],
  'air-energi': [
    {
      tokoh: 'Narator',
      teks: 'Hujan deras semalam membuat halaman tergenang. Di dalam sekolah, ada lampu menyala di kelas kosong dan keran yang menetes. Tidak ada yang melihat, tapi tetap harus dibereskan.',
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
      teks: 'Hari ini tim penilai Adiwiyata datang. Semua mata tertuju padamu, dan kamu harus bicara di depan semua orang.',
    },
    {
      tokoh: 'Magi',
      teks: 'Kamu sudah berani duluan berkali-kali. Sekarang tinggal satu langkah lagi: bicara, supaya semua orang dengar.',
    },
    {
      tokoh: 'Pak Plastik',
      teks: 'Aku tidak akan buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Botolku ini aku bawa sendiri ke bak yang benar.',
    },
    {
      tokoh: 'Narator',
      teks: 'Tim penilai sudah di gerbang. Giliranmu bicara.',
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
  netral: 'Hehehe, aku Pak Plastik! Botolku ada di mana-mana. Buang saja, nanti juga ada yang beresin. Peduli itu capek, percuma.',
  dibujuk: 'Hehehe, aku Pak Plastik! Kamu ajak aku memilah, ya? Baiklah... botolku ada di mana-mana, ayo beresin bareng.',
  dilawan: 'Hehehe, aku Pak Plastik! Kamu tantang aku lomba pilah? Siap-siap kalah, ya!',
  dijebak: 'Hehehe, aku Pak Plastik! Botolku ada di mana-mana. Buang saja, nanti juga ada yang beresin. Peduli itu capek, percuma.',
}

/** Baris Pak Plastik di Biodiversitas per status (indeks 2 dari DIALOG_AWAL.biodiversitas). */
const BAB6_PAK_PLASTIK: Record<PakPlastikStatus, string> = {
  netral: 'Aku tidak akan buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Botolku ini aku bawa sendiri ke bak yang benar.',
  dibujuk: 'Aku tidak akan buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Sejak kamu ajak memilah, aku sudah belajar. Botolku ini aku bawa sendiri ke bak yang benar.',
  dilawan: 'Aku tidak akan buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Lomba pilah kemarin bikin aku latihan tiap pagi. Botolku ini aku bawa sendiri ke bak yang benar.',
  dijebak: 'Aku tidak akan buang sampah sembarangan lagi. Boleh ikut inspeksi, kan? Sejak keluar dari bak itu, aku jadi mikir sebelum mengacau. Botolku ini aku bawa sendiri ke bak yang benar.',
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
    // C-39: cari baris Pak Plastik berdasarkan tokoh, bukan indeks tetap
    // (rapuh bila urutan dialog berubah). Bila tidak ada, kembalikan
    // salinan tanpa perubahan.
    const idx = dasar.findIndex((b) => b.tokoh === 'Pak Plastik')
    if (idx === -1) return [...dasar]
    return dasar.map((baris, i) =>
      i === idx ? { ...baris, teks: GERBANG_PAK_PLASTIK[pakPlastik] } : baris,
    )
  }
  if (misi === 'biodiversitas' && pakPlastik !== 'netral') {
    const idx = dasar.findIndex((b) => b.tokoh === 'Pak Plastik')
    if (idx === -1) return [...dasar]
    return dasar.map((baris, i) =>
      i === idx ? { ...baris, teks: BAB6_PAK_PLASTIK[pakPlastik] } : baris,
    )
  }
  return [...dasar]
}
