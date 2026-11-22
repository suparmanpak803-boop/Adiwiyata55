// Hari sekolah efektif & hari libur (tanggal merah nasional +
// libur sekolah) untuk rata-rata pengumpulan sampah per hari
// sekolah di leaderboard sampah.
//
// Hari sekolah efektif dalam satu periode = jumlah hari Senin–
// Jumat pada rentang tanggal periode itu, dikurangi tanggal libur
// yang tercatat di tabel public.hari_libur.
//
// Modul ini server-only (mengimpor pool). Daftar libur diisi admin
// lewat /admin/game; daftar mulai kosong — bila kosong, hitungan
// memakai Senin–Jumat saja.

import { pool } from '@/lib/db'

export type HariLibur = {
  tanggal: string // YYYY-MM-DD
  keterangan: string
}

const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/

// Validasi tanggal kalender yang benar (menolak 2026-02-30 dst).
export function tanggalIsoValid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const cocok = POLA_TANGGAL.exec(value)
  if (!cocok) return false
  const tahun = Number(cocok[1])
  const bulan = Number(cocok[2])
  const hari = Number(cocok[3])
  if (bulan < 1 || bulan > 12 || hari < 1 || hari > 31) return false
  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari))
  return tanggal.getUTCFullYear() === tahun && tanggal.getUTCMonth() === bulan - 1 && tanggal.getUTCDate() === hari
}

function uraikanTanggal(value: string): { tahun: number; bulan: number; hari: number } | null {
  if (!tanggalIsoValid(value)) return null
  const cocok = POLA_TANGGAL.exec(value)
  if (!cocok) return null
  return { tahun: Number(cocok[1]), bulan: Number(cocok[2]), hari: Number(cocok[3]) }
}

// Membuat tabel bila belum ada (idempotent). Dipanggil di awal
// pembacaan dan penyimpanan, seperti ensureStrukturSchema().
export async function ensureLiburSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.hari_libur (
      tanggal date PRIMARY KEY,
      keterangan text NOT NULL DEFAULT '',
      dibuat_pada timestamptz NOT NULL DEFAULT now()
    );
  `)
}

// Hitung hari Senin–Jumat pada rentang tanggal ISO (inklusif),
// dikurangi tanggal yang ada di `libur`. Semua perhitungan memakai
// UTC tengah malam agar tidak geser zona waktu. Bila rentang tidak
// valid, kembalikan 0.
export function hitungHariSekolah(from: string, to: string, libur: Set<string>): number {
  const awal = uraikanTanggal(from)
  const akhir = uraikanTanggal(to)
  if (!awal || !akhir) return 0
  const mulaiMs = Date.UTC(awal.tahun, awal.bulan - 1, awal.hari)
  const selesaiMs = Date.UTC(akhir.tahun, akhir.bulan - 1, akhir.hari)
  if (selesaiMs < mulaiMs) return 0
  let jumlah = 0
  for (let saat = mulaiMs; saat <= selesaiMs; saat += 86_400_000) {
    const tanggal = new Date(saat)
    const hari = tanggal.getUTCDay()
    if (hari === 0 || hari === 6) continue // Minggu / Sabtu
    if (libur.has(tanggal.toISOString().slice(0, 10))) continue
    jumlah += 1
  }
  return jumlah
}

// Daftar libur pada rentang tanggal (inklusif). Tidak pernah throw:
// bila tabel belum ada atau gagal dibaca, kembalikan [] (hitungan
// lalu memakai Senin–Jumat saja).
export async function getHariLibur(from: string, to: string): Promise<HariLibur[]> {
  try {
    await ensureLiburSchema()
    if (!tanggalIsoValid(from) || !tanggalIsoValid(to)) return []
    const result = await pool.query<{ tanggal: string; keterangan: string }>(
      `SELECT tanggal::text AS tanggal, keterangan FROM public.hari_libur
        WHERE tanggal BETWEEN $1::date AND $2::date ORDER BY tanggal ASC`,
      [from, to],
    )
    return result.rows.map((row) => ({ tanggal: row.tanggal, keterangan: row.keterangan ?? '' }))
  } catch (error) {
    console.error('[hari-libur] gagal membaca, memakai daftar kosong:', error)
    return []
  }
}

// Seluruh daftar libur untuk halaman admin. Tidak pernah throw.
export async function listHariLibur(): Promise<HariLibur[]> {
  try {
    await ensureLiburSchema()
    const result = await pool.query<{ tanggal: string; keterangan: string }>(
      `SELECT tanggal::text AS tanggal, keterangan FROM public.hari_libur ORDER BY tanggal ASC`,
    )
    return result.rows.map((row) => ({ tanggal: row.tanggal, keterangan: row.keterangan ?? '' }))
  } catch (error) {
    console.error('[hari-libur] gagal membaca daftar:', error)
    return []
  }
}
