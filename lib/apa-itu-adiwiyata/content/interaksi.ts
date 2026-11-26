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
// - tangkap-jatuh: objek jatuh, tangkap yang benar dengan keranjang
// - sortir-cepat: ban berjalan, ketuk target yang benar sebelum waktu habis
// - kuis-kilat: soal + bar waktu, bonus beruntun
// - kartu-memori: balik kartu, pasangkan soal dengan jawaban
// - puzzle-geser: susun potongan 3x3 dengan ketuk-dua-petak-untuk-tukar
// - cari-perbedaan: dua panel berdampingan, ketuk perbedaannya
// - gambar-grafik: ketuk batang grafik sampai tingginya sesuai data
// - susun-cerita: ketuk frame sesuai urutan cerita yang benar
// - balas-cepat: pesan masuk, ketuk balasan terbaik sebelum waktu habis
// - simulasi-kantin: pesanan datang bergantian, ketuk tindakan yang benar
// - susun-menara: ketuk kandidat lapisan untuk menumpuk selang-seling
// - siram-ritme: ketuk mengikuti irama/ketukan
// - panen-ketuk: objek muncul bergantian, ketuk yang matang saja
// - ketuk-sel: ketuk sel tabel yang benar
// - pilihan: JALAN TERAKHIR bila satu tahap benar-benar tidak bisa digambarkan
//   sebagai gestur. Saat ini TIDAK ADA tahap yang memakai 'pilihan'.
// Gelombang V (variasi mekanik, Nov 2026): tiap misi kini memakai mekanik
// berbeda — tangkap-jatuh, sortir-cepat, kuis-kilat, kartu-memori,
// puzzle-geser, cari-perbedaan, gambar-grafik, susun-cerita, balas-cepat,
// simulasi-kantin, susun-menara, siram-ritme, panen-ketuk, ketuk-sel —
// supaya tidak semua tahap terasa sama. 'pipa' kini dipakai di Air & Energi
// T2; 'ketuk-berulang' dipakai di perbaikan kompos bau (TapSpam).
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
  | 'tangkap-jatuh'
  | 'sortir-cepat'
  | 'kuis-kilat'
  | 'kartu-memori'
  | 'puzzle-geser'
  | 'cari-perbedaan'
  | 'gambar-grafik'
  | 'susun-cerita'
  | 'balas-cepat'
  | 'simulasi-kantin'
  | 'susun-menara'
  | 'siram-ritme'
  | 'panen-ketuk'
  | 'ketuk-sel'
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
      jenis: 'tangkap-jatuh',
      objek: ['Tumbler', 'Lunch box', 'Botol plastik sekali pakai', 'Kantong kresek', 'Kotak bekal styrofoam'],
      target: 'Tas (untuk dibawa) atau Tinggalkan (barang sekali pakai)',
      hasilBenar: 'Barang masuk tas dengan bunyi ceria, kombo naik, daun confetti berterbangan.',
      hasilSalah: 'Meter "sampah hari ini" naik dan barang sekali pakai menumpuk di tas.',
      petunjukMagi: 'Magi: "Yang bisa dipakai ulang masuk tas, yang sekali pakai tinggal di rumah!"',
      tutorial: true,
      langkah: [
        'Tebak dulu: seret jawaban tebakan ke kotak jawaban',
        'Tangkap barang guna ulang yang jatuh',
        'Biarkan barang sekali pakai jatuh',
      ],
    },
    {
      jenis: 'tangkap-jatuh',
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
      jenis: 'sortir-cepat',
      objek: ['Sisa makanan dan kulit buah', 'Botol dan gelas plastik', 'Kertas dan kardus', 'Daun kering'],
      target: 'Bak Organik, Anorganik, atau Kertas',
      hasilBenar: 'Sampah masuk bak dengan sparkle, bak tersenyum.',
      hasilSalah: 'Bak mengernyit, sampah memantul keluar, dan Magi menjelaskan kenapa salah.',
      petunjukMagi: 'Magi: "Sisa makanan itu organik, plastik masuk anorganik, kertas ke bak Kertas!"',
      tutorial: true,
    },
    {
      jenis: 'sortir-cepat',
      objek: ['Sisa makanan', 'Botol plastik', 'Kotak styrofoam', 'Bungkus plastik berminyak', 'Tisu bekas'],
      target: 'Bak Organik, Anorganik, Kertas, atau Residu',
      hasilBenar: 'Sampah masuk bak yang benar, termasuk kasus abu-abu yang menjebak.',
      hasilSalah: 'Sampah salah bak dan bisa bikin kompos bau di misi Olah Organik.',
      petunjukMagi: 'Magi: "Styrofoam dan bungkus berminyak itu residu, bukan anorganik!"',
      tutorial: false,
    },
    {
      jenis: 'lempar',
      objek: ['Baterai bekas (B3)', 'Sisa makanan (Organik)', 'Botol plastik (Anorganik)', 'Koran bekas (Kertas)', 'Tisu dan styrofoam (Residu)'],
      target: 'Bak Organik, Anorganik, Kertas, Residu, atau B3 (bak bergerak pelan)',
      hasilBenar: 'Lemparan tepat sasaran, bak B3 berkunci rapat.',
      hasilSalah: 'Sampah jatuh dan bak bergerak menjauh.',
      petunjukMagi: 'Magi: "Baterai itu B3, jangan sampai masuk bak lain!"',
      tutorial: false,
    },
  ],
  maggot: [
    {
      jenis: 'tangkap-jatuh',
      objek: ['Sisa nasi', 'Sayur sisa', 'Buah matang', 'Daging berlebih', 'Makanan berminyak', 'Plastik'],
      target: 'Kotak maggot',
      hasilBenar: 'Maggot melahap pakan dengan lahap, kotaknya bersih dan tidak bau.',
      hasilSalah: 'Kotak jadi bau, lalat berkerumun, dan maggot sakit.',
      petunjukMagi: 'Magi: "Aku doyan nasi dan buah, tapi minyak dan plastik bikin aku sakit!"',
      tutorial: true,
      langkah: [
        'Tangkap pakan yang aman untuk maggot',
        'Biarkan pakan berminyak atau plastik jatuh',
        'Beri pakan bersih sampai maggot kenyang',
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
      jenis: 'susun-menara',
      objek: ['Daun kering', 'Kardus sobek', 'Ranting', 'Sisa sayur', 'Potongan rumput'],
      target: 'Tumpukan kompos (lapis cokelat dan hijau bergantian)',
      hasilBenar: 'Lapis tersusun rapi, tumpukan menghangat dan siap jadi kompos.',
      hasilSalah: 'Lapis acak-acakan, tumpukan tidak menghangat.',
      petunjukMagi: 'Magi: "Cokelat, hijau, cokelat, hijau — selang-seling biar komposnya jadi!"',
      tutorial: true,
      langkah: [
        'Ketuk lapisan yang benar untuk giliran ini',
        'Tumpuk selang-seling cokelat dan hijau',
        'Ulangi sampai 8 lapis',
      ],
    },
    {
      jenis: 'siram-ritme',
      objek: ['Gayung air', 'Sinar matahari', 'Pupuk kasgot'],
      target: 'Cabai atau kangkung yang butuh dirawat',
      hasilBenar: 'Tanaman segar kembali, daunnya tegak dan hijau.',
      hasilSalah: 'Tanaman makin layu karena perawatannya keliru.',
      petunjukMagi: 'Magi: "Lihat tanaman mana yang butuh dirawat, lalu ketuk tepat pada ketukan!"',
      tutorial: false,
      langkah: [
        'Lihat tanaman mana yang butuh dirawat (tulisannya di kartu tanaman)',
        'Ketuk mengikuti irama untuk merawat tanaman',
        'Ulangi untuk tanaman berikutnya',
      ],
    },
    {
      jenis: 'panen-ketuk',
      objek: ['Cabai matang', 'Kangkung matang'],
      target: 'Keranjang panen',
      hasilBenar: 'Sayur segar masuk keranjang, kebun siap dipanen lagi.',
      hasilSalah: 'Sayur mentah ikut terpetik dan layu di keranjang.',
      petunjukMagi: 'Magi: "Petik yang sudah matang saja, yang masih kecil biar tumbuh dulu!"',
      tutorial: false,
      langkah: [
        'Tunggu sayur matang muncul',
        'Ketuk sayur yang sudah matang saja',
        'Biarkan yang masih muda tumbuh dulu',
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
      jenis: 'pipa',
      objek: ['Potongan pipa', 'Sumber air hujan', 'Tong penampung'],
      target: 'Tong penampung (sambung pipa dari sumber hujan)',
      hasilBenar: 'Pipa tersambung, air hujan mengalir ke tong penampung.',
      hasilSalah: 'Pipa belum tersambung, air tidak mengalir ke tong.',
      petunjukMagi: 'Magi: "Putar potongannya sampai air mengalir ke tong!"',
      tutorial: false,
      langkah: [
        'Ketuk potongan pipa untuk memutarnya',
        'Sambung jalur dari sumber ke tong penampung',
        'Periksa aliran sampai air mengalir',
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
      jenis: 'kuis-kilat',
      objek: ['Kartu jawaban pilah sampah'],
      target: 'Jawaban kilat sebelum waktu habis',
      hasilBenar: 'Jawaban benar sebelum waktu habis, beruntun naik!',
      hasilSalah: 'Jawaban salah atau waktu habis, beruntun putus.',
      petunjukMagi: 'Magi: "Ingat pelajaran pilah di kantin, jawabannya ada di sana!"',
      tutorial: true,
    },
    {
      jenis: 'kuis-kilat',
      objek: ['Kartu jawaban maggot dan kompos'],
      target: 'Jawaban kilat sebelum waktu habis',
      hasilBenar: 'Jawaban benar sebelum waktu habis, beruntun naik!',
      hasilSalah: 'Jawaban salah atau waktu habis, beruntun putus.',
      petunjukMagi: 'Magi: "Ingat apa yang aku makan dan apa itu bahan cokelat!"',
      tutorial: false,
    },
    {
      jenis: 'kuis-kilat',
      objek: ['Kartu jawaban air, energi, dan kebun'],
      target: 'Jawaban kilat sebelum waktu habis',
      hasilBenar: 'Jawaban benar sebelum waktu habis, beruntun naik!',
      hasilSalah: 'Jawaban salah atau waktu habis, beruntun putus.',
      petunjukMagi: 'Magi: "Kompos diaduk biar bernafas, biopori biar air meresap!"',
      tutorial: false,
    },
  ],
  // --------------------------------------------------------- 8 Misi Kader
  'bank-sampah': [
    {
      jenis: 'sortir-cepat',
      objek: ['Botol plastik PET', 'Kertas bekas', 'Kaleng minuman', 'Botol kaca'],
      target: 'Kelompok PET, Kertas, Kaleng, atau Kaca di bank sampah',
      hasilBenar: 'Item masuk kelompok yang benar, timbangan bank sampah naik.',
      hasilSalah: 'Item masuk kelompok salah, tumpukan jadi tercampur.',
      petunjukMagi: 'Magi: "PET itu botol plastik bening, kaleng itu yang dari logam!"',
      tutorial: true,
      langkah: [
        'Lihat item yang muncul',
        'Ketuk jenis yang benar sebelum waktu habis',
        'Pilah sampai 10 item selesai',
      ],
    },
    {
      jenis: 'ketuk-sel',
      objek: ['Slip timbangan', 'Angka berat (kg)', 'Buku tabungan bank sampah'],
      target: 'Kolom PET, Kertas, Kaleng, atau Kaca di buku tabungan',
      hasilBenar: 'Berat tercatat rapi, total tabungan terhitung.',
      hasilSalah: 'Berat salah kolom, catatan tabungan jadi berantakan.',
      petunjukMagi: 'Magi: "Baca slip timbangan, lalu ketuk berat yang sama!"',
      tutorial: true,
      langkah: [
        'Lihat slip timbangan',
        'Ketuk berat yang sama',
        'Periksa total 15,5 kg di akhir',
      ],
    },
    {
      jenis: 'kuis-kilat',
      objek: ['Kartu jawaban hitungan tabungan'],
      target: 'Jawaban kilat hitungan tabungan',
      hasilBenar: 'Hitungan benar, tabungan kelas bertambah.',
      hasilSalah: 'Hitungan meleset, tabungan salah catat.',
      petunjukMagi: 'Magi: "Berat dikali harga per kilo, pelan-pelan saja!"',
      tutorial: false,
    },
  ],
  'lingkungan-sehat': [
    {
      jenis: 'cari-perbedaan',
      objek: ['Keran menetes', 'Sabun habis', 'Lantai licin', 'Gayung pecah', 'Bak sampah penuh'],
      target: 'Masalah di toilet sekolah',
      hasilBenar: 'Masalah ketemu dan langsung ditangani, toilet bersih dan wangi.',
      hasilSalah: 'Masalah terlewat, toilet tetap kotor dan licin.',
      petunjukMagi: 'Magi: "Cek keran, lantai, dan bak sampahnya satu per satu!"',
      tutorial: true,
      langkah: [
        'Cari masalah di toilet',
        'Ketuk masalah yang ditemukan',
        'Ketuk tindakan yang benar untuk masalah itu',
      ],
    },
    {
      jenis: 'cari-perbedaan',
      objek: ['Selokan mampet', 'Genangan air', 'Jentik nyamuk', 'Daun menumpuk', 'Bau saluran'],
      target: 'Masalah di saluran air dan selokan',
      hasilBenar: 'Selokan lancar lagi, genangan hilang.',
      hasilSalah: 'Genangan tetap ada, nyamuk makin banyak.',
      petunjukMagi: 'Magi: "Genangan itu rumah nyamuk, cari sampai ke selokan!"',
      tutorial: false,
      langkah: [
        'Cari masalah di saluran air',
        'Ketuk masalah yang ditemukan',
        'Ketuk tindakan yang benar untuk masalah itu',
      ],
    },
    {
      jenis: 'cari-perbedaan',
      objek: ['Tanaman layu', 'Rumput liar', 'Sampah berserakan', 'Poster rusak', 'Teman tidak cuci tangan'],
      target: 'Masalah di taman dan kebiasaan sehat',
      hasilBenar: 'Taman rapi lagi, semua cuci tangan sebelum makan.',
      hasilSalah: 'Taman tetap berantakan, kebiasaan sehat terlewat.',
      petunjukMagi: 'Magi: "Taman yang rapi bikin semua orang betah!"',
      tutorial: false,
      langkah: [
        'Cari masalah di taman',
        'Ketuk masalah yang ditemukan',
        'Ketuk tindakan yang benar untuk masalah itu',
      ],
    },
  ],
  'edu-lingkungan': [
    {
      jenis: 'kartu-memori',
      objek: ['Kartu jawaban pilah sampah'],
      target: 'Pasangan kartu soal dan jawaban',
      hasilBenar: 'Temanmu paham dan langsung memilah dengan benar.',
      hasilSalah: 'Temanmu bingung, sampahnya salah bak.',
      petunjukMagi: 'Magi: "Ajar pelan-pelan, kayak kamu belajar di kantin dulu!"',
      tutorial: true,
    },
    {
      jenis: 'kartu-memori',
      objek: ['Kartu jawaban kompos dan maggot'],
      target: 'Pasangan kartu soal dan jawaban',
      hasilBenar: 'Temanmu paham dan langsung merawat kompos dengan benar.',
      hasilSalah: 'Temanmu bingung, komposnya salah urus.',
      petunjukMagi: 'Magi: "Ceritakan apa yang aku makan dan kenapa kompos diaduk!"',
      tutorial: false,
    },
    {
      jenis: 'kartu-memori',
      objek: ['Kartu jawaban hemat air dan energi'],
      target: 'Pasangan kartu soal dan jawaban',
      hasilBenar: 'Temanmu paham dan langsung hemat air dan listrik.',
      hasilSalah: 'Temanmu bingung, keran tetap menetes.',
      petunjukMagi: 'Magi: "AC 16°C itu boros, keran menetes itu buang-buang air!"',
      tutorial: false,
    },
  ],
  'inovasi-hijau': [
    {
      jenis: 'puzzle-geser',
      objek: ['Gambar poster', 'Slogan kampanye', 'Warna poster'],
      target: 'Puzzle poster bebas plastik 3×3',
      hasilBenar: 'Poster jadi menarik, semua orang berhenti dan membacanya.',
      hasilSalah: 'Poster sepi peminat, pesannya tidak sampai.',
      petunjukMagi: 'Magi: "Poster yang bagus itu pesannya jelas dalam sekali lihat!"',
      tutorial: true,
      langkah: [
        'Baca brief kampanyenya',
        'Ketuk dua potongan untuk menukar posisinya',
        'Periksa apakah pesannya jelas',
      ],
    },
    {
      jenis: 'puzzle-geser',
      objek: ['Data hemat energi', 'Ikon lampu dan AC', 'Judul infografis'],
      target: 'Puzzle infografis 3×3',
      hasilBenar: 'Infografis jadi jelas, semua orang paham cara hemat listrik.',
      hasilSalah: 'Infografis membingungkan, datanya tidak terbaca.',
      petunjukMagi: 'Magi: "Angka hematnya yang besar, biar semua orang kaget!"',
      tutorial: false,
      langkah: [
        'Baca brief kampanyenya',
        'Ketuk dua potongan untuk menukar posisinya',
        'Periksa apakah datanya terbaca',
      ],
    },
    {
      jenis: 'puzzle-geser',
      objek: ['Bahan bekas', 'Sketsa alat', 'Cara kerja alat'],
      target: 'Puzzle alat sederhana 3×3',
      hasilBenar: 'Alat sederhana jadi dan bisa dipakai, bahan bekas punya guna lagi.',
      hasilSalah: 'Alat tidak masuk akal, bahannya susah dicari.',
      petunjukMagi: 'Magi: "Alat yang bagus itu bahannya gampang dicari dan cara pakainya jelas!"',
      tutorial: false,
      langkah: [
        'Baca brief kampanyenya',
        'Ketuk dua potongan untuk menukar posisinya',
        'Periksa apakah alatnya bisa dibuat',
      ],
    },
  ],
  'kantin-hijau': [
    {
      jenis: 'simulasi-kantin',
      objek: ['Meja lengket', 'Tempat cuci piring kotor', 'Lantai licin berminyak', 'Bak sampah tercampur'],
      target: 'Masalah kebersihan di kantin',
      hasilBenar: 'Kantin bersih dan wangi, pembeli nyaman.',
      hasilSalah: 'Kantin tetap kotor, pembeli tidak nyaman.',
      petunjukMagi: 'Magi: "Cek meja, lantai, dan tempat cucinya satu per satu!"',
      tutorial: true,
      langkah: [
        'Baca pesanan yang masuk — itu masalah yang ditemukan',
        'Ketuk tindakan yang benar untuk pesanan itu',
      ],
    },
    {
      jenis: 'simulasi-kantin',
      objek: ['Kantong plastik', 'Sedotan plastik', 'Styrofoam', 'Kemasan menumpuk'],
      target: 'Plastik sekali pakai di kantin',
      hasilBenar: 'Plastik sekali pakai terganti tumbler dan wadah guna ulang.',
      hasilSalah: 'Plastik sekali pakai tetap menumpuk di kantin.',
      petunjukMagi: 'Magi: "Sedotan dan styrofoam itu sekali pakai, cari sampai habis!"',
      tutorial: false,
      langkah: [
        'Baca pesanan yang masuk — itu masalah yang ditemukan',
        'Ketuk tindakan yang benar untuk pesanan itu',
      ],
    },
    {
      jenis: 'simulasi-kantin',
      objek: ['Minuman warna mencolok', 'Makanan tak tertutup', 'Penjual tanpa penjepit', 'Sisa makanan dibuang'],
      target: 'Masalah pada jajanan kantin',
      hasilBenar: 'Jajanan sehat dan higienis, semua aman dimakan.',
      hasilSalah: 'Jajanan tidak sehat tetap dijual.',
      petunjukMagi: 'Magi: "Jajanan sehat itu tertutup, segar, dan dijual dengan penjepit!"',
      tutorial: false,
      langkah: [
        'Baca pesanan yang masuk — itu masalah yang ditemukan',
        'Ketuk tindakan yang benar untuk pesanan itu',
      ],
    },
  ],
  'data-hijau': [
    {
      jenis: 'gambar-grafik',
      objek: ['Angka berat sampah (kg)', 'Kartu jawaban soal tabel'],
      target: 'Batang grafik setoran sampah tiap kelas',
      hasilBenar: 'Tabel terisi rapi, soal terjawab dari data yang benar.',
      hasilSalah: 'Angka salah sel, tabel dan jawaban ikut salah.',
      petunjukMagi: 'Magi: "Catat dulu angkanya, baru jawab soalnya!"',
      tutorial: true,
      langkah: [
        'Ketuk batang grafik sampai tingginya sesuai data',
        'Baca tabel yang sudah lengkap',
        'Jawab soal tabel dengan kuis kilat',
      ],
    },
    {
      jenis: 'gambar-grafik',
      objek: ['Angka pemakaian air dan listrik', 'Kartu jawaban soal tabel'],
      target: 'Batang grafik jumlah yang dihemat minggu ini (minggu lalu − minggu ini)',
      hasilBenar: 'Tabel terisi rapi, hematnya kelihatan dari data.',
      hasilSalah: 'Angka salah sel, hematnya tidak kelihatan.',
      petunjukMagi: 'Magi: "Bandingkan minggu lalu dan minggu ini, hematnya kelihatan!"',
      tutorial: false,
      langkah: [
        'Ketuk batang grafik sampai tingginya sesuai data',
        'Baca tabel yang sudah lengkap',
        'Jawab soal tabel dengan kuis kilat',
      ],
    },
    {
      jenis: 'gambar-grafik',
      objek: ['Angka jumlah tanaman', 'Kartu jawaban soal tabel'],
      target: 'Batang grafik tanaman kebun dan hidroponik',
      hasilBenar: 'Tabel terisi rapi, tanaman yang butuh perhatian ketemu.',
      hasilSalah: 'Angka salah sel, tanaman yang butuh perhatian terlewat.',
      petunjukMagi: 'Magi: "Hitung tanamannya satu per satu, jangan dikira-kira!"',
      tutorial: false,
      langkah: [
        'Ketuk batang grafik sampai tingginya sesuai data',
        'Baca tabel yang sudah lengkap',
        'Jawab soal tabel dengan kuis kilat',
      ],
    },
  ],
  'eco-communication': [
    {
      jenis: 'susun-cerita',
      objek: ['Konsep reels', 'Cuplikan video', 'Kapsyen reels'],
      target: 'Storyboard reels zero waste',
      hasilBenar: 'Reels ditonton banyak orang, kampanye zero waste menyebar.',
      hasilSalah: 'Reels sepi penonton, pesannya tidak sampai.',
      petunjukMagi: 'Magi: "Reels yang bagus itu 30 detik tapi pesannya nempel!"',
      tutorial: true,
      langkah: [
        'Baca brief kontennya',
        'Ketuk frame sesuai urutan cerita yang benar',
        'Periksa apakah pesannya jelas',
      ],
    },
    {
      jenis: 'susun-cerita',
      objek: ['Data hemat energi', 'Desain postingan', 'Kapsyen infografis'],
      target: 'Feed media sosial sekolah',
      hasilBenar: 'Postingan dibagikan banyak orang, hemat energi jadi tren.',
      hasilSalah: 'Postingan sepi, datanya tidak terbaca.',
      petunjukMagi: 'Magi: "Infografis yang bagus itu datanya benar dan gampang dibaca!"',
      tutorial: false,
      langkah: [
        'Baca brief kontennya',
        'Ketuk frame sesuai urutan cerita yang benar',
        'Periksa apakah datanya terbaca',
      ],
    },
    {
      jenis: 'susun-cerita',
      objek: ['Strategi kampanye', 'Poster "Pilah 10 Detik"', 'Jadwal posting'],
      target: 'Papan kampanye olah sampah',
      hasilBenar: 'Kampanye jalan, semua orang ikut memilah 10 detik.',
      hasilSalah: 'Kampanye sepi, ajakannya tidak jelas.',
      petunjukMagi: 'Magi: "Kampanye yang bagus itu ajakannya jelas dan bisa diikuti semua orang!"',
      tutorial: false,
      langkah: [
        'Baca brief kampanyenya',
        'Ketuk frame sesuai urutan cerita yang benar',
        'Periksa apakah ajakannya bisa diikuti',
      ],
    },
  ],
  'jejaring-hijau': [
    {
      jenis: 'balas-cepat',
      objek: ['Kartu pendekatan ke DLH', 'Surat kerja sama', 'Jadwal pelatihan pilah'],
      target: 'Meja kerja sama DLH',
      hasilBenar: 'DLH setuju membantu, bibit dan pelatihan pilah datang ke sekolah.',
      hasilSalah: 'Tawaran DLH terlewat, kerja samanya batal.',
      petunjukMagi: 'Magi: "Sambut tawaran baik dengan sopan dan jelas maunya apa!"',
      tutorial: true,
      langkah: [
        'Baca skenario mitranya',
        'Ketuk balasan terbaik sebelum waktu habis',
        'Periksa apakah semua pihak diuntungkan',
      ],
    },
    {
      jenis: 'balas-cepat',
      objek: ['Kartu proposal', 'Rencana dana bak pilah', 'Ucapan terima kasih'],
      target: 'Meja proposal pelaku usaha',
      hasilBenar: 'Pelaku usaha setuju mendukung, bak pilah baru datang.',
      hasilSalah: 'Proposal ditolak, dukungannya tidak jadi.',
      petunjukMagi: 'Magi: "Proposal yang bagus itu jelas manfaatnya buat usaha itu juga!"',
      tutorial: false,
      langkah: [
        'Baca skenario mitranya',
        'Ketuk balasan terbaik sebelum waktu habis',
        'Periksa apakah semua pihak diuntungkan',
      ],
    },
    {
      jenis: 'balas-cepat',
      objek: ['Kartu ajakan', 'Rencana aksi bersih sungai', 'Poster kegiatan'],
      target: 'Papan pengumuman komunitas',
      hasilBenar: 'Komunitas ikut, aksi bersih sungai ramai.',
      hasilSalah: 'Ajakan sepi, aksinya batal.',
      petunjukMagi: 'Magi: "Ajak komunitas dengan kegiatan yang seru, bukan cuma ceramah!"',
      tutorial: false,
      langkah: [
        'Baca skenario mitranya',
        'Ketuk balasan terbaik sebelum waktu habis',
        'Periksa apakah semua pihak diuntungkan',
      ],
    },
  ],
}
