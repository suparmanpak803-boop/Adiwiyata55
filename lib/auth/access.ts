// Hak akses portal: memetakan sesi Neon Auth ke peran aplikasi.
//
// PERINGATAN — dua kosakata peran (bug R-01):
//   Database menyimpan: 'admin' | 'officer' | 'visitor'
//   Aplikasi memakai:   'admin' | 'petugas' | 'pengunjung'
// Pemetaan bolak-balik HANYA dilakukan di sini (dan di
// app/actions/admin-users.ts saat menulis). Kode lain tidak boleh
// membandingkan user.role dengan nilai DB, dan tidak boleh menulis
// nilai portal ke kolom role DB.
import { pool } from '@/lib/db'
import { getAuth } from '@/lib/auth/server'

export type PortalRole = 'admin' | 'petugas' | 'pengunjung'

export type PortalUser = {
  id: string
  name: string
  email: string
  role: PortalRole
  className: string | null
  nomorAbsen: number | null
}

function toPortalRole(dbRole: string | null | undefined): PortalRole {
  if (dbRole === 'admin') return 'admin'
  if (dbRole === 'officer') return 'petugas'
  return 'pengunjung'
}

function todayInJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

// null = belum login. Caller yang memutuskan: 401 / redirect / batasan.
// Melempar Error bila sesi ada tapi peran di DB tidak bisa dibaca
// (jangan diam-diam menurunkan pengguna jadi pengunjung).
export async function getPortalUser(): Promise<PortalUser | null> {
  const { data: session } = await getAuth().getSession()
  const authUser = session?.user
  if (!authUser?.id) return null

  const result = await pool.query<{ role: string | null; class_name: string | null; expires_on: string | null }>(
    `SELECT role, class_name, expires_on::text AS expires_on FROM public.adiwiyata_user_roles WHERE user_id = $1 LIMIT 1`,
    [authUser.id],
  )
  const row = result.rows[0]
  let role = toPortalRole(row?.role)
  let className = row?.class_name ?? null
  // Akun petugas yang masa berlakunya habis kembali jadi pengunjung.
  if (role === 'petugas' && row?.expires_on && row.expires_on < todayInJakarta()) {
    role = 'pengunjung'
    className = null
  }
  // Nomor absen dibaca lewat query kedua: kolomnya baru ada di DB
  // setelah admin mengetuk perbaikan tabel, jadi kegagalan di sini
  // tidak boleh menggagalkan pembacaan peran dan kelas di atas.
  let nomorAbsen: number | null = null
  try {
    const absen = await pool.query<{ nomor_absen: number | null }>(
      `SELECT nomor_absen FROM public.adiwiyata_user_roles WHERE user_id = $1 LIMIT 1`,
      [authUser.id],
    )
    const value = absen.rows[0]?.nomor_absen
    nomorAbsen = typeof value === 'number' ? value : null
  } catch {
    nomorAbsen = null
  }
  return {
    id: authUser.id,
    name: (authUser as { name?: string | null }).name ?? '',
    email: (authUser as { email?: string | null }).email ?? '',
    role,
    className,
    nomorAbsen,
  }
}

export async function requirePortalRole(roles: PortalRole[]): Promise<PortalUser> {
  const user = await getPortalUser()
  if (!user) throw new Error('UNAUTHORIZED')
  if (!roles.includes(user.role)) throw new Error('FORBIDDEN')
  return user
}
