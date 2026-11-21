import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  try {
    const user = await getPortalUser()
    if (!user) return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
    const body = await request.json() as { tampilInisial?: unknown }
    if (typeof body.tampilInisial !== 'boolean') return NextResponse.json({ error: 'Pilihan privasi tidak valid.' }, { status: 400 })
    await pool.query(`UPDATE public.adiwiyata_user_roles SET tampil_inisial = $1, updated_at = NOW() WHERE user_id = $2`, [body.tampilInisial, user.id])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Pilihan privasi tidak dapat disimpan.' }, { status: 500 })
  }
}
