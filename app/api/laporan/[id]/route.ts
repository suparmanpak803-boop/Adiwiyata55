import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

async function load(id: string, userId: string) {
  if (!/^\d{1,15}$/.test(id)) return null
  const report = await pool.query(
    `SELECT id, nomor_tiket AS "nomorTiket", kategori, lokasi, judul, isi, urgensi, status, anonim, tanggapan_admin AS "tanggapan", rating,
            dibuat_pada AS "dibuatPada", diselesaikan_pada AS "diselesaikanPada"
     FROM public.laporan WHERE id = $1 AND user_id = $2`, [id, userId],
  )
  return report.rows[0] ?? null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  const { id } = await params
  const report = await load(id, user.id)
  if (!report) return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 })
  const [photos, comments, history] = await Promise.all([
    pool.query(`SELECT pathname FROM public.laporan_foto WHERE laporan_id = $1 ORDER BY id`, [id]),
    pool.query(`SELECT dari_admin AS "dariAdmin", isi, dibuat_pada AS "dibuatPada" FROM public.laporan_komentar WHERE laporan_id = $1 ORDER BY id`, [id]),
    pool.query(`SELECT status, catatan, dibuat_pada AS "dibuatPada" FROM public.laporan_riwayat_status WHERE laporan_id = $1 ORDER BY id`, [id]),
  ])
  return NextResponse.json({ laporan: report, foto: photos.rows.map((p) => p.pathname), komentar: comments.rows, riwayat: history.rows }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  const { id } = await params
  const report = await load(id, user.id)
  if (!report) return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 })
  if (!(await allowRequest(`laporan-aksi:${user.id}`, 20, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
  const body = await request.json().catch(() => null) as { aksi?: unknown; isi?: unknown; rating?: unknown } | null

  if (body?.aksi === 'komentar') {
    const isi = typeof body.isi === 'string' ? body.isi.trim() : ''
    if (isi.length < 3 || isi.length > 500) return NextResponse.json({ error: 'Komentar 3 sampai 500 karakter.' }, { status: 400 })
    if (report.status === 'selesai' || report.status === 'ditolak') return NextResponse.json({ error: 'Laporan sudah ditutup.' }, { status: 409 })
    await pool.query(`INSERT INTO public.laporan_komentar (laporan_id, user_id, dari_admin, isi) VALUES ($1,$2,false,$3)`, [id, user.id, isi])
    return NextResponse.json({ ok: true })
  }
  if (body?.aksi === 'rating') {
    const rating = Number(body.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: 'Rating 1 sampai 5.' }, { status: 400 })
    if (report.status !== 'selesai') return NextResponse.json({ error: 'Rating hanya setelah laporan selesai.' }, { status: 409 })
    await pool.query(`UPDATE public.laporan SET rating = $2 WHERE id = $1`, [id, rating])
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 })
}
