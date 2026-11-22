// DATA CONTOH — Struktur Petugas Adiwiyata
// ---------------------------------------------------------------
// PERINGATAN:
// - Semua nama, kelas, dan nomor WhatsApp di file ini adalah DATA
//   CONTOH (fiktif) untuk keperluan tampilan halaman
//   "Struktur Petugas Adiwiyata".
// - Bila data contoh diganti dengan data asli, halaman ini TERBUKA
//   UNTUK PUBLIK (tanpa login). Jangan cantumkan data pribadi
//   sensitif: hanya nama, kelas, jabatan, dan tugas.
// - Nomor WhatsApp di bawah ini adalah nomor CONTOH dan WAJIB
//   diganti dengan nomor asli sebelum dipakai.
// - Untuk mengubah data petugas, ubah objek
//   STRUKTUR_PETUGAS_CONTOH di bawah ini. Tidak perlu menyentuh
//   kode tampilan di components/adiwiyata/struktur-pohon.tsx.
// - `foto` boleh dikosongkan: bila kosong, komponen menampilkan
//   avatar inisial berwarna. Bila diisi, gunakan path lokal di
//   folder public/ (mis. '/dokumentasi/nama-orang.jpg').
// - `whatsapp` boleh dikosongkan: tombol "Hubungi via WhatsApp"
//   hanya muncul bila nomor diisi (format angka internasional
//   tanpa tanda +, mis. '6281234567890').

export type Petugas = {
  id: string
  nama: string
  kelas: string
  jabatan: string
  tugas: string
  whatsapp?: string
  foto?: string
}

export type IkonTim = 'daur-ulang' | 'taman' | 'air-energi' | 'kantin' | 'kompos'
export type WarnaTim = 'hijau' | 'daun' | 'air' | 'matahari' | 'tanah'

export type TimPetugas = {
  id: string
  nama: string
  ikon: IkonTim
  warna: WarnaTim
  deskripsi: string
  koordinator: Petugas
  anggota: Petugas[]
}

export type StrukturPetugas = {
  pengurusInti: Petugas[]
  tim: TimPetugas[]
}

export const STRUKTUR_PETUGAS_CONTOH: StrukturPetugas = {
  pengurusInti: [
    {
      id: 'pembina',
      nama: 'Ratna Wijaya, S.Pd',
      kelas: 'Guru Pembina',
      jabatan: 'Pembina',
      tugas: 'Membina dan mengarahkan seluruh kegiatan Adiwiyata sekolah.',
      whatsapp: '6281234567890',
    },
    {
      id: 'ketua',
      nama: 'Aisyah Putri',
      kelas: 'XII IPA 1',
      jabatan: 'Ketua',
      tugas: 'Memimpin rapat kader dan mengoordinasikan seluruh tim.',
    },
    {
      id: 'wakil-ketua',
      nama: 'Budi Santoso',
      kelas: 'XI IPS 2',
      jabatan: 'Wakil Ketua',
      tugas: 'Membantu ketua dan menggantikan bila berhalangan.',
    },
    {
      id: 'sekretaris',
      nama: 'Citra Lestari',
      kelas: 'X-3',
      jabatan: 'Sekretaris',
      tugas: 'Mencatat notulen, menyusun surat, dan mengelola arsip kegiatan.',
    },
    {
      id: 'bendahara',
      nama: 'Dimas Pratama',
      kelas: 'XI IPA 3',
      jabatan: 'Bendahara',
      tugas: 'Mengelola kas kader dan mencatat pemasukan bank sampah.',
    },
  ],
  tim: [
    {
      id: 'bank-sampah',
      nama: 'Bank Sampah dan Daur Ulang',
      ikon: 'daur-ulang',
      warna: 'hijau',
      deskripsi: 'Mengumpulkan, menimbang, dan mendaur ulang sampah sekolah.',
      koordinator: {
        id: 'eko-bank-sampah',
        nama: 'Eka Saputra',
        kelas: 'XII IPA 2',
        jabatan: 'Koordinator',
        tugas: 'Mengatur jadwal penimbangan sampah dan pencatatan tabungan.',
        whatsapp: '6281234567891',
      },
      anggota: [
        {
          id: 'fitri-bank-sampah',
          nama: 'Fitri Handayani',
          kelas: 'X-1',
          jabatan: 'Anggota',
          tugas: 'Memilah botol plastik dan kertas untuk didaur ulang.',
        },
      ],
    },
    {
      id: 'taman',
      nama: 'Taman dan Penghijauan',
      ikon: 'taman',
      warna: 'daun',
      deskripsi: 'Merawat taman dan menghijaukan sudut-sudut sekolah.',
      koordinator: {
        id: 'gilang-taman',
        nama: 'Gilang Ramadhan',
        kelas: 'XI IPA 1',
        jabatan: 'Koordinator',
        tugas: 'Merawat taman sekolah dan mengatur jadwal penyiraman tanaman.',
      },
      anggota: [
        {
          id: 'hana-taman',
          nama: 'Hana Marlina',
          kelas: 'X-2',
          jabatan: 'Anggota',
          tugas: 'Menanam dan merawat tanaman hias di taman.',
        },
      ],
    },
    {
      id: 'air-energi',
      nama: 'Air dan Energi',
      ikon: 'air-energi',
      warna: 'air',
      deskripsi: 'Menjaga hemat air dan hemat listrik di sekolah.',
      koordinator: {
        id: 'irfan-air-energi',
        nama: 'Irfan Maulana',
        kelas: 'XII IPS 1',
        jabatan: 'Koordinator',
        tugas: 'Memantau penggunaan air dan listrik sekolah.',
      },
      anggota: [
        {
          id: 'jasmine-air-energi',
          nama: 'Jasmine Nur',
          kelas: 'XI IPS 3',
          jabatan: 'Anggota',
          tugas: 'Mengingatkan hemat air dan mematikan lampu yang tidak dipakai.',
        },
      ],
    },
    {
      id: 'kantin',
      nama: 'Kantin Sehat',
      ikon: 'kantin',
      warna: 'matahari',
      deskripsi: 'Kantin sehat, bebas plastik sekali pakai.',
      koordinator: {
        id: 'kania-kantin',
        nama: 'Kania Dewi',
        kelas: 'XII IPA 3',
        jabatan: 'Koordinator',
        tugas: 'Memastikan kantin menjual makanan sehat dan bebas plastik sekali pakai.',
      },
      anggota: [
        {
          id: 'lukman-kantin',
          nama: 'Lukman Hakim',
          kelas: 'X-4',
          jabatan: 'Anggota',
          tugas: 'Mengajak teman membawa tumbler dan tempat makan sendiri.',
        },
      ],
    },
    {
      id: 'kompos',
      nama: 'Kompos dan Biopori',
      ikon: 'kompos',
      warna: 'tanah',
      deskripsi: 'Mengolah sampah organik menjadi kompos.',
      koordinator: {
        id: 'maya-kompos',
        nama: 'Maya Kusuma',
        kelas: 'XI IPA 2',
        jabatan: 'Koordinator',
        tugas: 'Mengelola kompos dari sampah organik kantin dan taman.',
      },
      anggota: [
        {
          id: 'nadia-kompos',
          nama: 'Nadia Safitri',
          kelas: 'X-5',
          jabatan: 'Anggota',
          tugas: 'Merawat lubang biopori dan mengolah daun kering menjadi kompos.',
        },
      ],
    },
  ],
}
