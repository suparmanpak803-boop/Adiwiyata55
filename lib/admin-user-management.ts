// Manajemen akun portal (panel Akses Pengguna, admin only).
// Membaca neon_auth.user (id/name/email) + adiwiyata_user_roles.
// Pemetaan baca adalah kebalikan dari toDatabaseRole di
// app/actions/admin-users.ts: admin->admin, officer->petugas,
// visitor->pengunjung. Peran lain / tanpa baris peran = pengunjung.
import { pool } from '@/lib/db'

export type ManagedPortalRole = 'admin' | 'petugas' | 'pengunjung'

export type ManagedAccount = {
  id: string
  name: string
  email: string
  role: ManagedPortalRole
  className: string | null
  expiresOn: string | null
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
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? row.email ?? '',
    email: row.email ?? '',
    role: toPortalRole(row.role),
    className: row.class_name ?? null,
    expiresOn: row.expires_on ?? null,
  }))
}
