// Struktur Petugas Adiwiyata — sumber: SK Kepala SMA Negeri 55 Jakarta
// Nomor 027 Tahun 2026 tentang Tim Kader Adiwiyata, Lampiran I
// (DAFTAR KADER ADIWIYATA SMA NEGERI 55 JAKARTA).
//
// PENTING: modul ini HANYA dibolehkan dibaca komponen server. Data
// diteruskan ke komponen klien hanya bila pengguna sudah login — lihat
// app/adiwiyata/[section]/page.tsx. Jangan impor NILAI dari modul ini
// di komponen klien (hanya `import type` yang aman), supaya nama-nama
// pengurus tidak masuk ke bundle atau HTML publik.
//
// Untuk mengubah data petugas, ubah objek STRUKTUR_PETUGAS di bawah
// ini. Tidak perlu menyentuh kode tampilan di
// components/adiwiyata/struktur-pohon.tsx. Jangan cantumkan data
// pribadi sensitif: hanya nama, kelas, jabatan, dan tugas.
// `foto` boleh dikosongkan: bila kosong, komponen menampilkan avatar
// inisial berwarna. Bila diisi, gunakan path lokal di folder public/
// (mis. '/dokumentasi/nama-orang.jpg').

export type Petugas = {
  id: string
  nama: string
  kelas: string
  jabatan: string
  tugas: string
  foto?: string
}

export type IkonTim =
  | 'daur-ulang'
  | 'taman'
  | 'air-energi'
  | 'kantin'
  | 'kompos'
  | 'pohon'
  | 'bunga'
  | 'tunas'
  | 'matahari'
  | 'petir'
  | 'daun'
  | 'grafik'
  | 'pesan'
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

export const STRUKTUR_PETUGAS: StrukturPetugas = {
  pengurusInti: [
    {
      id: 'pengarah',
      nama: 'Wahyu Kresnadi, S.Pd., MM',
      kelas: 'Kepala Sekolah',
      jabatan: 'Pengarah',
      tugas: 'Mengarahkan dan membina seluruh gerakan Adiwiyata sekolah.',
    },
    {
      id: 'pj-tu',
      nama: 'Misa Mahfud',
      kelas: 'Kepala Bagian TU',
      jabatan: 'Penanggung jawab',
      tugas: 'Mengelola administrasi dan tata usaha program Adiwiyata.',
    },
    {
      id: 'pj-akademik',
      nama: 'Sri Petnowanti, M.Pd',
      kelas: 'Wakasek Bidang Akademik',
      jabatan: 'Penanggung jawab',
      tugas: 'Mengintegrasikan pendidikan lingkungan ke dalam pembelajaran.',
    },
    {
      id: 'pj-kesiswaan',
      nama: 'Rochmad Supriyono, M.Pd',
      kelas: 'Wakasek Bidang Kesiswaan dan Humas',
      jabatan: 'Penanggung jawab',
      tugas: 'Membina kader siswa dan kegiatan kesiswaan lingkungan.',
    },
    {
      id: 'pj-sarpras',
      nama: 'Elvira Nurwahyuni, M.Pd',
      kelas: 'Wakasek Bidang Sarana dan Prasarana',
      jabatan: 'Penanggung jawab',
      tugas: 'Menyediakan sarana dan prasarana pendukung program Adiwiyata.',
    },
    {
      id: 'ketua',
      nama: 'Lisa Febrianti, S.Pd',
      kelas: 'Guru',
      jabatan: 'Ketua',
      tugas: 'Memimpin Tim Kader Adiwiyata dan mengoordinasikan seluruh seksi kader.',
    },
    {
      id: 'wakil-ketua',
      nama: 'Inne Sintiya Rahmah, S.Pd',
      kelas: 'Guru',
      jabatan: 'Wakil Ketua',
      tugas: 'Membantu ketua dan menggantikan bila berhalangan.',
    },
  ],
  tim: [
    {
      id: 'pilah',
      nama: 'Kader Pilah',
      ikon: 'daur-ulang',
      warna: 'hijau',
      deskripsi: 'Memilah sampah berdasarkan jenisnya di setiap kelas.',
      koordinator: {
        id: 'koordinator-pilah',
        nama: 'Shofwan Iskandar, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Pilah.',
      },
      anggota: [],
    },
    {
      id: 'olah-organik',
      nama: 'Kader Olah Organik',
      ikon: 'kompos',
      warna: 'daun',
      deskripsi: 'Mengolah sampah organik menjadi kompos dan pupuk.',
      koordinator: {
        id: 'koordinator-olah-organik',
        nama: 'Abdul Latif, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Olah Organik.',
      },
      anggota: [],
    },
    {
      id: 'maggot',
      nama: 'Kader Maggot',
      ikon: 'kompos',
      warna: 'air',
      deskripsi: 'Membudidayakan maggot untuk mengurai sampah organik.',
      koordinator: {
        id: 'koordinator-maggot',
        nama: 'Yanuar Agung Budhi P., S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Maggot.',
      },
      anggota: [],
    },
    {
      id: 'bank-sampah',
      nama: 'Kader Bank Sampah dan Daur Ulang',
      ikon: 'daur-ulang',
      warna: 'matahari',
      deskripsi: 'Menimbang, mencatat, dan mendaur ulang sampah sekolah.',
      koordinator: {
        id: 'koordinator-bank-sampah',
        nama: 'Dwi Susianti, M.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Bank Sampah dan Daur Ulang.',
      },
      anggota: [],
    },
    {
      id: 'lingkungan-sehat',
      nama: 'Kader Lingkungan Sehat',
      ikon: 'tunas',
      warna: 'tanah',
      deskripsi: 'Menjaga kebersihan dan kesehatan lingkungan sekolah.',
      koordinator: {
        id: 'koordinator-lingkungan-sehat',
        nama: 'Parman Abdullah, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Lingkungan Sehat.',
      },
      anggota: [],
    },
    {
      id: 'hijau-biodiversitas',
      nama: 'Kader Hijau dan Biodiversitas',
      ikon: 'pohon',
      warna: 'hijau',
      deskripsi: 'Merawat tanaman dan keanekaragaman hayati sekolah.',
      koordinator: {
        id: 'koordinator-hijau-biodiversitas',
        nama: 'Melynda J. Br Meliala, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Hijau dan Biodiversitas.',
      },
      anggota: [],
    },
    {
      id: 'energi-lestari',
      nama: 'Kader Energi Lestari',
      ikon: 'petir',
      warna: 'daun',
      deskripsi: 'Menghemat dan mengelola energi di sekolah.',
      koordinator: {
        id: 'koordinator-energi-lestari',
        nama: 'Candra Dwi Irawan, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Energi Lestari.',
      },
      anggota: [],
    },
    {
      id: 'air-lestari',
      nama: 'Kader Air Lestari',
      ikon: 'air-energi',
      warna: 'air',
      deskripsi: 'Menjaga hemat air dan kualitas air sekolah.',
      koordinator: {
        id: 'koordinator-air-lestari',
        nama: 'Ruruh Sujatmiko, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Air Lestari.',
      },
      anggota: [],
    },
    {
      id: 'edu-lingkungan',
      nama: 'Kader Edu-Lingkungan',
      ikon: 'bunga',
      warna: 'matahari',
      deskripsi: 'Mengedukasi warga sekolah tentang lingkungan hidup.',
      koordinator: {
        id: 'koordinator-edu-lingkungan',
        nama: 'Rusdy Saleh, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Edu-Lingkungan.',
      },
      anggota: [],
    },
    {
      id: 'budaya-lingkungan',
      nama: 'Kader Budaya Lingkungan',
      ikon: 'daun',
      warna: 'tanah',
      deskripsi: 'Membangun budaya peduli lingkungan di sekolah.',
      koordinator: {
        id: 'koordinator-budaya-lingkungan',
        nama: 'Ermelia Purba, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Budaya Lingkungan.',
      },
      anggota: [],
    },
    {
      id: 'inovasi-hijau',
      nama: 'Kader Inovasi Hijau',
      ikon: 'matahari',
      warna: 'hijau',
      deskripsi: 'Menciptakan inovasi ramah lingkungan untuk sekolah.',
      koordinator: {
        id: 'koordinator-inovasi-hijau',
        nama: 'Reisti Hudatul Khairiyah, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Inovasi Hijau.',
      },
      anggota: [],
    },
    {
      id: 'kantin-hijau',
      nama: 'Kader Kantin Hijau',
      ikon: 'kantin',
      warna: 'daun',
      deskripsi: 'Kantin sehat, bersih, dan bebas plastik sekali pakai.',
      koordinator: {
        id: 'koordinator-kantin-hijau',
        nama: 'Susanto, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Kantin Hijau.',
      },
      anggota: [],
    },
    {
      id: 'data-hijau',
      nama: 'Kader Data Hijau',
      ikon: 'grafik',
      warna: 'air',
      deskripsi: 'Mencatat dan merekap data kegiatan lingkungan sekolah.',
      koordinator: {
        id: 'koordinator-data-hijau',
        nama: 'Melati Yundiana, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Data Hijau.',
      },
      anggota: [],
    },
    {
      id: 'eco-communication',
      nama: 'Kader Eco-Communication',
      ikon: 'pesan',
      warna: 'matahari',
      deskripsi: 'Menyebarluaskan kabar dan ajakan peduli lingkungan.',
      koordinator: {
        id: 'koordinator-eco-communication',
        nama: 'Buske Adam, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Eco-Communication.',
      },
      anggota: [],
    },
    {
      id: 'jejaring-hijau',
      nama: 'Kader Jejaring Hijau',
      ikon: 'pohon',
      warna: 'tanah',
      deskripsi: 'Menjalin kerja sama dengan pihak luar untuk lingkungan.',
      koordinator: {
        id: 'koordinator-jejaring-hijau',
        nama: 'Mila Kurniawati, S.Pd',
        kelas: 'Guru',
        jabatan: 'Koordinator',
        tugas: 'Mengkoordinasikan Kader Jejaring Hijau.',
      },
      anggota: [],
    },
  ],
}
