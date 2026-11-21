import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  const [list, unread] = await Promise.all([
    pool.query(`SELECT id, judul, isi, tautan, dibaca, dibuat_pada AS "dibuatPada" FROM public.notifikasi WHERE user_id = $1 ORDER BY dibuat_pada DESC LIMIT 15`, [user.id]),
    pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.notifikasi WHERE user_id = $1 AND dibaca = false`, [user.id]),
  ])
  return NextResponse.json({ notifikasi: list.rows, belumDibaca: unread.rows[0]?.n ?? 0 }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  await pool.query(`UPDATE public.notifikasi SET dibaca = true WHERE user_id = $1 AND dibaca = false`, [user.id])
  return NextResponse.json({ ok: true })
}
