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
// Untuk mengubah data petugas, pakai editor admin di
// /admin/struktur (menyimpan ke tabel public.struktur_petugas).
// Objek STRUKTUR_PETUGAS di bawah ini adalah data DEFAULT yang
// dipakai bila tabel/baris belum ada atau datanya tidak valid.
// Jangan cantumkan data pribadi sensitif: hanya nama, kelas,
// jabatan, dan tugas. `foto` boleh dikosongkan: bila kosong,
// komponen menampilkan avatar inisial berwarna. Bila diisi,
// gunakan path lokal di folder public/ (mis.
// '/dokumentasi/nama-orang.jpg').

import { pool } from '@/lib/db'
import { IKON_TIM, WARNA_TIM } from '@/lib/struktur-petugas-label'

// Label Indonesia untuk dropdown editor admin ada di
// lib/struktur-petugas-label.ts (modul client-safe).

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

const BATAS = {
  pengurus: 30,
  tim: 30,
  anggota: 100,
  nama: 100,
  kelas: 100,
  jabatan: 100,
  tugas: 500,
  namaTim: 100,
  deskripsiTim: 300,
} as const

// Membuat tabel bila belum ada (idempotent). Dipanggil di awal
// pembacaan dan penyimpanan, seperti ensureSliderSchema().
export async function ensureStrukturSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.struktur_petugas (
      id text PRIMARY KEY DEFAULT 'utama',
      data jsonb NOT NULL,
      diperbarui_pada timestamptz NOT NULL DEFAULT now()
    );
  `)
}

// Membaca struktur dari DB (baris 'utama'). Bila tabel/baris tidak
// ada, JSON rusak, atau validasi gagal, kembalikan data default SK.
// Fungsi ini tidak pernah throw, supaya halaman publik tidak mati
// hanya karena struktur gagal dibaca.
export async function getStrukturPetugas(): Promise<StrukturPetugas> {
  try {
    await ensureStrukturSchema()
    const result = await pool.query<{ data: unknown }>(`SELECT data FROM public.struktur_petugas WHERE id = 'utama' LIMIT 1`)
    const row = result.rows[0]
    if (!row) return STRUKTUR_PETUGAS
    const validated = validateStrukturPetugas(row.data)
    if (!validated.ok) {
      console.error('[struktur] data tersimpan tidak valid, memakai data SK:', validated.error)
      return STRUKTUR_PETUGAS
    }
    return validated.data
  } catch (error) {
    console.error('[struktur] gagal membaca, memakai data SK:', error)
    return STRUKTUR_PETUGAS
  }
}

function slugDariNama(nama: string): string {
  const slug = nama
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'item'
}

function idBaru(nama: string, dipakai: Set<string>): string {
  const dasar = slugDariNama(nama)
  if (!dipakai.has(dasar)) return dasar
  let id = `${dasar}-${Math.random().toString(36).slice(2, 6)}`
  while (dipakai.has(id)) id = `${dasar}-${Math.random().toString(36).slice(2, 6)}`
  return id
}

function teks(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

type HasilValidasi<T> = { ok: true; data: T } | { ok: false; error: string }

function bersihkanPetugas(value: unknown, dipakai: Set<string>): HasilValidasi<Petugas> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'Data petugas tidak valid.' }
  const item = value as Record<string, unknown>
  const nama = teks(item.nama)
  if (nama.length < 1) return { ok: false, error: 'Nama petugas wajib diisi.' }
  if (nama.length > BATAS.nama) return { ok: false, error: `Nama petugas maksimal ${BATAS.nama} karakter.` }
  const kelas = teks(item.kelas)
  if (kelas.length > BATAS.kelas) return { ok: false, error: `Keterangan petugas maksimal ${BATAS.kelas} karakter.` }
  const jabatan = teks(item.jabatan)
  if (jabatan.length > BATAS.jabatan) return { ok: false, error: `Jabatan petugas maksimal ${BATAS.jabatan} karakter.` }
  const tugas = teks(item.tugas)
  if (tugas.length > BATAS.tugas) return { ok: false, error: `Tugas petugas maksimal ${BATAS.tugas} karakter.` }
  // `foto` dipertahankan bila berupa path lokal gambar yang valid
  // (sesuai tipe Petugas + komentar header modul); sebelumnya field
  // ini dibuang diam-diam, jadi foto yang sudah ada hilang setiap
  // kali admin menyimpan dari editor. `whatsapp` dan field lain yang
  // tak dikenal tetap dibuang.
  const fotoMentah = typeof item.foto === 'string' ? item.foto.trim() : ''
  const foto = fotoMentah && fotoMentah.startsWith('/') && !fotoMentah.startsWith('//') && fotoMentah.length <= 500 && /\.(jpe?g|png|webp|avif)$/i.test(fotoMentah.split('?')[0])
    ? fotoMentah
    : undefined
  const idMentah = teks(item.id)
  const id = idMentah && !dipakai.has(idMentah) && /^[a-z0-9][a-z0-9-]*$/.test(idMentah) ? idMentah : idBaru(nama, dipakai)
  dipakai.add(id)
  return { ok: true, data: { id, nama, kelas, jabatan, tugas, ...(foto ? { foto } : {}) } }
}

function bersihkanTim(value: unknown, dipakai: Set<string>): HasilValidasi<TimPetugas> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'Data tim tidak valid.' }
  const item = value as Record<string, unknown>
  const nama = teks(item.nama)
  if (nama.length < 1) return { ok: false, error: 'Nama tim wajib diisi.' }
  if (nama.length > BATAS.namaTim) return { ok: false, error: `Nama tim maksimal ${BATAS.namaTim} karakter.` }
  const deskripsi = teks(item.deskripsi)
  if (deskripsi.length > BATAS.deskripsiTim) return { ok: false, error: `Deskripsi tim maksimal ${BATAS.deskripsiTim} karakter.` }
  const ikon = item.ikon
  if (typeof ikon !== 'string' || !(IKON_TIM as string[]).includes(ikon)) return { ok: false, error: `Ikon tim "${nama}" tidak dikenal.` }
  const warna = item.warna
  if (typeof warna !== 'string' || !(WARNA_TIM as string[]).includes(warna)) return { ok: false, error: `Warna tim "${nama}" tidak dikenal.` }
  const koordinator = bersihkanPetugas(item.koordinator, dipakai)
  if (!koordinator.ok) return { ok: false, error: `Koordinator tim "${nama}": ${koordinator.error}` }
  if (!Array.isArray(item.anggota)) return { ok: false, error: `Daftar anggota tim "${nama}" tidak valid.` }
  if (item.anggota.length > BATAS.anggota) return { ok: false, error: `Anggota tim "${nama}" maksimal ${BATAS.anggota} orang.` }
  const anggota: Petugas[] = []
  for (const raw of item.anggota) {
    const hasil = bersihkanPetugas(raw, dipakai)
    if (!hasil.ok) return { ok: false, error: `Anggota tim "${nama}": ${hasil.error}` }
    anggota.push(hasil.data)
  }
  const idMentah = teks(item.id)
  const id = idMentah && !dipakai.has(idMentah) && /^[a-z0-9][a-z0-9-]*$/.test(idMentah) ? idMentah : idBaru(nama, dipakai)
  dipakai.add(id)
  return { ok: true, data: { id, nama, ikon: ikon as IkonTim, warna: warna as WarnaTim, deskripsi, koordinator: koordinator.data, anggota } }
}

// Validasi ketat data struktur (dari editor admin atau DB). Field
// tak dikenal dibuang; id yang kosong atau duplikat dibuat ulang
// dari nama. Mengembalikan data bersih yang siap disimpan.
export function validateStrukturPetugas(value: unknown): HasilValidasi<StrukturPetugas> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'Data struktur tidak valid.' }
  const item = value as Record<string, unknown>
  if (!Array.isArray(item.pengurusInti)) return { ok: false, error: 'Daftar pengurus inti tidak valid.' }
  if (item.pengurusInti.length > BATAS.pengurus) return { ok: false, error: `Pengurus inti maksimal ${BATAS.pengurus} orang.` }
  if (!Array.isArray(item.tim)) return { ok: false, error: 'Daftar tim tidak valid.' }
  if (item.tim.length > BATAS.tim) return { ok: false, error: `Tim maksimal ${BATAS.tim} tim.` }
  const dipakai = new Set<string>()
  const pengurusInti: Petugas[] = []
  for (const raw of item.pengurusInti) {
    const hasil = bersihkanPetugas(raw, dipakai)
    if (!hasil.ok) return { ok: false, error: `Pengurus inti: ${hasil.error}` }
    pengurusInti.push(hasil.data)
  }
  const tim: TimPetugas[] = []
  for (const raw of item.tim) {
    const hasil = bersihkanTim(raw, dipakai)
    if (!hasil.ok) return hasil
    tim.push(hasil.data)
  }
  return { ok: true, data: { pengurusInti, tim } }
}
