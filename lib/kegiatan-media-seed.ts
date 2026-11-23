// Media kegiatan Adiwiyata (seed). Menambahkan 6 slide beranda dan
// 8 dokumen & arsip dari foto-foto kegiatan yang sudah dikirim user
// (disimpan di public/dokumentasi/, jadi URL-nya path publik biasa —
// bukan bytea slider dan bukan Vercel Blob).
//
// Idempotent: slide dicek dulu berdasarkan image_url; dokumen memakai
// ON CONFLICT (blob_pathname) karena kolom itu UNIQUE. Menjalankan
// seed dua kali tidak menggandakan apa pun dan tidak menimpa data
// yang sudah ada (termasuk slide/dokumen yang dibuat admin sendiri).
import { pool } from '@/lib/db'
import { ensureSliderSchema } from '@/lib/slider/data'

type SlideSeed = {
  file: string
  alt: string
  judul: string
  deskripsi: string
}

type DokumenSeed = {
  file: string
  title: string
  description: string
}

const SLIDES: SlideSeed[] = [
  {
    file: 'kerja-bakti.jpg',
    alt: 'Kegiatan kerja bakti di SMAN 55 Jakarta',
    judul: 'Kerja Bakti',
    deskripsi:
      'Dua minggu sekali: pemeliharaan taman kelas dan bersih-bersih lingkungan sekolah oleh kepala sekolah, guru, caraka, siswa, dan petugas keamanan.',
  },
  {
    file: 'botol-plastik-media-tanam.jpg',
    alt: 'Botol plastik bekas dipakai sebagai media tanam',
    judul: 'Botol Plastik Bekas jadi Media Tanam',
    deskripsi: 'Botol plastik bekas dimanfaatkan sebagai media tanam, dari proses penanaman sampai hasilnya.',
  },
  {
    file: 'membersihkan-depan-masjid.jpg',
    alt: 'Membersihkan depan masjid sekolah',
    judul: 'Membersihkan Depan Masjid',
    deskripsi:
      'Rutin setiap hari oleh petugas kebersihan, dan setiap dua minggu sekali oleh siswa saat Pra KBM Kerja Bakti.',
  },
  {
    file: 'sehari-tanpa-asap-kendaraan.jpg',
    alt: 'Sehari Tanpa Asap Kendaraan di SMAN 55 Jakarta',
    judul: 'Sehari Tanpa Asap Kendaraan',
    deskripsi:
      'Kamis, 10 Oktober 2024: peserta didik dan pendamping menjaga 3 titik: 2 pertigaan dan parkiran.',
  },
  {
    file: 'penghargaan-kelas-terbersih.jpg',
    alt: 'Penghargaan kelas terbersih dan taman terbaik',
    judul: 'Penghargaan Kelas Terbersih & Taman Terbaik',
    deskripsi:
      'Penilaian kelas terbersih 23 Februari dan 31 Mei 2024; penilaian taman 24 September 2024. Peserta seluruh kelas 10 dan 11.',
  },
  {
    file: 'pemilahan-sampah.jpg',
    alt: 'Pemilahan sampah di SMAN 55 Jakarta',
    judul: 'Pemilahan Sampah',
    deskripsi:
      '13 Februari 2024: sampah yang telah dikolektif oleh masing-masing kelas dipilah kembali sebelum akhirnya dibuang atau dijual. Pihak yang terlibat: siswa, guru, dan PPSU.',
  },
]

const DOKUMEN: (DokumenSeed & { fileSize: number })[] = [
  {
    file: 'rapat-koordinasi-1.jpg',
    title: 'Rapat Koordinasi Program Adiwiyata',
    description: 'Peserta rapat mencatat hasil pembahasan program Adiwiyata SMAN 55 Jakarta.',
    fileSize: 135023,
  },
  {
    file: 'rapat-koordinasi-2.jpg',
    title: 'Rapat Koordinasi: Suasana Ruang Rapat',
    description: 'Suasana ruang rapat koordinasi guru dan warga sekolah.',
    fileSize: 91801,
  },
  {
    file: 'hemat-energi-saklar.jpg',
    title: 'Kegiatan Mematikan dan Mencabut Saklar',
    description:
      'Pengecekan berkala saklar lampu dilakukan saat waktu pulang sekolah setiap harinya oleh tiap anggota Kader Konservasi Energi sesuai piket yang terjadwal.',
    fileSize: 136557,
  },
  {
    file: 'kolam-ikan.jpg',
    title: 'Kegiatan Pemeliharaan Kolam Ikan SMAN 55 Jakarta',
    description: 'Pemeliharaan kolam ikan oleh kepala sekolah, wakil kepala sekolah, kepala TU, komite, dan siswa.',
    fileSize: 247005,
  },
  {
    file: 'kompos-padat.jpg',
    title: 'Pembuatan Kompos Padat',
    description: 'Siswa membuat kompos padat dari sampah organik.',
    fileSize: 146333,
  },
  {
    file: 'kompos-cair.jpg',
    title: 'Pembuatan Kompos Cair',
    description: 'Dokumentasi pembuatan kompos cair SMA Negeri 55 Jakarta.',
    fileSize: 206780,
  },
  {
    file: 'perawatan-peralatan-listrik.jpg',
    title: 'Perawatan Peralatan Listrik',
    description:
      'Kegiatan perawatan peralatan listrik selalu dilakukan oleh anggota Kader Konservasi Energi setiap harinya: mematikan kipas saat tidak dipakai, mematikan PC dan MCB, beserta mengecek peralatan listrik apakah masih bagus atau sudah rusak.',
    fileSize: 167530,
  },
  {
    file: 'rapat-koordinasi-3.jpg',
    title: 'Rapat Koordinasi: Guru dan Warga Sekolah',
    description: 'Guru dan warga sekolah mengikuti rapat koordinasi program Adiwiyata.',
    fileSize: 113656,
  },
]

export async function seedKegiatanMedia(adminId: string): Promise<{ slidesDitambah: number; dokumenDitambah: number }> {
  await ensureSliderSchema()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.adiwiyata_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      category text NOT NULL DEFAULT 'Umum',
      blob_url text NOT NULL,
      blob_pathname text NOT NULL UNIQUE,
      content_type text NOT NULL,
      file_size bigint NOT NULL,
      uploaded_by uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)

  let slidesDitambah = 0
  for (const [index, slide] of SLIDES.entries()) {
    const exists = await pool.query('SELECT 1 FROM public.slider_slides WHERE image_url = $1 LIMIT 1', [
      `/dokumentasi/${slide.file}`,
    ])
    if (exists.rowCount) continue
    await pool.query(
      `INSERT INTO public.slider_slides (image_url, alt_text, judul, deskripsi, urutan, aktif, dibuat_oleh)
       VALUES ($1, $2, $3, $4, $5, true, $6)`,
      [`/dokumentasi/${slide.file}`, slide.alt, slide.judul, slide.deskripsi, index + 1, adminId],
    )
    slidesDitambah += 1
  }

  let dokumenDitambah = 0
  for (const dokumen of DOKUMEN) {
    const result = await pool.query(
      `INSERT INTO public.adiwiyata_documents (title, description, category, blob_url, blob_pathname, content_type, file_size, uploaded_by)
       VALUES ($1, $2, 'Dokumentasi Kegiatan', $3, $4, 'image/jpeg', $5, $6)
       ON CONFLICT (blob_pathname) DO NOTHING`,
      [
        dokumen.title,
        dokumen.description,
        `/dokumentasi/${dokumen.file}`,
        dokumen.file,
        dokumen.fileSize,
        adminId,
      ],
    )
    dokumenDitambah += result.rowCount ?? 0
  }

  return { slidesDitambah, dokumenDitambah }
}
