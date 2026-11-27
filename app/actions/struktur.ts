'use server'

import { revalidatePath } from 'next/cache'
import { requirePortalRole } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'
import { ensureStrukturSchema, validateStrukturPetugas } from '@/lib/struktur-petugas-data'

type HasilSimpan = { ok: true } | { ok: false; error: string }

function pesanGalat(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'UNAUTHORIZED') return 'Silakan login kembali.'
  if (message === 'FORBIDDEN') return 'Halaman ini hanya untuk Admin.'
  return 'Struktur belum berhasil disimpan. Periksa koneksi, lalu coba lagi.'
}

// Menyimpan seluruh struktur (pengurus inti + tim) dari editor admin.
// Data divalidasi ketat sebelum ditulis; baris 'utama' dibuat bila
// belum ada, lalu halaman publik dan halaman admin dimuat ulang.
export async function saveStruktur(data: unknown): Promise<HasilSimpan> {
  try {
    const admin = await requirePortalRole(['admin'])
    // B-04: batas laju perubahan struktur (30/jam per admin).
    if (!(await allowRequest(`struktur:${admin.id}`, 30, 3600, { failClosed: true }))) {
      return { ok: false, error: 'Terlalu banyak perubahan. Coba lagi nanti.' }
    }
    const validated = validateStrukturPetugas(data)
    if (!validated.ok) return { ok: false, error: validated.error }
    await ensureStrukturSchema()
    await pool.query(
      `INSERT INTO public.struktur_petugas (id, data) VALUES ('utama', $1::jsonb)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, diperbarui_pada = now()`,
      [JSON.stringify(validated.data)],
    )
    revalidatePath('/adiwiyata/struktur')
    revalidatePath('/admin/struktur')
    return { ok: true }
  } catch (error) {
    console.error('[struktur/simpan]', error)
    return { ok: false, error: pesanGalat(error) }
  }
}

// Menghapus baris 'utama' sehingga halaman publik kembali memakai
// data default dari SK (STRUKTUR_PETUGAS).
export async function resetStruktur(): Promise<HasilSimpan> {
  try {
    const admin = await requirePortalRole(['admin'])
    // B-04: batas laju perubahan struktur (30/jam per admin).
    if (!(await allowRequest(`struktur:${admin.id}`, 30, 3600, { failClosed: true }))) {
      return { ok: false, error: 'Terlalu banyak perubahan. Coba lagi nanti.' }
    }
    await ensureStrukturSchema()
    await pool.query(`DELETE FROM public.struktur_petugas WHERE id = 'utama'`)
    revalidatePath('/adiwiyata/struktur')
    revalidatePath('/admin/struktur')
    return { ok: true }
  } catch (error) {
    console.error('[struktur/reset]', error)
    return { ok: false, error: pesanGalat(error) }
  }
}
