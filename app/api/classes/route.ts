import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { getClassMasterData } from '@/lib/class-master'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ success: false, error: 'Silakan masuk kembali.' }, { status: 401 })
  if (user.role !== 'admin' && user.role !== 'petugas') {
    return NextResponse.json({ success: false, error: 'Hanya Admin dan Petugas yang dapat memuat daftar kelas.' }, { status: 403 })
  }

  try {
    const master = await getClassMasterData()
    // Daftar kelas untuk pemilih input: semua kelas aktif untuk admin
    // maupun petugas — petugas boleh menginput untuk kelas mana pun.
    const classes = master.classes
    return NextResponse.json({ success: true, classes, locations: master.locations }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    // L-01: pesan error mentah hanya masuk log server.
    console.error('[api/classes]', error)
    return NextResponse.json({ success: false, error: 'Master_Kelas belum dapat dimuat.' }, { status: 503 })
  }
}
