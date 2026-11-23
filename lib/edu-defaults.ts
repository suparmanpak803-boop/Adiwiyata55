// Konten edukasi default portal (4 section).
// PERINGATAN: isi teks di bawah ini adalah rekonstruksi — tidak ada
// salinan teks aslinya yang tersisa di repo (lihat PERBAIKAN.md).
// Bentuk/strukturnya persis mengikuti pemakaian di
// components/adiwiyata/portal.tsx (SectionContent). KADER_LIST berisi
// 15 kader resmi sekolah (SK Kepala SMA Negeri 55 Jakarta Nomor 027
// Tahun 2026 + spreadsheet uraian tugas) — sama dengan daftar di
// halaman Kader Adiwiyata (lib/adiwiyata-site-content.ts).
// KADER_REPORT_TASKS (lib/kader-report-tasks.ts) adalah daftar terpisah
// untuk formulir Laporan Kinerja Kader dan masih memakai 14 nama lama;
// perbarui daftar itu saat Google Form laporan dihubungkan.
export const KADER_LIST: string[] = [
  'Kader Pilah',
  'Kader Olah Organik',
  'Kader Maggot',
  'Kader Bank Sampah dan Daur Ulang',
  'Kader Lingkungan Sehat',
  'Kader Hijau dan Biodiversitas',
  'Kader Energi Lestari',
  'Kader Air Lestari',
  'Kader Edu-Lingkungan',
  'Kader Budaya Lingkungan',
  'Kader Inovasi Hijau',
  'Kader Kantin Hijau',
  'Kader Data Hijau',
  'Kader Eco-Communication',
  'Kader Jejaring Hijau',
]

export const EDU_DEFAULTS = {
  sections: [
    {
      id: 'pengenalan',
      title: 'Pengenalan Adiwiyata',
      icon: 'sprout',
      paragraphs: [
        'Adiwiyata adalah program sekolah yang peduli dan berbudaya lingkungan. Di SMAN 55 Jakarta, program ini mengajak seluruh warga sekolah untuk menjaga kebersihan, memilah sampah, dan merawat lingkungan sekolah setiap hari.',
        'Program ini bukan sekadar lomba kebersihan, melainkan kebiasaan: membuang sampah pada tempatnya, membawa tumbler dan wadah makan guna ulang, serta mengolah sampah menjadi sesuatu yang bermanfaat.',
      ],
      goals: [
        'Membentuk warga sekolah yang peduli dan berbudaya lingkungan.',
        'Menerapkan pemilahan sampah organik, anorganik, kertas, residu, dan B3.',
        'Mengurangi sampah sekali pakai melalui gerakan zero waste.',
        'Menjadikan sekolah sebagai tempat belajar yang bersih, hijau, dan sehat.',
      ],
    },
    {
      id: 'pilar',
      title: 'Pilar Adiwiyata',
      icon: 'landmark',
      introduction:
        'Gerakan Adiwiyata SMAN 55 Jakarta berdiri di atas empat pilar yang saling menguatkan: kebijakan sekolah, kurikulum, kegiatan partisipatif, dan pengelolaan sarana.',
      pillars: [
        { title: 'Kebijakan Berwawasan Lingkungan', text: 'Sekolah menetapkan aturan dan program yang mendukung budaya peduli lingkungan.' },
        { title: 'Kurikulum Berbasis Lingkungan', text: 'Materi lingkungan terintegrasi dalam pembelajaran di kelas.' },
        { title: 'Kegiatan Partisipatif', text: 'Siswa, guru, dan warga sekolah terlibat langsung dalam aksi lingkungan.' },
        { title: 'Pengelolaan Sarana Ramah Lingkungan', text: 'Fasilitas sekolah dikelola hemat energi, hemat air, dan minim sampah.' },
      ],
    },
    {
      id: 'gerakan',
      title: 'Gerakan Kader Lingkungan',
      icon: 'handshake',
      introduction:
        'Kader lingkungan adalah siswa yang menjadi motor gerakan di kelas dan di sekolah. Mereka mencatat setoran sampah, mengingatkan teman, dan memimpin aksi harian.',
    },
    {
      id: 'aksi',
      title: 'Jaga & Olah Sampah Sekolah',
      icon: 'recycle',
      joss: 'JOSS (Jaga & Olah Sampah Sekolah) adalah kebiasaan harian warga SMAN 55 Jakarta: pilah sampahmu, catat setoranmu, dan olah yang masih bisa dimanfaatkan.',
      impact: [
        { value: '24', unit: 'kelas', description: 'Kelas X, XI, dan XII yang aktif memilah sampah setiap hari.' },
        { value: '15', unit: 'kader', description: 'Kader siswa yang menjalankan tugas lingkungan.' },
        { value: '5', unit: 'jenis sampah', description: 'Organik, anorganik, kertas, residu, dan B3 dipilah terpisah.' },
      ],
      dailyRule:
        'Bawa tumbler dan wadah makan guna ulang setiap hari, pilah sampah sebelum dibuang, dan laporkan bila menemukan tumpukan sampah di lingkungan sekolah.',
    },
  ],
} as const
