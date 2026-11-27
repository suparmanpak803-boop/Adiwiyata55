'use server'

import { revalidatePath } from 'next/cache'
import { getPortalUser } from '@/lib/auth/access'
import { getClassMasterData, getFallbackClassMaster } from '@/lib/class-master'
import { normalizeClassCode } from '@/lib/class-codes'
import { pool } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'

export type SimpanKelasProfilResult =
  | { ok: true; className: string | null; nomorAbsen: number | null }
  | { ok: false; error: string }

// Menyimpan kelas dan nomor absen pengguna yang sudah masuk.
// Upsert ini tidak mengubah peran: bila baris peran belum ada, dibuat
// sebagai pengunjung; bila sudah ada, hanya kelas, nomor absen, dan
// waktu perbaruan yang berubah.
// Dipanggil dua argumen posisi, atau satu objek { className, nomorAbsen }
// seperti yang dipakai komponen dropdown profil.
export async function saveKelasProfil(
  classNameOrInput: string | null | { className: string | null; nomorAbsen: number | null },
  nomorAbsenArg?: number | null,
): Promise<SimpanKelasProfilResult> {
  const isObject = classNameOrInput !== null && typeof classNameOrInput === 'object'
  const className = isObject ? classNameOrInput.className : classNameOrInput
  const nomorAbsen = isObject ? classNameOrInput.nomorAbsen : (nomorAbsenArg ?? null)
  const user = await getPortalUser()
  if (!user) return { ok: false, error: 'Kamu belum masuk. Masuk dulu, lalu simpan lagi.' }
  // Batas laju perubahan profil (10/jam per pengguna).
  if (!(await allowRequest(`profil-kelas:${user.id}`, 10, 3600))) {
    return { ok: false, error: 'Terlalu banyak perubahan profil. Coba lagi satu jam lagi.' }
  }

  let kelas: string | null = null
  if (className !== null) {
    const kode = normalizeClassCode(className)
    const master = await getClassMasterData().catch(() => getFallbackClassMaster())
    if (!kode || !master.classes.some((item) => item.active && item.code === kode)) {
      return { ok: false, error: 'Kelas tidak terdaftar atau tidak aktif. Pilih kelas dari daftar.' }
    }
    kelas = kode
  }
  if (nomorAbsen !== null && (!Number.isInteger(nomorAbsen) || nomorAbsen < 1 || nomorAbsen > 36)) {
    return { ok: false, error: 'Nomor absen harus 1 sampai 36, atau dikosongkan.' }
  }

  try {
    await pool.query(
      `INSERT INTO public.adiwiyata_user_roles (user_id, role, class_name, nomor_absen)
       VALUES ($1, 'visitor', $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         class_name = EXCLUDED.class_name, nomor_absen = EXCLUDED.nomor_absen, updated_at = NOW()`,
      [user.id, kelas, nomorAbsen],
    )
  } catch {
    return { ok: false, error: 'Kelas belum berhasil disimpan. Periksa koneksi, lalu coba lagi.' }
  }
  revalidatePath('/')
  return { ok: true, className: kelas, nomorAbsen }
}

// Statistik profil dari data setoran asli pengguna: jumlah setoran yang
// ia kirim dan jumlah hari berbeda saat ia membawa tumbler.
// Melempar Error bila query gagal; tidak pernah mengarang angka.
export async function getStatistikProfil(userId: string): Promise<{ setoran: number; hariTumbler: number }> {
  if (!userId) throw new Error('Statistik profil membutuhkan pengguna yang sudah masuk.')
  try {
    const result = await pool.query<{ setoran: number; hari_tumbler: number }>(
      `SELECT COUNT(*)::int AS setoran,
              COUNT(DISTINCT date) FILTER (WHERE tumbler > 0)::int AS hari_tumbler
         FROM public.adiwiyata_deposits
        WHERE user_id = $1`,
      [userId],
    )
    const row = result.rows[0]
    if (!row) throw new Error('Statistik profil belum dapat dimuat. Periksa koneksi, lalu muat ulang halaman.')
    return { setoran: row.setoran, hariTumbler: row.hari_tumbler }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Statistik profil')) throw error
    throw new Error('Statistik profil belum dapat dimuat. Periksa koneksi, lalu muat ulang halaman.')
  }
}
