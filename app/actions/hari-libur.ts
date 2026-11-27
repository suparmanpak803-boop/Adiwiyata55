'use server'

import { revalidatePath } from 'next/cache'
import { requirePortalRole } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'
import { ensureLiburSchema, tanggalIsoValid } from '@/lib/hari-sekolah'

type HasilSimpan = { ok: true } | { ok: false; error: string }

function pesanGalat(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'UNAUTHORIZED') return 'Silakan login kembali.'
  if (message === 'FORBIDDEN') return 'Halaman ini hanya untuk Admin.'
  return 'Hari libur belum berhasil disimpan. Periksa koneksi, lalu coba lagi.'
}

// Menambah (atau memperbarui keterangan) satu tanggal libur.
// Tanggal yang sudah ada ditimpa keterangannya (UPSERT).
export async function tambahHariLibur(tanggal: unknown, keterangan: unknown): Promise<HasilSimpan> {
  try {
    const admin = await requirePortalRole(['admin'])
    // B-04: batas laju perubahan hari libur (30/jam per admin).
    if (!(await allowRequest(`hari-libur:${admin.id}`, 30, 3600, { failClosed: true }))) {
      return { ok: false, error: 'Terlalu banyak perubahan. Coba lagi nanti.' }
    }
    if (!tanggalIsoValid(tanggal)) return { ok: false, error: 'Tanggal libur tidak valid (format YYYY-MM-DD).' }
    const teks = typeof keterangan === 'string' ? keterangan.trim() : ''
    if (teks.length > 100) return { ok: false, error: 'Keterangan hari libur maksimal 100 karakter.' }
    await ensureLiburSchema()
    await pool.query(
      `INSERT INTO public.hari_libur (tanggal, keterangan) VALUES ($1::date, $2)
         ON CONFLICT (tanggal) DO UPDATE SET keterangan = EXCLUDED.keterangan`,
      [tanggal, teks],
    )
    revalidatePath('/admin/game')
    revalidatePath('/leaderboard')
    return { ok: true }
  } catch (error) {
    console.error('[hari-libur/tambah]', error)
    return { ok: false, error: pesanGalat(error) }
  }
}

// Menghapus satu tanggal libur.
export async function hapusHariLibur(tanggal: unknown): Promise<HasilSimpan> {
  try {
    const admin = await requirePortalRole(['admin'])
    // B-04: batas laju perubahan hari libur (30/jam per admin).
    if (!(await allowRequest(`hari-libur:${admin.id}`, 30, 3600, { failClosed: true }))) {
      return { ok: false, error: 'Terlalu banyak perubahan. Coba lagi nanti.' }
    }
    if (!tanggalIsoValid(tanggal)) return { ok: false, error: 'Tanggal libur tidak valid (format YYYY-MM-DD).' }
    await ensureLiburSchema()
    await pool.query(`DELETE FROM public.hari_libur WHERE tanggal = $1::date`, [tanggal])
    revalidatePath('/admin/game')
    revalidatePath('/leaderboard')
    return { ok: true }
  } catch (error) {
    console.error('[hari-libur/hapus]', error)
    return { ok: false, error: pesanGalat(error) }
  }
}
