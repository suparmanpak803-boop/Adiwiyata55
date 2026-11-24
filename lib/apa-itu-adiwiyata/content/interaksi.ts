// Pemetaan interaksi gestur untuk SEMUA 14 misi (6 misi utama + 8 Misi Kader).
// Tiap tahap menyatakan gestur apa yang dipakai, objek apa, target apa,
// hasil benar/salah apa, dan petunjuk Magi apa — supaya guru bisa menambah
// misi baru dengan mengisi data ini tanpa mengubah kode.
//
// Kosakata gestur (komponen bersama, Pointer Events — touch + mouse):
// - drag-drop: seret benda ke target (zona target menyala, "snap" saat benar)
// - lempar: tarik dan lepas, lintasan titik-titik, kekuatan dari panjang tarikan
// - tahan: tahan untuk menyiram/mengayak/mengisi, bar progres melingkar
// - putar: gerakan melingkar untuk memutar keran atau bor
// - tuas: geser tuas untuk mengatur suhu/kelembapan
// - ketuk-berulang: ketuk berulang untuk mencangkul atau mengaduk
// - pipa: susun dan putar potongan pipa agar air mengalir
// - cari-objek: cari dan ketuk objek di area dalam batas waktu
// - pilihan: JALAN TERAKHIR bila satu tahap benar-benar tidak bisa digambarkan
//   sebagai gestur. Saat ini TIDAK ADA tahap yang memakai 'pilihan'.
// 'putar' dipakai di biopori (bor tanah); 'ketuk-berulang' dan 'pipa' belum
// terpakai di 42 tahap ini — keduanya tersedia untuk misi baru (mis. mencangkul
// kebun, menyusun pipa air hujan ke tong penampung).
//
// Isi tiap tahap konsisten dengan konten yang sudah ada (item pilah, soal,
// temuan inspeksi, pilihan) — hanya CARA memainkannya yang diubah menjadi
// gestur. Versi tombol yang sudah ada tetap disimpan sebagai mode alternatif
// satu-ketukan untuk gestur rumit (aturan aksesibilitas).

import type { ChapterId, TugasKaderId } from '../types'

export type JenisInteraksi =
  | 'drag-drop'
  | 'lempar'
  | 'tahan'
  | 'putar'
  | 'tuas'
  | 'ketuk-berulang'
  | 'pipa'
  | 'cari-objek'
  | 'pilihan'

export interface SpesifikasiInteraksi {
  jenis: JenisInteraksi
  objek: string[]
  target: string
  hasilBenar: string
  hasilSalah: string
  /** Petunjuk dari Magi, maksimal 1 kalimat. */
  petunjukMagi: string
  /** True untuk tahap 1 tiap misi (tahap awal memakai tangan penunjuk). */
  tutorial: boolean
  /** Urutan langkah yang masuk akal, bila satu tahap punya beberapa langkah. */
  langkah?: string[]
}

/** Satu spesifikasi per tahap (3 tahap per misi), urutan = urutan tahap. */
export const INTERAKSI_MISI: Record<ChapterId | TugasKaderId, SpesifikasiInteraksi[]> = {
  // ---------------------------------------------------------- 6 misi utama
  gerbang: [
    {
      jenis: 'drag-drop',
      objek: ['Tumbler', 'Lunch box', 'Botol plastik sekali pakai', 'Kantong kresek', 'Kotak bekal styrofoam'],
      target: 'Tas (untuk dibawa) atau Tinggalkan (barang sekali pakai)',
      hasilBenar: 'Barang masuk tas dengan bunyi ceria, kombo naik, daun confetti berterbangan.',
      hasilSalah: 'Meter "sampah hari ini" naik dan barang sekali pakai menumpuk di tas.',
      petunjukMagi: 'Magi: "Yang bisa dipakai ulang masuk tas, yang sekali pakai tinggal di rumah!"',
      tutorial: true,
      langkah: [
        'Tebak dulu: seret jawaban tebakan ke kotak jawaban',
        'Seret barang ke Tas kalau bisa dipakai ulang',
        'Seret ke Tinggalkan kalau barang sekali pakai',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Tumbler', 'Lunch box', 'Botol plastik sekali pakai', 'Kantong kresek', 'Kotak bekal styrofoam'],
      target: 'Tas (untuk dibawa) atau Tinggalkan (barang sekali pakai)',
      hasilBenar: 'Barang masuk tas makin cepat, kombo beruntun membuat skor berlipat.',
      hasilSalah: 'Waktu hampir habis dan meter "sampah hari ini" naik.',
      petunjukMagi: 'Magi: "Lebih cepat! Tumbler dan lunch box dulu, sisanya pikir sebentar."',
      tutorial: false,
    },
    {
      jenis: 'lempar',
      objek: ['Tumbler', 'Lunch box', 'Botol plastik sekali pakai', 'Kantong kresek', 'Kotak bekal styrofoam'],
      target: 'Tas dari jarak (lempar dengan lintasan titik-titik)',
      hasilBenar: 'Barang melayang masuk tas tepat sasaran, skor kombo berlipat.',
      hasilSalah: 'Barang jatuh ke lantai dan meter "sampah hari ini" naik.',
      petunjukMagi: 'Magi: "Tarik lebih panjang biar lemparannya sampai ke tas!"',
      tutorial: false,
    },
  ],
  kantin: [
    {
      jenis: 'drag-drop',
      objek: ['Sisa makanan dan kulit buah', 'Botol dan gelas plastik', 'Kertas dan kardus', 'Daun kering'],
      target: 'Tong Organik atau Tong Anorganik',
      hasilBenar: 'Sampah masuk tong dengan sparkle, tong tersenyum.',
      hasilSalah: 'Tong mengernyit, sampah memantul keluar, dan Magi menjelaskan kenapa salah.',
      petunjukMagi: 'Magi: "Sisa makanan itu organik, plastik masuk anorganik!"',
      tutorial: true,
    },
    {
      jenis: 'drag-drop',
      objek: ['Sisa makanan', 'Botol plastik', 'Kotak styrofoam', 'Bungkus plastik berminyak', 'Tisu bekas'],
      target: 'Tong Organik, Anorganik, atau Residu',
      hasilBenar: 'Sampah masuk tong yang benar, termasuk kasus abu-abu yang menjebak.',
      hasilSalah: 'Sampah salah tong dan bisa bikin kompos bau di misi Olah Organik.',
      petunjukMagi: 'Magi: "Styrofoam dan bungkus berminyak itu residu, bukan anorganik!"',
      tutorial: false,
    },
    {
      jenis: 'lempar',
      objek: ['Baterai bekas (B3)', 'Sisa makanan (Organik)', 'Botol plastik (Anorganik)', 'Tisu dan styrofoam (Residu)'],
      target: 'Tong Organik, Anorganik, Residu, atau B3 (tong bergerak pelan)',
      hasilBenar: 'Lemparan tepat sasaran, tong B3 berkunci rapat.',
      hasilSalah: 'Sampah jatuh dan tong bergerak menjauh.',
      petunjukMagi: 'Magi: "Baterai itu B3, jangan sampai masuk tong lain!"',
      tutorial: false,
    },
  ],
  maggot: [
    {
      jenis: 'drag-drop',
      objek: ['Sisa nasi', 'Sayur sisa', 'Buah matang', 'Daging berlebih', 'Makanan berminyak', 'Plastik'],
      target: 'Kotak maggot',
      hasilBenar: 'Maggot melahap pakan dengan lahap, kotaknya bersih dan tidak bau.',
      hasilSalah: 'Kotak jadi bau, lalat berkerumun, dan maggot sakit.',
      petunjukMagi: 'Magi: "Aku doyan nasi dan buah, tapi minyak dan plastik bikin aku sakit!"',
      tutorial: true,
      langkah: [
        'Seret pakan ke kotak maggot',
        'Beri pakan bersih sampai maggot kenyang',
        'Jangan beri daging, minyak, atau plastik',
      ],
    },
    {
      jenis: 'tuas',
      objek: ['Tuas kelembapan', 'Tuas suhu', 'Tuas ventilasi'],
      target: 'Nilai ideal kotak maggot (tidak terlalu lembap, tidak terlalu panas)',
      hasilBenar: 'Indikator kembali hijau, maggot tenang dan aktif.',
      hasilSalah: 'Kotak makin lembap atau panas, maggot lemas.',
      petunjukMagi: 'Magi: "Geser pelan-pelan sampai jarumnya pas di tengah!"',
      tutorial: false,
      langkah: [
        'Periksa indikator kotak (kelembapan, suhu, bau)',
        'Geser tuas sampai nilainya ideal',
        'Tunggu maggot tenang sebelum lanjut',
      ],
    },
    {
      jenis: 'tahan',
      objek: ['Saringan maggot', 'Maggot dewasa', 'Kasgot'],
      target: 'Wadah pakan ikan (maggot) dan karung kasgot (pupuk)',
      hasilBenar: 'Maggot terpisah bersih dari kasgot, pakan ikan penuh.',
      hasilSalah: 'Saringan dilepas terlalu cepat, maggot masih tercampur kasgot.',
      petunjukMagi: 'Magi: "Tahan terus sampai semua maggot turun ke wadah!"',
      tutorial: false,
      langkah: [
        'Tunggu timer selesai, maggot sudah dewasa',
        'Tahan saringan untuk mengayak maggot dari kasgot',
        'Lepas saat maggot sudah terpisah',
      ],
    },
  ],
  kompos: [
    {
      jenis: 'drag-drop',
      objek: ['Daun kering', 'Kardus sobek', 'Ranting', 'Sisa sayur', 'Potongan rumput'],
      target: 'Tumpukan kompos (lapis cokelat dan hijau bergantian)',
      hasilBenar: 'Lapis tersusun rapi, tumpukan menghangat dan siap jadi kompos.',
      hasilSalah: 'Lapis acak-acakan, tumpukan tidak menghangat.',
      petunjukMagi: 'Magi: "Cokelat, hijau, cokelat, hijau — selang-seling biar komposnya jadi!"',
      tutorial: true,
      langkah: [
        'Seret bahan cokelat (daun, kardus, ranting)',
        'Seret bahan hijau (sayur, rumput)',
        'Ulangi sampai 8 lapis',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Gayung air', 'Sinar matahari', 'Pupuk kasgot'],
      target: 'Cabai atau kangkung yang butuh dirawat',
      hasilBenar: 'Tanaman segar kembali, daunnya tegak dan hijau.',
      hasilSalah: 'Tanaman makin layu karena perawatannya keliru.',
      petunjukMagi: 'Magi: "Lihat dulu tanamannya butuh apa — air, cahaya, atau pupuk!"',
      tutorial: false,
      langkah: [
        'Lihat kebutuhan tanaman (haus, kurang cahaya, butuh pupuk)',
        'Seret alat yang benar ke tanaman',
        'Ulangi untuk tanaman berikutnya',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Cabai matang', 'Kangkung matang'],
      target: 'Keranjang panen',
      hasilBenar: 'Sayur segar masuk keranjang, kebun siap dipanen lagi.',
      hasilSalah: 'Sayur mentah ikut terpetik dan layu di keranjang.',
      petunjukMagi: 'Magi: "Petik yang sudah matang saja, yang masih kecil biar tumbuh dulu!"',
      tutorial: false,
      langkah: [
        'Tunggu sayur matang',
        'Petik sayur yang sudah matang',
        'Seret ke keranjang panen',
      ],
    },
  ],
  'air-energi': [
    {
      jenis: 'putar',
      objek: ['Bor tanah', 'Lubang biopori'],
      target: '5 lubang biopori di halaman sekolah',
      hasilBenar: 'Lubang jadi dalam, air hujan bisa meresap ke tanah.',
      hasilSalah: 'Lubang dangkal, air hujan menggenang di halaman.',
      petunjukMagi: 'Magi: "Putar terus sampai lubangnya dalam, air hujan butuh jalan masuk!"',
      tutorial: true,
      langkah: [
        'Ketuk lubang untuk mulai mengebor',
        'Putar melingkar untuk mengebor sampai dalam',
        'Ulangi sampai 5 lubang jadi',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Ember penampung', 'Tetes hujan'],
      target: 'Tong penampung air hujan',
      hasilBenar: 'Ember penuh, air hujan tertampung untuk menyiram kebun.',
      hasilSalah: 'Tetes hujan jatuh ke tanah dan terbuang.',
      petunjukMagi: 'Magi: "Seret embernya mengikuti tetes hujan, jangan diam saja!"',
      tutorial: false,
      langkah: [
        'Seret ember ke bawah tetes hujan',
        'Tangkap 10 tetes sebelum waktu habis',
        'Tampung airnya ke tong penampung',
      ],
    },
    {
      jenis: 'cari-objek',
      objek: ['Lampu kelas menyala', 'AC 16°C', 'Kipas kantin menyala', 'Komputer standby', 'Keran toilet menetes'],
      target: '5 perangkat boros di antara perangkat sekolah',
      hasilBenar: 'Perangkat boros ketemu dan langsung dimatikan, lampu sekolah ikut tersenyum.',
      hasilSalah: 'Perangkat yang tidak boros ikut dimatikan, ruangan jadi gelap.',
      petunjukMagi: 'Magi: "Cari yang masih menyala padahal tidak dipakai!"',
      tutorial: false,
      langkah: [
        'Periksa ruangan satu per satu',
        'Ketuk perangkat yang boros',
        'Temukan kelima perangkat boros',
      ],
    },
  ],
  biodiversitas: [
    {
      jenis: 'drag-drop',
      objek: ['Kartu jawaban pilah sampah'],
      target: 'Kotak jawaban',
      hasilBenar: 'Jawaban melayang ke kotak dengan sparkle.',
      hasilSalah: 'Jawaban memantul, kotak menggeleng, waktu terus berjalan.',
      petunjukMagi: 'Magi: "Ingat pelajaran pilah di kantin, jawabannya ada di sana!"',
      tutorial: true,
    },
    {
      jenis: 'drag-drop',
      objek: ['Kartu jawaban maggot dan kompos'],
      target: 'Kotak jawaban',
      hasilBenar: 'Jawaban melayang ke kotak dengan sparkle.',
      hasilSalah: 'Jawaban memantul, kotak menggeleng, waktu terus berjalan.',
      petunjukMagi: 'Magi: "Ingat apa yang aku makan dan apa itu bahan cokelat!"',
      tutorial: false,
    },
    {
      jenis: 'drag-drop',
      objek: ['Kartu jawaban air, energi, dan kebun'],
      target: 'Kotak jawaban',
      hasilBenar: 'Jawaban melayang ke kotak dengan sparkle.',
      hasilSalah: 'Jawaban memantul, kotak menggeleng, waktu terus berjalan.',
      petunjukMagi: 'Magi: "Kompos diaduk biar bernafas, biopori biar air meresap!"',
      tutorial: false,
    },
  ],
  // --------------------------------------------------------- 8 Misi Kader
  'bank-sampah': [
    {
      jenis: 'drag-drop',
      objek: ['Botol plastik PET', 'Kertas bekas', 'Kaleng minuman', 'Botol kaca'],
      target: 'Kelompok PET, Kertas, Kaleng, atau Kaca di bank sampah',
      hasilBenar: 'Item masuk kelompok yang benar, timbangan bank sampah naik.',
      hasilSalah: 'Item masuk kelompok salah, tumpukan jadi tercampur.',
      petunjukMagi: 'Magi: "PET itu botol plastik bening, kaleng itu yang dari logam!"',
      tutorial: true,
      langkah: [
        'Lihat item yang muncul',
        'Seret ke kelompok jenisnya',
        'Pilah sampai 10 item selesai',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Angka berat (kg)', 'Buku tabungan bank sampah'],
      target: 'Kolom PET, Kertas, Kaleng, atau Kaca di buku tabungan',
      hasilBenar: 'Berat tercatat rapi, total tabungan terhitung.',
      hasilSalah: 'Berat salah kolom, catatan tabungan jadi berantakan.',
      petunjukMagi: 'Magi: "Baca tabel timbangan dulu, baru seret angkanya!"',
      tutorial: false,
      langkah: [
        'Lihat tabel timbangan hari ini',
        'Seret berat yang benar ke jenisnya',
        'Periksa total 15,5 kg di akhir',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Kartu jawaban hitungan tabungan'],
      target: 'Kotak jawaban',
      hasilBenar: 'Hitungan benar, tabungan kelas bertambah.',
      hasilSalah: 'Hitungan meleset, tabungan salah catat.',
      petunjukMagi: 'Magi: "Berat dikali harga per kilo, pelan-pelan saja!"',
      tutorial: false,
    },
  ],
  'lingkungan-sehat': [
    {
      jenis: 'cari-objek',
      objek: ['Keran menetes', 'Sabun habis', 'Lantai licin', 'Gayung pecah', 'Tong sampah penuh'],
      target: 'Masalah di toilet sekolah',
      hasilBenar: 'Masalah ketemu dan langsung ditangani, toilet bersih dan wangi.',
      hasilSalah: 'Masalah terlewat, toilet tetap kotor dan licin.',
      petunjukMagi: 'Magi: "Cek keran, lantai, dan tong sampahnya satu per satu!"',
      tutorial: true,
      langkah: [
        'Cari masalah di toilet',
        'Ketuk masalah yang ditemukan',
        'Seret tindakan yang benar ke masalah itu',
      ],
    },
    {
      jenis: 'cari-objek',
      objek: ['Selokan mampet', 'Genangan air', 'Jentik nyamuk', 'Daun menumpuk', 'Bau saluran'],
      target: 'Masalah di saluran air dan selokan',
      hasilBenar: 'Selokan lancar lagi, genangan hilang.',
      hasilSalah: 'Genangan tetap ada, nyamuk makin banyak.',
      petunjukMagi: 'Magi: "Genangan itu rumah nyamuk, cari sampai ke selokan!"',
      tutorial: false,
      langkah: [
        'Cari masalah di saluran air',
        'Ketuk masalah yang ditemukan',
        'Seret tindakan yang benar ke masalah itu',
      ],
    },
    {
      jenis: 'cari-objek',
      objek: ['Tanaman layu', 'Rumput liar', 'Sampah berserakan', 'Poster rusak', 'Teman tidak cuci tangan'],
      target: 'Masalah di taman dan kebiasaan sehat',
      hasilBenar: 'Taman rapi lagi, semua cuci tangan sebelum makan.',
      hasilSalah: 'Taman tetap berantakan, kebiasaan sehat terlewat.',
      petunjukMagi: 'Magi: "Taman yang rapi bikin semua orang betah!"',
      tutorial: false,
      langkah: [
        'Cari masalah di taman',
        'Ketuk masalah yang ditemukan',
        'Seret tindakan yang benar ke masalah itu',
      ],
    },
  ],
  'edu-lingkungan': [
    {
      jenis: 'drag-drop',
      objek: ['Kartu jawaban pilah sampah'],
      target: 'Kotak jawaban temanmu',
      hasilBenar: 'Temanmu paham dan langsung memilah dengan benar.',
      hasilSalah: 'Temanmu bingung, sampahnya salah tong.',
      petunjukMagi: 'Magi: "Ajar pelan-pelan, kayak kamu belajar di kantin dulu!"',
      tutorial: true,
    },
    {
      jenis: 'drag-drop',
      objek: ['Kartu jawaban kompos dan maggot'],
      target: 'Kotak jawaban temanmu',
      hasilBenar: 'Temanmu paham dan langsung merawat kompos dengan benar.',
      hasilSalah: 'Temanmu bingung, komposnya salah urus.',
      petunjukMagi: 'Magi: "Ceritakan apa yang aku makan dan kenapa kompos diaduk!"',
      tutorial: false,
    },
    {
      jenis: 'drag-drop',
      objek: ['Kartu jawaban hemat air dan energi'],
      target: 'Kotak jawaban temanmu',
      hasilBenar: 'Temanmu paham dan langsung hemat air dan listrik.',
      hasilSalah: 'Temanmu bingung, keran tetap menetes.',
      petunjukMagi: 'Magi: "AC 16°C itu boros, keran menetes itu buang-buang air!"',
      tutorial: false,
    },
  ],
  'inovasi-hijau': [
    {
      jenis: 'drag-drop',
      objek: ['Gambar poster', 'Slogan kampanye', 'Warna poster'],
      target: 'Kanvas poster bebas plastik',
      hasilBenar: 'Poster jadi menarik, semua orang berhenti dan membacanya.',
      hasilSalah: 'Poster sepi peminat, pesannya tidak sampai.',
      petunjukMagi: 'Magi: "Poster yang bagus itu pesannya jelas dalam sekali lihat!"',
      tutorial: true,
      langkah: [
        'Baca brief kampanyenya',
        'Seret elemen yang paling efektif ke kanvas',
        'Periksa apakah pesannya jelas',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Data hemat energi', 'Ikon lampu dan AC', 'Judul infografis'],
      target: 'Kanvas infografis',
      hasilBenar: 'Infografis jadi jelas, semua orang paham cara hemat listrik.',
      hasilSalah: 'Infografis membingungkan, datanya tidak terbaca.',
      petunjukMagi: 'Magi: "Angka hematnya yang besar, biar semua orang kaget!"',
      tutorial: false,
      langkah: [
        'Baca brief kampanyenya',
        'Seret elemen yang paling efektif ke kanvas',
        'Periksa apakah datanya terbaca',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Bahan bekas', 'Sketsa alat', 'Cara kerja alat'],
      target: 'Meja karya inovasi',
      hasilBenar: 'Alat sederhana jadi dan bisa dipakai, bahan bekas punya guna lagi.',
      hasilSalah: 'Alat tidak masuk akal, bahannya susah dicari.',
      petunjukMagi: 'Magi: "Alat yang bagus itu bahannya gampang dicari dan cara pakainya jelas!"',
      tutorial: false,
      langkah: [
        'Baca brief kampanyenya',
        'Seret ide yang paling masuk akal ke meja karya',
        'Periksa apakah alatnya bisa dibuat',
      ],
    },
  ],
  'kantin-hijau': [
    {
      jenis: 'cari-objek',
      objek: ['Meja lengket', 'Tempat cuci piring kotor', 'Lantai licin berminyak', 'Tong sampah tercampur'],
      target: 'Masalah kebersihan di kantin',
      hasilBenar: 'Kantin bersih dan wangi, pembeli nyaman.',
      hasilSalah: 'Kantin tetap kotor, pembeli tidak nyaman.',
      petunjukMagi: 'Magi: "Cek meja, lantai, dan tempat cucinya satu per satu!"',
      tutorial: true,
      langkah: [
        'Cari masalah kebersihan di kantin',
        'Ketuk masalah yang ditemukan',
        'Seret tindakan yang benar ke masalah itu',
      ],
    },
    {
      jenis: 'cari-objek',
      objek: ['Kantong plastik', 'Sedotan plastik', 'Styrofoam', 'Kemasan menumpuk'],
      target: 'Plastik sekali pakai di kantin',
      hasilBenar: 'Plastik sekali pakai terganti tumbler dan wadah guna ulang.',
      hasilSalah: 'Plastik sekali pakai tetap menumpuk di kantin.',
      petunjukMagi: 'Magi: "Sedotan dan styrofoam itu sekali pakai, cari sampai habis!"',
      tutorial: false,
      langkah: [
        'Cari plastik sekali pakai di kantin',
        'Ketuk plastik yang ditemukan',
        'Seret tindakan yang benar ke plastik itu',
      ],
    },
    {
      jenis: 'cari-objek',
      objek: ['Minuman warna mencolok', 'Makanan tak tertutup', 'Penjual tanpa penjepit', 'Sisa makanan dibuang'],
      target: 'Masalah pada jajanan kantin',
      hasilBenar: 'Jajanan sehat dan higienis, semua aman dimakan.',
      hasilSalah: 'Jajanan tidak sehat tetap dijual.',
      petunjukMagi: 'Magi: "Jajanan sehat itu tertutup, segar, dan dijual dengan penjepit!"',
      tutorial: false,
      langkah: [
        'Cari masalah pada jajanan kantin',
        'Ketuk masalah yang ditemukan',
        'Seret tindakan yang benar ke masalah itu',
      ],
    },
  ],
  'data-hijau': [
    {
      jenis: 'drag-drop',
      objek: ['Angka berat sampah (kg)', 'Kartu jawaban soal tabel'],
      target: 'Sel tabel setoran sampah tiap kelas',
      hasilBenar: 'Tabel terisi rapi, soal terjawab dari data yang benar.',
      hasilSalah: 'Angka salah sel, tabel dan jawaban ikut salah.',
      petunjukMagi: 'Magi: "Catat dulu angkanya, baru jawab soalnya!"',
      tutorial: true,
      langkah: [
        'Seret angka ke sel tabel yang benar',
        'Baca tabel yang sudah lengkap',
        'Seret jawaban ke kotak soal',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Angka pemakaian air dan listrik', 'Kartu jawaban soal tabel'],
      target: 'Sel tabel pemakaian minggu lalu dan minggu ini',
      hasilBenar: 'Tabel terisi rapi, hematnya kelihatan dari data.',
      hasilSalah: 'Angka salah sel, hematnya tidak kelihatan.',
      petunjukMagi: 'Magi: "Bandingkan minggu lalu dan minggu ini, hematnya kelihatan!"',
      tutorial: false,
      langkah: [
        'Seret angka ke sel tabel yang benar',
        'Baca tabel yang sudah lengkap',
        'Seret jawaban ke kotak soal',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Angka jumlah tanaman', 'Kartu jawaban soal tabel'],
      target: 'Sel tabel tanaman kebun dan hidroponik',
      hasilBenar: 'Tabel terisi rapi, tanaman yang butuh perhatian ketemu.',
      hasilSalah: 'Angka salah sel, tanaman yang butuh perhatian terlewat.',
      petunjukMagi: 'Magi: "Hitung tanamannya satu per satu, jangan dikira-kira!"',
      tutorial: false,
      langkah: [
        'Seret angka ke sel tabel yang benar',
        'Baca tabel yang sudah lengkap',
        'Seret jawaban ke kotak soal',
      ],
    },
  ],
  'eco-communication': [
    {
      jenis: 'drag-drop',
      objek: ['Konsep reels', 'Cuplikan video', 'Kapsyen reels'],
      target: 'Storyboard reels zero waste',
      hasilBenar: 'Reels ditonton banyak orang, kampanye zero waste menyebar.',
      hasilSalah: 'Reels sepi penonton, pesannya tidak sampai.',
      petunjukMagi: 'Magi: "Reels yang bagus itu 30 detik tapi pesannya nempel!"',
      tutorial: true,
      langkah: [
        'Baca brief kontennya',
        'Seret konsep yang paling efektif ke storyboard',
        'Periksa apakah pesannya jelas',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Data hemat energi', 'Desain postingan', 'Kapsyen infografis'],
      target: 'Feed media sosial sekolah',
      hasilBenar: 'Postingan dibagikan banyak orang, hemat energi jadi tren.',
      hasilSalah: 'Postingan sepi, datanya tidak terbaca.',
      petunjukMagi: 'Magi: "Infografis yang bagus itu datanya benar dan gampang dibaca!"',
      tutorial: false,
      langkah: [
        'Baca brief kontennya',
        'Seret konsep yang paling efektif ke feed',
        'Periksa apakah datanya terbaca',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Strategi kampanye', 'Poster "Pilah 10 Detik"', 'Jadwal posting'],
      target: 'Papan kampanye olah sampah',
      hasilBenar: 'Kampanye jalan, semua orang ikut memilah 10 detik.',
      hasilSalah: 'Kampanye sepi, ajakannya tidak jelas.',
      petunjukMagi: 'Magi: "Kampanye yang bagus itu ajakannya jelas dan bisa diikuti semua orang!"',
      tutorial: false,
      langkah: [
        'Baca brief kampanyenya',
        'Seret strategi yang paling efektif ke papan kampanye',
        'Periksa apakah ajakannya bisa diikuti',
      ],
    },
  ],
  'jejaring-hijau': [
    {
      jenis: 'drag-drop',
      objek: ['Kartu pendekatan ke DLH', 'Surat kerja sama', 'Jadwal pelatihan pilah'],
      target: 'Meja kerja sama DLH',
      hasilBenar: 'DLH setuju membantu, bibit dan pelatihan pilah datang ke sekolah.',
      hasilSalah: 'Tawaran DLH terlewat, kerja samanya batal.',
      petunjukMagi: 'Magi: "Sambut tawaran baik dengan sopan dan jelas maunya apa!"',
      tutorial: true,
      langkah: [
        'Baca skenario mitranya',
        'Seret pendekatan yang paling tepat ke meja kerja sama',
        'Periksa apakah semua pihak diuntungkan',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Kartu proposal', 'Rencana dana tong pilah', 'Ucapan terima kasih'],
      target: 'Meja proposal pelaku usaha',
      hasilBenar: 'Pelaku usaha setuju mendukung, tong pilah baru datang.',
      hasilSalah: 'Proposal ditolak, dukungannya tidak jadi.',
      petunjukMagi: 'Magi: "Proposal yang bagus itu jelas manfaatnya buat usaha itu juga!"',
      tutorial: false,
      langkah: [
        'Baca skenario mitranya',
        'Seret pendekatan yang paling tepat ke meja proposal',
        'Periksa apakah semua pihak diuntungkan',
      ],
    },
    {
      jenis: 'drag-drop',
      objek: ['Kartu ajakan', 'Rencana aksi bersih sungai', 'Poster kegiatan'],
      target: 'Papan pengumuman komunitas',
      hasilBenar: 'Komunitas ikut, aksi bersih sungai ramai.',
      hasilSalah: 'Ajakan sepi, aksinya batal.',
      petunjukMagi: 'Magi: "Ajak komunitas dengan kegiatan yang seru, bukan cuma ceramah!"',
      tutorial: false,
      langkah: [
        'Baca skenario mitranya',
        'Seret pendekatan yang paling tepat ke papan pengumuman',
        'Periksa apakah semua pihak diuntungkan',
      ],
    },
  ],
}
