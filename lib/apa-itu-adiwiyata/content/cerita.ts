// Cerita Bercabang — pohon pilihan 6 misi utama + alur Pak Plastik + epilog.
//
// ATURAN (dibaca agen UI Gelombang B sebelum memakai file ini):
//
// - Setiap misi utama punya TEPAT 2 titik pilihan: titik 1 `kapan: 'npc'`
//   (di dialog NPC pemberi misi, sebelum misi dimulai) dan titik 2
//   `kapan: 'tengah'` (di dalam misi, tampil sebelum tahap ke-3).
// - Kunci penyimpanan pilihan: `${misi}:${titikId}` (mis. 'gerbang:titik-1'),
//   nilainya id opsi yang dipilih. Disimpan di `save.cerita` lewat aksi
//   `PILIH_CERITA`. Semua pilihan tetap mengarah ke misi yang sama — tidak
//   ada pilihan yang mengunci atau menggagalkan misi.
// - Teks tombol opsi singkat (maks ~8 kata); `akibat` selalu 1 kalimat.
//   Nada santai Bahasa Indonesia, tidak menggurui; tidak ada hukuman keras.
// - ALUR PAK PLASTIK: status `save.pakPlastik` ('netral' | 'dibujuk' |
//   'dilawan' | 'dijebak', default 'netral') hanya berubah lewat opsi yang
//   membawa field `pakPlastik`, dan hanya pada pilihan misi 1-3:
//   * Misi 1 titik 1 WAJIB melibatkan Pak Plastik langsung (dia pemberi
//     misinya): opsi 'bujuk-pilah' -> 'dibujuk', 'tantang-pilah' -> 'dilawan'.
//   * Misi 2 titik 1 menyediakan SATU opsi pengubah: 'jebak-tong' -> 'dijebak'.
//   * Misi 3 titik 1 menyediakan SATU opsi pengubah: 'bujuk-jaga' -> 'dibujuk'.
//   * Status akhir = opsi Pak Plastik TERAKHIR yang dipilih di misi 1-3
//     (pilihan belakangan menimpa yang sebelumnya).
//   * Misi 4-6 TIDAK membawa field `pakPlastik` sama sekali (status terkunci
//     begitu misi 4 dimulai). Misi 4-6 juga tidak menyebut Pak Plastik di
//     teks pilihannya; respons terhadap status tampil lewat varian dialog
//     (DIALOG_PAK_PLASTIK, DIALOG_MAGI_PAK_PLASTIK) dan epilog.
//   * HANYA opsi di titik 1 (dialog NPC) yang membawa field `pakPlastik`;
//     titik 2 tidak mengubah status.
// - EPILOG: tiap misi punya satu epilog (`EPILOG_MISI`) yang dikunci ke SATU
//   titik pilihan (`kunci`) dan satu opsi "baik" (`opsiBaik`). Bila pilihan
//   tersimpan di kunci itu == opsiBaik, tampilkan `teksBaik` + `bonusBaik`
//   (30 koin); bila tidak (pilihan lain, atau belum memilih), tampilkan
//   `teksLain` + `bonusLain` (15 koin). Pakai helper `pilihEpilog()` —
//   jangan membandingkan manual. Bonus diberikan sekali oleh UI (Gelombang B)
//   lewat `EARN_COINS` saat Pos Hijau; file ini tidak mengubah save.
// - VARIAN DIALOG INGATAN: `DIALOG_PAK_PLASTIK` berisi sapaan + baris dialog
//   Pak Plastik per status; status 'netral' disalin VERBATIM dari
//   `content/npc.ts` (jangan diubah di sini — bila npc.ts berubah, samakan).
//   `DIALOG_MAGI_PAK_PLASTIK` berisi 2-3 baris komentar Magi tentang Pak
//   Plastik per status non-netral; untuk 'netral' pakai baris Magi yang sudah
//   ada di npc.ts. UI memakai varian ini saat pemain bicara lagi dengan
//   Pak Plastik / Magi setelah status berubah.
// - Isi misi TIDAK diubah file ini: hanya pilihan di sekitarnya. Tokoh NPC
//   mengikuti `misi.ts`/`dunia.ts` (gerbang -> Pak Plastik, kantin ->
//   Kang Kantin, maggot -> Magi, kompos -> Pak Kebun, air-energi ->
//   Mbak Rani, biodiversitas -> Bu Sari).

import type { ChapterId, PakPlastikStatus } from '../types'

export interface OpsiCerita {
  id: string
  /** Teks tombol, singkat (maks ~8 kata). */
  teks: string
  /** Akibat pilihan, 1 kalimat. */
  akibat: string
  /**
   * Bila diisi, memilih opsi ini mengubah status Pak Plastik.
   * Hanya ada pada opsi titik 1 misi 1-3 (lihat aturan di header).
   */
  pakPlastik?: 'dibujuk' | 'dilawan' | 'dijebak'
}

export interface TitikPilihan {
  id: string
  misi: ChapterId
  /** 'npc' = dialog NPC sebelum misi; 'tengah' = di dalam misi, sebelum tahap ke-3. */
  kapan: 'npc' | 'tengah'
  /** Situasi yang dihadapi pemain, 1 kalimat. */
  situasi: string
  opsi: [OpsiCerita, OpsiCerita] | [OpsiCerita, OpsiCerita, OpsiCerita]
}

/** Kunci penyimpanan satu titik pilihan: `${misi}:${titikId}`. */
export function kunciCerita(misi: ChapterId, titikId: string): string {
  return `${misi}:${titikId}`
}

export const PILIHAN_CERITA: Record<ChapterId, [TitikPilihan, TitikPilihan]> = {
  gerbang: [
    {
      id: 'titik-1',
      misi: 'gerbang',
      kapan: 'npc',
      situasi: 'Pak Plastik menghadangmu di gerbang sambil memegang botol kosong.',
      opsi: [
        {
          id: 'bujuk-pilah',
          teks: 'Bujuk Pak Plastik ikut memilah',
          akibat: 'Pak Plastik menggaruk kepala, lalu ikut memungut botol yang berserakan.',
          pakPlastik: 'dibujuk',
        },
        {
          id: 'tantang-pilah',
          teks: 'Tantang Pak Plastik lomba pilah',
          akibat: 'Pak Plastik menyeringai dan menerima tantanganmu di depan gerbang.',
          pakPlastik: 'dilawan',
        },
        {
          id: 'lewati-saja',
          teks: 'Lewati saja, fokus ke tas pagi',
          akibat: 'Pak Plastik mendengus, lalu pergi mengacau ke tempat lain.',
        },
      ],
    },
    {
      id: 'titik-2',
      misi: 'gerbang',
      kapan: 'tengah',
      situasi: 'Tasmu sudah hampir penuh, tapi ada satu barang sekali pakai yang tertinggal.',
      opsi: [
        {
          id: 'bawa-cadangan',
          teks: 'Bawa tumbler cadangan dari loker',
          akibat: 'Tumbler cadangan menyelamatkan pagimu tanpa satu pun plastik baru.',
        },
        {
          id: 'pinjam-teman',
          teks: 'Pinjam botol guna ulang ke teman',
          akibat: 'Temanmu meminjamkan botolnya sambil mengingatkanmu membawa sendiri besok.',
        },
      ],
    },
  ],
  kantin: [
    {
      id: 'titik-1',
      misi: 'kantin',
      kapan: 'npc',
      situasi: 'Pak Plastik mengintip dari balik bak, dan Kang Kantin menantangmu memilah tumpukan hari ini.',
      opsi: [
        {
          id: 'jebak-tong',
          teks: 'Jebak Pak Plastik dengan bak mengilap',
          akibat: 'Pak Plastik melompat ke bak Anorganik demi botol mengilap, lalu tutupnya menutup sendiri.',
          pakPlastik: 'dijebak',
        },
        {
          id: 'minta-bantuan',
          teks: 'Minta Pak Plastik bantu pilah',
          akibat: 'Pak Plastik pura-pura sibuk, tapi sesekali ia melempar botol ke bak yang benar.',
        },
        {
          id: 'kerjakan-sendiri',
          teks: 'Kerjakan sendiri diam-diam',
          akibat: 'Kamu memilah tanpa ribut-ribut, dan tumpukan itu habis sebelum istirahat selesai.',
        },
      ],
    },
    {
      id: 'titik-2',
      misi: 'kantin',
      kapan: 'tengah',
      situasi: 'Bak Anorganik penuh, dan antrean pilah makin panjang.',
      opsi: [
        {
          id: 'padatkan-botol',
          teks: 'Padatkan botol supaya muat',
          akibat: 'Botol yang dipadatkan memberi ruang, dan antrean kembali bergerak.',
        },
        {
          id: 'tong-cadangan',
          teks: 'Minta Kang Kantin siapkan bak cadangan',
          akibat: 'Kang Kantin menggeser bak cadangan, dan pilah hari ini tetap lancar.',
        },
      ],
    },
  ],
  maggot: [
    {
      id: 'titik-1',
      misi: 'maggot',
      kapan: 'npc',
      situasi: 'Magi menggeliat lapar, dan Pak Plastik mengintip kotak maggot dari jauh.',
      opsi: [
        {
          id: 'bujuk-jaga',
          teks: 'Bujuk Pak Plastik menjaga kotak Magi',
          akibat: 'Pak Plastik akhirnya duduk manis menjaga kotak Magi, meski sesekali ia mengintip isinya.',
          pakPlastik: 'dibujuk',
        },
        {
          id: 'usir-maggot',
          teks: 'Usir Pak Plastik dari Pos Maggot',
          akibat: 'Pak Plastik pergi sambil bersiul, dan Magi bisa makan dengan tenang.',
        },
        {
          id: 'beri-makan-dulu',
          teks: 'Beri Magi makan dulu',
          akibat: 'Magi langsung lahap makan sisa sayur, dan urusan lain menunggu giliran.',
        },
      ],
    },
    {
      id: 'titik-2',
      misi: 'maggot',
      kapan: 'tengah',
      situasi: 'Magi lahap sekali, tapi ada sisa berminyak nyasar ke kotaknya.',
      opsi: [
        {
          id: 'pisah-minyak',
          teks: 'Pisahkan sisa berminyak itu cepat-cepat',
          akibat: 'Sisa berminyak tersingkir sebelum Magi sempat memakannya.',
        },
        {
          id: 'sayur-segar',
          teks: 'Beri Magi sayur segar supaya tenang',
          akibat: 'Magi beralih ke sayur segar dan melupakan sisa berminyak itu.',
        },
      ],
    },
  ],
  kompos: [
    {
      id: 'titik-1',
      misi: 'kompos',
      kapan: 'npc',
      situasi: 'Pak Kebun menunjukkan tumpukan kompos dan bertanya mau mulai dari mana.',
      opsi: [
        {
          id: 'lapis-cokelat',
          teks: 'Mulai dari lapisan cokelat yang kering',
          akibat: 'Lapisan daun kering menutup tumpukan, dan baunya langsung berkurang.',
        },
        {
          id: 'tabur-kasgot',
          teks: 'Tabur kasgot dari Magi dulu',
          akibat: 'Kasgot dari Magi membuat tumpukan kompos makin subur.',
        },
      ],
    },
    {
      id: 'titik-2',
      misi: 'kompos',
      kapan: 'tengah',
      situasi: 'Tumpukan kompos mulai bau, dan Pak Kebun melirikmu.',
      opsi: [
        {
          id: 'aduk-kompos',
          teks: 'Aduk kompos dan tambah daun kering',
          akibat: 'Udara masuk ke tumpukan, dan baunya perlahan hilang.',
        },
        {
          id: 'siram-eco',
          teks: 'Siram Eco Enzyme lalu tutup rapat',
          akibat: 'Eco Enzyme membantu tumpukan matang tanpa bau menyengat.',
        },
      ],
    },
  ],
  'air-energi': [
    {
      id: 'titik-1',
      misi: 'air-energi',
      kapan: 'npc',
      situasi: 'Mbak Rani menunjukkan keran menetes dan panel surya di atap.',
      opsi: [
        {
          id: 'periksa-keran',
          teks: 'Periksa keran dulu, panel belakangan',
          akibat: 'Keran yang menetes ketemu sumbernya, dan ember di bawahnya hampir penuh.',
        },
        {
          id: 'lihat-panel',
          teks: 'Naik ke atap lihat panel surya dulu',
          akibat: 'Panel surya ternyata berdebu, dan kamu mencatatnya untuk dibersihkan.',
        },
        {
          id: 'catat-boros',
          teks: 'Catat semua yang boros, baru bergerak',
          akibat: 'Daftarmu lengkap: keran, lampu, dan AC yang terlalu dingin.',
        },
      ],
    },
    {
      id: 'titik-2',
      misi: 'air-energi',
      kapan: 'tengah',
      situasi: 'Keran taman menetes dan lampu kelas kosong masih menyala.',
      opsi: [
        {
          id: 'tutup-dulu',
          teks: 'Tutup keran dulu, lalu matikan lampu',
          akibat: 'Keran berhenti menetes dan kelas jadi gelap, hematnya langsung terasa.',
        },
        {
          id: 'lapor-sambil-jalan',
          teks: 'Laporkan keduanya ke Mbak Rani sambil jalan',
          akibat: 'Mbak Rani mencatat laporanmu sambil berjalan ke taman bersamamu.',
        },
      ],
    },
  ],
  biodiversitas: [
    {
      id: 'titik-1',
      misi: 'biodiversitas',
      kapan: 'npc',
      situasi: 'Bu Sari tersenyum: tim inspeksi datang sebentar lagi.',
      opsi: [
        {
          id: 'cek-taman',
          teks: 'Cek taman dan tanaman sekali lagi',
          akibat: 'Tanaman sudah rapi, dan kamu menemukan satu pot yang perlu disiram.',
        },
        {
          id: 'siapkan-cerita',
          teks: 'Siapkan cerita tentang kebun untuk tim inspeksi',
          akibat: 'Kamu menyiapkan cerita kebun yang jujur, lengkap dengan jadwal piketmu.',
        },
      ],
    },
    {
      id: 'titik-2',
      misi: 'biodiversitas',
      kapan: 'tengah',
      situasi: 'Tim inspeksi sudah di depan taman, dan satu tanaman tampak layu.',
      opsi: [
        {
          id: 'siram-cepat',
          teks: 'Siram tanaman itu sebelum mereka melihat',
          akibat: 'Tanaman itu kembali segar tepat sebelum tim inspeksi sampai.',
        },
        {
          id: 'jujur-saja',
          teks: 'Jujur saja dan tunjukkan jadwal piketmu',
          akibat: 'Tim inspeksi menghargai kejujuranmu dan melihat jadwal piket yang rapi.',
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------- Epilog ----

export interface EpilogMisi {
  /** Kunci pilihan yang menentukan epilog (mis. 'gerbang:titik-1'). */
  kunci: string
  /** Id opsi "baik" di titik itu; bila pilihan tersimpan == ini, epilog baik. */
  opsiBaik: string
  /** 1-2 kalimat bila pilihan tersimpan == opsiBaik. */
  teksBaik: string
  /** 1-2 kalimat bila pilihan tersimpan berbeda / belum memilih. */
  teksLain: string
  bonusBaik: number
  bonusLain: number
}

export const BONUS_EPILOG_BAIK = 30
export const BONUS_EPILOG_LAIN = 15

export const EPILOG_MISI: Record<ChapterId, EpilogMisi> = {
  gerbang: {
    kunci: 'gerbang:titik-1',
    opsiBaik: 'bujuk-pilah',
    teksBaik: 'Pak Plastik ikut memilah sampai akhir, dan gerbang pagi ini terasa lebih ringan.',
    teksLain: 'Gerbang sudah rapi, tapi Pak Plastik masih mengintip dari kejauhan — mungkin lain kali ia ikut.',
    bonusBaik: BONUS_EPILOG_BAIK,
    bonusLain: BONUS_EPILOG_LAIN,
  },
  kantin: {
    kunci: 'kantin:titik-1',
    opsiBaik: 'minta-bantuan',
    teksBaik: 'Pak Plastik akhirnya melempar botol ke bak yang benar, dan Kang Kantin mengangguk puas.',
    teksLain: 'Kantin sudah bersih, meski Pak Plastik pergi dengan caranya sendiri.',
    bonusBaik: BONUS_EPILOG_BAIK,
    bonusLain: BONUS_EPILOG_LAIN,
  },
  maggot: {
    kunci: 'maggot:titik-2',
    opsiBaik: 'pisah-minyak',
    teksBaik: 'Magi sehat dan lahap, dan kotak maggotmu jadi contoh buat yang lain.',
    teksLain: 'Magi tetap makan, tapi kamu mencatat untuk lebih teliti lain kali.',
    bonusBaik: BONUS_EPILOG_BAIK,
    bonusLain: BONUS_EPILOG_LAIN,
  },
  kompos: {
    kunci: 'kompos:titik-2',
    opsiBaik: 'aduk-kompos',
    teksBaik: 'Komposmu tidak bau lagi dan siap jadi pupuk kebun minggu depan.',
    teksLain: 'Kompos sudah jadi, meski aromanya sempat bikin Pak Kebun menahan napas.',
    bonusBaik: BONUS_EPILOG_BAIK,
    bonusLain: BONUS_EPILOG_LAIN,
  },
  'air-energi': {
    kunci: 'air-energi:titik-2',
    opsiBaik: 'tutup-dulu',
    teksBaik: 'Keran berhenti menetes, lampu padam, dan Mbak Rani mencatat penghematan hari ini.',
    teksLain: 'Air dan listrik sudah aman, meski semuanya sempat menunggu laporanmu.',
    bonusBaik: BONUS_EPILOG_BAIK,
    bonusLain: BONUS_EPILOG_LAIN,
  },
  biodiversitas: {
    kunci: 'biodiversitas:titik-1',
    opsiBaik: 'cek-taman',
    teksBaik: 'Tim inspeksi tersenyum melihat taman yang terawat, dan Bu Sari bangga.',
    teksLain: 'Inspeksi berjalan lancar, dan kamu belajar bahwa persiapan tidak bisa dadakan.',
    bonusBaik: BONUS_EPILOG_BAIK,
    bonusLain: BONUS_EPILOG_LAIN,
  },
}

/** Tentukan epilog misi dari pilihan yang tersimpan (sekali per misi, di Pos Hijau). */
export function pilihEpilog(misi: ChapterId, cerita: Record<string, string>): { teks: string; bonus: number } {
  const epilog = EPILOG_MISI[misi]
  if (cerita[epilog.kunci] === epilog.opsiBaik) {
    return { teks: epilog.teksBaik, bonus: epilog.bonusBaik }
  }
  return { teks: epilog.teksLain, bonus: epilog.bonusLain }
}

// ------------------------------------------------- Varian dialog ingatan ----

export interface DialogPakPlastik {
  sapaan: string
  baris: string[]
}

/**
 * Sapaan + baris Pak Plastik per status. 'netral' disalin VERBATIM dari
 * `content/npc.ts` (entri 'pak-plastik'); bila npc.ts berubah, samakan di sini.
 */
export const DIALOG_PAK_PLASTIK: Record<PakPlastikStatus, DialogPakPlastik> = {
  netral: {
    sapaan: 'Hehehe, aku Pak Plastik! Ketemu lagi, ya?',
    baris: [
      'Dulu aku suka dibuang sembarangan. Sekarang aku lagi belajar berubah, pelan-pelan.',
      'Botolku itu sebenarnya masih berguna kalau dibersihkan dan dipilah ke bak yang benar.',
      'Kamu sudah main Tas Pagi? Isi tasmu dengan barang yang bisa dipakai ulang, biar aku tidak nambah-nambah.',
    ],
  },
  dibujuk: {
    sapaan: 'Hehehe, aku Pak Plastik! Sekarang aku tim pilah, ya?',
    baris: [
      'Sejak kamu ajak memilah, aku jadi tahu botolku itu masih berguna kalau dibersihkan.',
      'Aku sekarang jagain bak Anorganik. Ada yang buang sembarangan, langsung aku tegur — dengan sopan, kok.',
      'Magi bilang aku sudah lumayan. Lumayan itu pujian besar dari seekor maggot, tahu.',
    ],
  },
  dilawan: {
    sapaan: 'Hehehe, aku Pak Plastik! Ayo, lomba lagi kapan-kapan!',
    baris: [
      'Kamu menang lomba pilah kemarin, tapi aku masih simpan botol tercepatku untuk balas dendam.',
      'Aku kalah, tapi kalah yang seru. Sekarang aku latihan memilah tiap pagi sebelum kamu datang.',
      'Lomba berikutnya, aku yang menang. Sudah aku latih lemparanku ke bak Anorganik!',
    ],
  },
  dijebak: {
    sapaan: 'Hehehe... aku Pak Plastik. Aku masih di sini, kok.',
    baris: [
      'Jebakan bak itu... lumayan licik. Aku akui, botol mengilap itu memang sulit ditolak.',
      'Aku sudah keluar dari bak, tenang saja. Tapi sekarang aku jadi mikir: mungkin bak itu memang tempatku.',
      'Lain kali ajak aku saja, jangan dijebak lagi. Aku tidak akan mengacau... terlalu banyak.',
    ],
  },
}

/**
 * Komentar Magi tentang Pak Plastik per status. Untuk 'netral' tidak ada
 * entri — pakai baris Magi yang sudah ada di npc.ts.
 */
export const DIALOG_MAGI_PAK_PLASTIK: Record<'dibujuk' | 'dilawan' | 'dijebak', string[]> = {
  dibujuk: [
    'Pak Plastik sekarang suka memilah, lho. Aku sampai tidak percaya waktu pertama kali lihat.',
    'Dia yang dibujuk malah jadi teman pilah. Kadang yang paling berisik itu yang paling cepat berubah.',
    'Kalau dia datang ke Pos Maggot, dia cuma lihat-lihat. Tidak mengacau lagi, sungguh.',
  ],
  dilawan: [
    'Kamu menantang Pak Plastik lomba pilah? Berani sekali. Aku suka.',
    'Dia kalah, tapi dia ketawa. Orang yang bisa ketawa waktu kalah itu biasanya bakal kembali lagi.',
    'Hati-hati, dia latihan tiap pagi. Lomba berikutnya bisa lebih seru.',
  ],
  dijebak: [
    'Kamu menjebak Pak Plastik di bak Anorganik? Hah, itu... kreatif sekali.',
    'Dia keluar sendiri, kok. Tapi sejak itu dia jadi lebih sering mikir sebelum mengacau.',
    'Mungkin lain kali ajak dia bicara dulu. Jebakan itu lucu, tapi ajakan lebih awet.',
  ],
}
