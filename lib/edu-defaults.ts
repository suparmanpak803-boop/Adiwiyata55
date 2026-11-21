// Konten edukasi default portal (4 section).
// PERINGATAN: isi teks di bawah ini adalah rekonstruksi — tidak ada
// salinan teks aslinya yang tersisa di repo (lihat PERBAIKAN.md).
// Bentuk/strukturnya persis mengikuti pemakaian di
// components/adiwiyata/portal.tsx (SectionContent). KADER_LIST harus
// berisi 14 nama yang sama dengan KADER_REPORT_TASKS; ganti dengan
// daftar resmi sekolah bila sudah ada.
export const KADER_LIST: string[] = [
  'Kader Kebersihan',
  'Kader Penghijauan',
  'Kader Bank Sampah',
  'Kader Kompos',
  'Kader Daur Ulang',
  'Kader Hemat Energi',
  'Kader Hemat Air',
  'Kader Kantin Sehat',
  'Kader Taman Sekolah',
  'Kader Drainase',
  'Kader Edukasi Lingkungan',
  'Kader Dokumentasi',
  'Kader Kebun Sekolah',
  'Kader Zero Waste',
]

export const EDU_DEFAULTS = {
  sections: [
    {
      id: 'pengenalan',
      title: 'Pengenalan Adiwiyata',
      icon: '🌱',
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
      icon: '🏛️',
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
      icon: '🤝',
      introduction:
        'Kader lingkungan adalah siswa yang menjadi motor gerakan di kelas dan di sekolah. Mereka mencatat setoran sampah, mengingatkan teman, dan memimpin aksi harian.',
    },
    {
      id: 'aksi',
      title: 'Jaga & Olah Sampah Sekolah',
      icon: '♻️',
      joss: 'JOSS — Jaga & Olah Sampah Sekolah — adalah kebiasaan harian warga SMAN 55 Jakarta: pilah sampahmu, catat setoranmu, dan olah yang masih bisa dimanfaatkan.',
      impact: [
        { value: '24', unit: 'kelas', description: 'Kelas X, XI, dan XII yang aktif memilah sampah setiap hari.' },
        { value: '14', unit: 'kelompok kader', description: 'Kelompok kader siswa yang menjalankan tugas lingkungan.' },
        { value: '5', unit: 'jenis sampah', description: 'Organik, anorganik, kertas, residu, dan B3 dipilah terpisah.' },
      ],
      dailyRule:
        'Bawa tumbler dan wadah makan guna ulang setiap hari, pilah sampah sebelum dibuang, dan laporkan bila menemukan tumpukan sampah di lingkungan sekolah.',
    },
  ],
} as const
