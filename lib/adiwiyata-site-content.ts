// Konten situs Informasi Adiwiyata (halaman /adiwiyata/*).
// Modul ini client-safe: tanpa akses DB. Pembacaan dari DB ada di
// lib/adiwiyata-site-content.server.ts (key app_settings
// 'adiwiyata_site_content').
//
// PERINGATAN: string default di bawah ini adalah rekonstruksi —
// tidak ada salinan teks aslinya yang tersisa di repo (lihat
// PERBAIKAN.md). Satu-satunya petunjuk yang tersisa: ada aktivitas
// default yang judulnya mengandung "Drainase". Admin dapat mengubah
// semua teks ini lewat panel "Atur Informasi Adiwiyata" tanpa
// menyentuh kode.
export type AdiwiyataSiteContent = {
  home: {
    eyebrow: string
    title: string
    emphasis: string
    description: string
    primaryAction: string
    secondaryAction: string
    caption: string
    visualLabel: string
    visualTitle: string
    visualSchool: string
    activitiesEyebrow: string
    activitiesTitle: string
    activitiesLink: string
    profileEyebrow: string
    profileTitle: string
    profileDescription: string
    footerText: string
  }
  pages: {
    profil: {
      title: string
      intro: string
      historyEyebrow: string
      historyTitle: string
      historyBody: string
      programsEyebrow: string
      programsTitle: string
      programsBody: string
      noteTitle: string
      noteBody: string
    }
    program: { title: string; intro: string }
    dokumentasi: { title: string; intro: string }
    publikasi: { title: string; intro: string }
    dokumen: { title: string; intro: string; noteTitle: string; noteBody: string }
  }
  activities: { title: string; category: string; date: string; description: string; images?: string[] }[]
  divisions: { name: string; focus: string; duties: string }[]
  articles: { title: string; category: string; date: string; description: string; source: string }[]
}

export const DEFAULT_ADIWIYATA_SITE_CONTENT: AdiwiyataSiteContent = {
  home: {
    eyebrow: 'PROGRAM ADIWIYATA',
    title: 'Sekolah Peduli',
    emphasis: 'dan Berbudaya Lingkungan',
    description:
      'SMAN 55 Jakarta mengajak seluruh warga sekolah memilah sampah, menghemat energi, dan merawat lingkungan — setiap hari, bukan hanya saat lomba.',
    primaryAction: 'Lihat program & kegiatan',
    secondaryAction: 'Unduh dokumen',
    caption: 'Aksi nyata, tercatat bersama.',
    visualLabel: 'GERAKAN SEKOLAH',
    visualTitle: 'Adiwiyata 55',
    visualSchool: 'SMAN 55 Jakarta',
    activitiesEyebrow: 'KEGIATAN TERKINI',
    activitiesTitle: 'Aksi nyata warga sekolah',
    activitiesLink: 'Lihat semua kegiatan',
    profileEyebrow: 'TENTANG KAMI',
    profileTitle: 'Sekolah yang belajar dari alam',
    profileDescription:
      'Adiwiyata SMAN 55 Jakarta adalah gerakan warga sekolah untuk hidup bersih, memilah sampah, dan menjaga lingkungan sekolah tetap hijau.',
    footerText: 'Adiwiyata SMAN 55 Jakarta — Sekolah Peduli dan Berbudaya Lingkungan.',
  },
  pages: {
    profil: {
      title: 'Profil',
      intro: 'Sejarah, praktik, dan komitmen SMAN 55 Jakarta sebagai sekolah Adiwiyata.',
      historyEyebrow: 'SEJARAH',
      historyTitle: 'Perjalanan Adiwiyata 55',
      historyBody:
        'Gerakan Adiwiyata di SMAN 55 Jakarta dimulai dari kebiasaan sederhana: memilah sampah di kelas, membawa tumbler, dan merawat taman sekolah. Dari kebiasaan itu tumbuh program yang melibatkan seluruh warga sekolah.',
      programsEyebrow: 'PRAKTIK SEKOLAH',
      programsTitle: 'Yang kami lakukan setiap hari',
      programsBody:
        'Setiap kelas memilah sampah dan mencatat setoran hariannya. Kader lingkungan memantau kebersihan, drainase, dan taman. Hasilnya dipantau lewat dashboard dan diapresiasi lewat leaderboard.',
      noteTitle: 'Catatan kelengkapan',
      noteBody: 'Dokumen pendukung program Adiwiyata tersedia di halaman Dokumen & Arsip.',
    },
    program: {
      title: 'Program & kegiatan',
      intro: 'Program dan kegiatan lingkungan yang dijalankan warga SMAN 55 Jakarta.',
    },
    dokumentasi: {
      title: 'Divisi kader',
      intro: 'Kelompok kader siswa yang menjalankan tugas lingkungan di sekolah.',
    },
    publikasi: {
      title: 'Artikel & berita',
      intro: 'Artikel dan kabar terbaru seputar gerakan Adiwiyata SMAN 55 Jakarta.',
    },
    dokumen: {
      title: 'Dokumen & arsip',
      intro: 'Arsip dokumen resmi program Adiwiyata SMAN 55 Jakarta.',
      noteTitle: 'Pemberitahuan',
      noteBody: 'Dokumen diunggah oleh Admin. Bila tautan tidak dapat dibuka, hubungi Admin Adiwiyata.',
    },
  },
  activities: [
    {
      title: 'Pembibitan TOGA',
      category: 'Penghijauan',
      date: 'Juli 2024 & Agustus 2025',
      description:
        'Pembibitan TOGA dalam dua tahap (Juli 2024 dan Agustus 2025) untuk memastikan bibit berkualitas. Kader TOGA (siswa dan guru) belajar langsung membenih dan merawat tanaman obat keluarga.',
      images: ['/dokumentasi/pembibitan-toga-1.jpg', '/dokumentasi/pembibitan-toga-2.jpg'],
    },
    {
      title: 'Pemeliharaan Hidroponik',
      category: 'Hidroponik',
      date: 'Juli 2024 – Januari 2025',
      description:
        'Piket harian kader guru dan siswa: membuat cairan nutrisi AB Mix, mengecek tanaman, serta memantau pH dan suhu air. Periode 1 (17 Juli 2024) dan periode 2 (23 Januari 2025).',
      images: ['/dokumentasi/pemeliharaan-hidroponik-1.jpg', '/dokumentasi/pemeliharaan-hidroponik-2.jpg'],
    },
    {
      title: 'Penanaman & Peremajaan TOGA',
      category: 'Penghijauan',
      date: 'September 2024',
      description:
        'Penanaman dari bibit hasil pembenihan dan benih Agrowisata, dilanjutkan peremajaan berkala: mengganti tanaman yang tidak produktif, memangkas, dan memupuk. Melibatkan siswa, guru, orang tua, kepala sekolah, dan Kasubag TU.',
      images: ['/dokumentasi/penanaman-peremajaan-toga-1.jpg', '/dokumentasi/penanaman-peremajaan-toga-2.jpg'],
    },
    {
      title: 'Membersihkan Lapangan',
      category: 'Kebersihan',
      date: '17 & 20 September 2024',
      description:
        'Kerja bakti warga sekolah dua minggu sekali dan petugas kebersihan setiap hari. Pembersihan detail juga dilakukan sebelum kegiatan kesiswaan yang dikoordinir OSIS.',
      images: ['/dokumentasi/membersihkan-lapangan-1.jpg', '/dokumentasi/membersihkan-lapangan-2.jpg'],
    },
    {
      title: 'Membersihkan Selasar',
      category: 'Kebersihan',
      date: '18 & 20 September 2024',
      description: 'Setiap hari oleh petugas caraka dan piket harian siswa sepulang sekolah.',
      images: ['/dokumentasi/membersihkan-selasar-1.jpg', '/dokumentasi/membersihkan-selasar-2.jpg'],
    },
    {
      title: 'Membersihkan Toilet',
      category: 'Kebersihan',
      date: 'Setiap hari & 13 Agustus 2024',
      description:
        'Rutin setiap hari oleh petugas kebersihan (caraka); peserta didik membantu saat kerja bakti dua mingguan. 9 peserta. Bentuk kesadaran bersama menjaga toilet tetap bersih.',
      images: ['/dokumentasi/membersihkan-toilet-1.jpg', '/dokumentasi/membersihkan-toilet-2.jpg'],
    },
    {
      title: 'Membersihkan Kelas',
      category: 'Kebersihan',
      date: 'Setiap hari & 2 minggu sekali',
      description:
        'Piket harian sepulang sekolah dan kerja bakti dua minggu sekali dengan pantauan guru/wali kelas. Setiap kelas: 7 siswa merawat taman, sisanya membersihkan kelas.',
      images: ['/dokumentasi/membersihkan-kelas-1.jpg', '/dokumentasi/membersihkan-kelas-2.jpg'],
    },
    {
      title: 'Pemeliharaan Lahan TOGA',
      category: 'Penghijauan',
      date: 'Rutin setiap hari',
      description:
        'Piket bergilir perwakilan siswa, orang tua, dan guru: menyiram tanaman, memangkas yang layu atau lebat, serta membersihkan lahan dari gulma dan sampah.',
      images: ['/dokumentasi/pemeliharaan-toga-1.jpg', '/dokumentasi/pemeliharaan-toga-2.jpg'],
    },
    {
      title: 'Sosialisasi Sekolah Bebas Plastik',
      category: 'Pengelolaan Sampah',
      date: '2024',
      description:
        'Sosialisasi ke peserta didik, orang tua, guru, pihak kantin, dan kepala sekolah: memahami pengelolaan sampah plastik dan beralih dari plastik sekali pakai ke wadah yang dapat digunakan kembali atau didaur ulang.',
      images: ['/dokumentasi/sekolah-bebas-plastik-1.jpg', '/dokumentasi/sekolah-bebas-plastik-2.jpg'],
    },
    {
      title: 'Kebersihan oleh Beberapa Unsur Warga',
      category: 'Kebersihan',
      date: '2024',
      description: 'Kegiatan kebersihan yang melibatkan berbagai unsur warga sekolah.',
      images: ['/dokumentasi/kebersihan-warga-1.jpg'],
    },
  ],
  divisions: [
    { name: 'Kader Kebersihan', focus: 'Kebersihan kelas dan lingkungan', duties: 'Membersihkan kelas, memantau tempat sampah, dan mengingatkan warga sekolah.' },
    { name: 'Kader Penghijauan', focus: 'Tanaman dan taman', duties: 'Menyiram dan merawat tanaman di taman sekolah.' },
    { name: 'Kader Bank Sampah', focus: 'Pemilahan dan penimbangan', duties: 'Menimbang sampah anorganik dan mencatat setoran bank sampah.' },
    { name: 'Kader Drainase', focus: 'Saluran air', duties: 'Membersihkan drainase dan melaporkan genangan air.' },
  ],
  articles: [
    {
      title: 'SMAN 55 Jakarta Terus Bergerak Menuju Sekolah Adiwiyata',
      category: 'Berita',
      date: 'November 2026',
      description: 'Warga sekolah menjalankan program pemilahan sampah, bank sampah, dan kebun sekolah secara rutin.',
      source: 'Tim Adiwiyata SMAN 55 Jakarta',
    },
  ],
}

const MAX_TEXT = 3000

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validText(value: unknown, { required = true }: { required?: boolean } = {}): value is string {
  if (typeof value !== 'string') return false
  if (value.length > MAX_TEXT) return false
  if (required && !value.trim()) return false
  return true
}

function parseStringFields(record: Record<string, unknown>, fields: string[]): Record<string, string> | null {
  const out: Record<string, string> = {}
  for (const field of fields) {
    if (!validText(record[field])) return null
    out[field] = record[field] as string
  }
  return out
}

function parseItemList<T extends Record<string, unknown>>(
  value: unknown,
  fields: string[],
  extra?: (item: Record<string, unknown>, parsed: Record<string, unknown>) => boolean,
): T[] | null {
  if (!Array.isArray(value) || value.length > 50) return null
  const out: T[] = []
  for (const item of value) {
    if (!isStringRecord(item)) return null
    const parsed = parseStringFields(item, fields)
    if (!parsed) return null
    if (extra && !extra(item, parsed)) return null
    out.push(parsed as T)
  }
  return out
}

// Daftar alamat foto lokal (mis. /dokumentasi/....jpg). Opsional per item;
// bila ada harus berupa array berisi alamat lokal.
function parseImageList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) return null
  for (const item of value) {
    if (typeof item !== 'string' || !item.startsWith('/') || item.length > 3000) return null
  }
  return value as string[]
}

// null bila input tidak valid (dipakai route PUT: 400).
export function parseAdiwiyataSiteContent(input: unknown): AdiwiyataSiteContent | null {
  if (!isStringRecord(input)) return null
  const home = isStringRecord(input.home)
    ? parseStringFields(input.home, [
        'eyebrow', 'title', 'emphasis', 'description', 'primaryAction', 'secondaryAction', 'caption',
        'visualLabel', 'visualTitle', 'visualSchool', 'activitiesEyebrow', 'activitiesTitle', 'activitiesLink',
        'profileEyebrow', 'profileTitle', 'profileDescription', 'footerText',
      ])
    : null
  if (!home) return null
  if (!isStringRecord(input.pages)) return null
  const pages = input.pages
  const profil = isStringRecord(pages.profil)
    ? parseStringFields(pages.profil, [
        'title', 'intro', 'historyEyebrow', 'historyTitle', 'historyBody',
        'programsEyebrow', 'programsTitle', 'programsBody', 'noteTitle', 'noteBody',
      ])
    : null
  const program = isStringRecord(pages.program) ? parseStringFields(pages.program, ['title', 'intro']) : null
  const dokumentasi = isStringRecord(pages.dokumentasi) ? parseStringFields(pages.dokumentasi, ['title', 'intro']) : null
  const publikasi = isStringRecord(pages.publikasi) ? parseStringFields(pages.publikasi, ['title', 'intro']) : null
  const dokumen = isStringRecord(pages.dokumen) ? parseStringFields(pages.dokumen, ['title', 'intro', 'noteTitle', 'noteBody']) : null
  if (!profil || !program || !dokumentasi || !publikasi || !dokumen) return null

  const activities = parseItemList(input.activities, ['title', 'category', 'date', 'description'], (item, parsed) => {
    if (item.images === undefined) return true
    const images = parseImageList(item.images)
    if (!images) return false
    parsed.images = images
    return true
  })
  const divisions = parseItemList(input.divisions, ['name', 'focus', 'duties'])
  const articles = parseItemList(input.articles, ['title', 'category', 'date', 'description', 'source'])
  if (!activities || !divisions || !articles) return null

  return {
    home: home as AdiwiyataSiteContent['home'],
    pages: {
      profil: profil as AdiwiyataSiteContent['pages']['profil'],
      program: program as AdiwiyataSiteContent['pages']['program'],
      dokumentasi: dokumentasi as AdiwiyataSiteContent['pages']['dokumentasi'],
      publikasi: publikasi as AdiwiyataSiteContent['pages']['publikasi'],
      dokumen: dokumen as AdiwiyataSiteContent['pages']['dokumen'],
    },
    activities: activities as AdiwiyataSiteContent['activities'],
    divisions: divisions as AdiwiyataSiteContent['divisions'],
    articles: articles as AdiwiyataSiteContent['articles'],
  }
}
