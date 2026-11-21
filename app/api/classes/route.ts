import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { getClassMasterData } from '@/lib/class-master'
import { normalizeClassCode } from '@/lib/class-codes'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ success: false, error: 'Silakan masuk kembali.' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'petugas') {
    return NextResponse.json({ success: false, error: 'Hanya Admin dan Petugas yang dapat memuat daftar kelas.' }, { status: 403 })
  }

  try {
    const master = await getClassMasterData()
    const assignedClass = normalizeClassCode(user.className)
    const classes = user.role === 'petugas' ? master.classes.filter((item) => item.code === assignedClass) : master.classes
    return NextResponse.json({ success: true, classes, locations: master.locations }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Master_Kelas belum dapat dimuat.'
    return NextResponse.json({ success: false, error: message }, { status: 503 })
  }
}
