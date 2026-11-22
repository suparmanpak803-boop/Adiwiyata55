// Struktur Tim Kader Adiwiyata — sumber: SK Kepala SMA Negeri 55 Jakarta
// Nomor 027 Tahun 2026 tentang Tim Kader Adiwiyata, Lampiran I
// (DAFTAR KADER ADIWIYATA SMA NEGERI 55 JAKARTA, 581 nama).
//
// PENTING: modul ini HANYA dibaca komponen server. Data diteruskan ke
// komponen klien hanya bila pengguna sudah login — lihat
// app/adiwiyata/[section]/page.tsx. Jangan impor modul ini dari komponen
// klien, supaya nama-nama pengurus tidak masuk ke bundle publik.
//
// Catatan: SK memuat 15 seksi kader — satu lebih banyak dari 14 kader di
// halaman situs, karena SK juga mencantumkan "Edu-Lingkungan" (Rudy Saleh)
// yang tidak ada di daftar uraian tugas.

export type StrukturKader = {
  pengurus: { jabatan: string; nama: string; keterangan: string }[]
  koordinator: { kader: string; nama: string }[]
}

export const STRUKTUR_KADER: StrukturKader = {
  pengurus: [
    { jabatan: 'Pengarah', nama: 'Wahyu Kresnadi, S.Pd, MM', keterangan: 'Kepala Sekolah' },
    { jabatan: 'Penanggung jawab', nama: 'Misa Mahfud', keterangan: 'Kepala Bagian TU' },
    { jabatan: 'Penanggung jawab', nama: 'Sri Petnowanti, M.Pd', keterangan: 'Wakasek Bidang Akademik' },
    { jabatan: 'Penanggung jawab', nama: 'Rochmad Supriyono, M.Pd', keterangan: 'Wakasek Bidang Kesiswaan dan Humas' },
    { jabatan: 'Penanggung jawab', nama: 'Elvira Nurwahyuni, M.Pd', keterangan: 'Wakasek Bidang Sarana dan Prasarana' },
    { jabatan: 'Ketua', nama: 'Lisa Febrianti, S.Pd', keterangan: 'Guru' },
    { jabatan: 'Wakil Ketua', nama: 'Inne Sintiya Rahmah, S.Pd', keterangan: 'Guru' },
  ],
  koordinator: [
    { kader: 'Pilah', nama: 'Shofwan Iskandar, S.Pd' },
    { kader: 'Olah Organik', nama: 'Abdul Latif, S.Pd' },
    { kader: 'Maggot', nama: 'Yanuar Agung Budhi P., S.Pd' },
    { kader: 'Bank Sampah dan Daur Ulang', nama: 'Dwi Susianti, M.Pd' },
    { kader: 'Lingkungan Sehat', nama: 'Parman Abdullah, S.Pd' },
    { kader: 'Hijau dan Biodiversitas', nama: 'Melynda J. Br Meliala, S.Pd' },
    { kader: 'Energi Lestari', nama: 'Candra Dwi Irawan, M.Pd' },
    { kader: 'Air Lestari', nama: 'Ruruh Sujatmiko, S.Pd' },
    { kader: 'Edu-Lingkungan', nama: 'Rudy Saleh, S.Pd' },
    { kader: 'Budaya Lingkungan', nama: 'Ermelia Purba, S.Pd' },
    { kader: 'Inovasi Hijau', nama: 'Reisti Hudatul Khairiyah, S.Pd' },
    { kader: 'Kantin Hijau', nama: 'Susanto, S.Pd' },
    { kader: 'Data Hijau', nama: 'Melati Yundiana, S.Pd' },
    { kader: 'Eco-Communication', nama: 'Buske Adam, S.Pd' },
    { kader: 'Jejaring Hijau', nama: 'Mila Kurniawati, S.Pd' },
  ],
}
