import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request-body'

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  try {
    const user = await getPortalUser()
    if (!user) return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
    // B-13: batas laju perubahan preferensi leaderboard (30/menit per pengguna).
    if (!(await allowRequest(`leaderboard-pref:${user.id}`, 30, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
    const parsed = await readJsonBody<{ tampilInisial?: unknown }>(request)
    if (!parsed.ok) return NextResponse.json({ error: parsed.reason === 'too_large' ? 'Data terlalu besar.' : 'Data tidak valid.' }, { status: parsed.reason === 'too_large' ? 413 : 400 })
    const body = parsed.data
    if (typeof body.tampilInisial !== 'boolean') return NextResponse.json({ error: 'Pilihan privasi tidak valid.' }, { status: 400 })
    // UPSERT: akun yang belum punya baris peran (mis. baru login Google)
    // membuat UPDATE biasa tidak mengubah baris apa pun — preferensi
    // lalu hilang diam-diam walau API menjawab success. Baris baru
    // memakai peran default 'visitor' (sama seperti fallback baca).
    const saved = await pool.query(
      `INSERT INTO public.adiwiyata_user_roles (user_id, role, tampil_inisial, updated_at)
         VALUES ($2, 'visitor', $1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET tampil_inisial = EXCLUDED.tampil_inisial, updated_at = NOW()
       RETURNING user_id`,
      [body.tampilInisial, user.id],
    )
    if (!saved.rowCount) return NextResponse.json({ error: 'Pilihan privasi tidak dapat disimpan.' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Pilihan privasi tidak dapat disimpan.' }, { status: 500 })
  }
}
