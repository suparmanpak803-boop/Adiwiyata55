// Manajemen akun portal (panel Akses Pengguna, admin only).
// Membaca neon_auth.user (id/name/email) + adiwiyata_user_roles.
// Pemetaan baca adalah kebalikan dari toDatabaseRole di
// app/actions/admin-users.ts: admin->admin, officer->petugas,
// visitor->pengunjung. Peran lain / tanpa baris peran = pengunjung.
import { pool } from '@/lib/db'
import type { JenisPengguna } from '@/lib/auth/access'

export type ManagedPortalRole = 'admin' | 'petugas' | 'pengunjung'

export type ManagedAccount = {
  id: string
  name: string
  email: string
  role: ManagedPortalRole
  jenisPengguna: JenisPengguna
  className: string | null
  expiresOn: string | null
}

function toJenisPengguna(dbValue: string | null | undefined): JenisPengguna {
  if (dbValue === 'guru') return 'guru'
  if (dbValue === 'staff_tu') return 'staff_tu'
  return 'siswa'
}

function toPortalRole(dbRole: string | null | undefined): ManagedPortalRole {
  if (dbRole === 'admin') return 'admin'
  if (dbRole === 'officer') return 'petugas'
  return 'pengunjung'
}

// Mengembalikan array langsung (bukan envelope) — envelope
// { success, accounts } dibuat server action searchAdminUsers.
export async function getManagedAccounts(search?: string): Promise<ManagedAccount[]> {
  const query = (search ?? '').trim()
  const result = await pool.query<{
    id: string
    name: string | null
    email: string | null
    role: string | null
    class_name: string | null
    expires_on: string | null
  }>(
    `SELECT u.id::text AS id, u.name, u.email, r.role, r.class_name, r.expires_on::text AS expires_on
       FROM neon_auth."user" u
       LEFT JOIN public.adiwiyata_user_roles r ON r.user_id = u.id
      WHERE ($1::text = '' OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%')
      ORDER BY u.name ASC NULLS LAST, u.email ASC
      LIMIT 250`,
    [query],
  )
  // Jenis pengguna dibaca lewat query kedua: kolomnya baru ada di DB
  // setelah migrasi Worker 1 tayang, jadi kegagalan di sini tidak boleh
  // menggagalkan daftar akun di atas. Akun tanpa nilai jenis jadi siswa.
  const jenisByUserId = new Map<string, JenisPengguna>()
  try {
    const jenis = await pool.query<{ user_id: string; jenis_pengguna: string | null }>(
      `SELECT user_id::text AS user_id, jenis_pengguna FROM public.adiwiyata_user_roles`,
    )
    for (const row of jenis.rows) jenisByUserId.set(row.user_id, toJenisPengguna(row.jenis_pengguna))
  } catch {
    // Kolom belum ada di DB live: semua akun memakai fallback siswa.
  }
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? row.email ?? '',
    email: row.email ?? '',
    role: toPortalRole(row.role),
    jenisPengguna: jenisByUserId.get(row.id) ?? 'siswa',
    className: row.class_name ?? null,
    expiresOn: row.expires_on ?? null,
  }))
}
