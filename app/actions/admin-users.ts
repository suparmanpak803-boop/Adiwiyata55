'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adiwiyataUserRoles, neonAuthUsers } from '@/lib/db/schema'
import { getFallbackClassMaster, getClassMasterData } from '@/lib/class-master'
import { normalizeClassCode } from '@/lib/class-codes'
import { requirePortalRole } from '@/lib/auth/access'
import { allowRequest } from '@/lib/rate-limit'
import { getManagedAccounts, type ManagedPortalRole } from '@/lib/admin-user-management'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

class UserManagementError extends Error {}

function isManagedPortalRole(value: unknown): value is ManagedPortalRole {
  return value === 'admin' || value === 'petugas' || value === 'pengunjung'
}

function toDatabaseRole(role: ManagedPortalRole) {
  if (role === 'petugas') return 'officer' as const
  if (role === 'pengunjung') return 'visitor' as const
  return 'admin' as const
}

export async function searchAdminUsers(search: string) {
  try {
    await requirePortalRole(['admin'])
    const accounts = await getManagedAccounts(typeof search === 'string' ? search : '')
    return { success: true as const, accounts }
  } catch {
    return { success: false as const, error: 'Daftar akun tidak dapat dimuat. Pastikan sesi Admin masih aktif.' }
  }
}

export async function updateAdminUserRole(input: { userId: string; role: ManagedPortalRole; className: string; expiresOn: string | null }) {
  try {
    const actor = await requirePortalRole(['admin'])
    // M-07: batas laju perubahan peran (10/menit per admin).
    if (!(await allowRequest(`peran:${actor.id}`, 10, 60))) throw new UserManagementError('Terlalu banyak perubahan peran. Coba lagi sebentar.')
    if (!input || typeof input !== 'object' || typeof input.userId !== 'string' || !UUID_PATTERN.test(input.userId)) {
      throw new UserManagementError('Akun yang dipilih tidak valid.')
    }
    if (!isManagedPortalRole(input.role)) throw new UserManagementError('Role yang dipilih tidak valid.')

    const userId = input.userId
    const role = input.role
    let assignedClass: string | null = null

    if (role === 'petugas') {
      const requestedClass = typeof input.className === 'string' ? input.className.trim() : ''
      const normalizedClass = normalizeClassCode(requestedClass)
      if (!normalizedClass) throw new UserManagementError('Pilih kelas aktif untuk akun petugas.')
      const master = await getClassMasterData().catch(() => getFallbackClassMaster())
      const matchedClass = master.classes.find((item) => item.active && normalizeClassCode(item.code) === normalizedClass)
      if (!matchedClass) throw new UserManagementError('Kelas tidak ditemukan atau sudah tidak aktif.')
      assignedClass = matchedClass.code
    }

    const expiresOn = role === 'petugas' && typeof input.expiresOn === 'string' && input.expiresOn ? input.expiresOn : null
    const parsedExpiry = expiresOn ? new Date(`${expiresOn}T00:00:00.000Z`) : null
    if (expiresOn && (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || Number.isNaN(parsedExpiry?.getTime()) || parsedExpiry?.toISOString().slice(0, 10) !== expiresOn || expiresOn < new Date().toISOString().slice(0, 10))) {
      throw new UserManagementError('Tanggal berakhir harus hari ini atau tanggal setelahnya.')
    }

    const databaseRole = toDatabaseRole(role)
    await db.transaction(async (transaction) => {
      const [target] = await transaction
        .select({ id: neonAuthUsers.id, role: adiwiyataUserRoles.role })
        .from(neonAuthUsers)
        .leftJoin(adiwiyataUserRoles, eq(adiwiyataUserRoles.userId, neonAuthUsers.id))
        .where(eq(neonAuthUsers.id, userId))
        .limit(1)

      if (!target) throw new UserManagementError('Akun tidak ditemukan.')
      if (target.id === actor.id && role !== 'admin') {
        throw new UserManagementError('Role Admin akun yang sedang digunakan tidak dapat diturunkan dari panel ini.')
      }

      if (target.role === 'admin' && databaseRole !== 'admin') {
        const admins = await transaction
          .select({ userId: adiwiyataUserRoles.userId })
          .from(adiwiyataUserRoles)
          .where(eq(adiwiyataUserRoles.role, 'admin'))
          .orderBy(asc(adiwiyataUserRoles.userId))
          .for('update')
        if (admins.length <= 1) throw new UserManagementError('Role Admin terakhir tidak dapat dihapus. Tetapkan Admin lain terlebih dahulu.')
      }

      await transaction
        .insert(adiwiyataUserRoles)
        .values({ userId, role: databaseRole, className: assignedClass, expiresOn, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: adiwiyataUserRoles.userId,
          set: { role: databaseRole, className: assignedClass, expiresOn, updatedAt: new Date() },
        })
    })

    revalidatePath('/admin/petugas')
    revalidatePath('/')
    revalidatePath('/laporan-kader')
    return { success: true as const }
  } catch (error) {
    if (error instanceof UserManagementError) return { success: false as const, error: error.message }
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return { success: false as const, error: 'Sesi Admin tidak valid. Silakan masuk kembali.' }
    }
    return { success: false as const, error: 'Perubahan akses belum berhasil disimpan. Coba lagi.' }
  }
}
