import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { ALLOWED_LOCATIONS, DAILY_LIMIT, KATEGORI, MAX_PHOTOS, URGENSI } from '@/lib/laporan'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  const result = await pool.query(
    `SELECT id, nomor_tiket AS "nomorTiket", kategori, judul, status, urgensi, dibuat_pada AS "dibuatPada"
     FROM public.laporan WHERE user_id = $1 ORDER BY dibuat_pada DESC LIMIT 100`, [user.id],
  )
  return NextResponse.json({ laporan: result.rows }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })

  const kategori = KATEGORI.find((k) => k.id === body.kategori)
  const judul = typeof body.judul === 'string' ? body.judul.trim().replace(/\s+/g, ' ') : ''
  const isi = typeof body.isi === 'string' ? body.isi.trim() : ''
  const urgensi = URGENSI.find((u) => u.id === body.urgensi)?.id
  const lokasi = typeof body.lokasi === 'string' ? body.lokasi : ''
  const anonim = body.anonim === true
  const fotos = Array.isArray(body.foto) ? body.foto.filter((f): f is string => typeof f === 'string') : []

  if (!kategori) return NextResponse.json({ error: 'Pilih kategori laporan.' }, { status: 400 })
  if (kategori.needsLocation && !ALLOWED_LOCATIONS.includes(lokasi)) return NextResponse.json({ error: 'Pilih kelas atau lokasi.' }, { status: 400 })
  if (!kategori.needsLocation && lokasi && !ALLOWED_LOCATIONS.includes(lokasi)) return NextResponse.json({ error: 'Lokasi tidak valid.' }, { status: 400 })
  if (!judul || judul.length > 80) return NextResponse.json({ error: 'Judul wajib diisi, maksimal 80 karakter.' }, { status: 400 })
  if (isi.length < 20 || isi.length > 1000) return NextResponse.json({ error: 'Isi laporan 20 sampai 1000 karakter.' }, { status: 400 })
  if (!urgensi) return NextResponse.json({ error: 'Pilih tingkat urgensi.' }, { status: 400 })
  if (fotos.length > MAX_PHOTOS) return NextResponse.json({ error: `Maksimal ${MAX_PHOTOS} foto.` }, { status: 400 })
  if (!(await allowRequest(`laporan:${user.id}`, 10, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })

  const today = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM public.laporan WHERE user_id = $1 AND dibuat_pada >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'`, [user.id])
  if ((today.rows[0]?.n ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: `Batas ${DAILY_LIMIT} laporan per hari sudah tercapai.` }, { status: 429 })
  const hash = createHash('sha256').update(`${user.id}|${kategori.id}|${isi.toLowerCase().replace(/\s+/g, ' ')}`).digest('hex')
  const dup = await pool.query(`SELECT 1 FROM public.laporan WHERE user_id = $1 AND isi_hash = $2 AND dibuat_pada > now() - interval '7 days' LIMIT 1`, [user.id, hash])
  if (dup.rowCount) return NextResponse.json({ error: 'Laporan yang sama sudah pernah dikirim.' }, { status: 409 })

  if (fotos.length) {
    const owned = await pool.query(`SELECT pathname FROM public.laporan_foto_unggahan WHERE user_id = $1 AND pathname = ANY($2::text[])`, [user.id, fotos])
    if (owned.rowCount !== new Set(fotos).size) return NextResponse.json({ error: 'Foto tidak valid.' }, { status: 400 })
  }

  const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()).replaceAll('-', '')
  const client = await pool.connect()
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await client.query('BEGIN')
      try {
        const seq = await client.query<{ n: number }>(`SELECT COALESCE(MAX(right(nomor_tiket, 4)::int), 0) + 1 AS n FROM public.laporan WHERE nomor_tiket LIKE $1`, [`LPR-${stamp}-%`])
        const ticket = `LPR-${stamp}-${String(seq.rows[0].n).padStart(4, '0')}`
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO public.laporan (nomor_tiket, user_id, anonim, nama_pelapor, kategori, lokasi, judul, isi, isi_hash, urgensi)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [ticket, user.id, anonim, anonim ? null : user.name, kategori.id, lokasi || null, judul, isi, hash, urgensi],
        )
        const id = inserted.rows[0].id
        for (const pathname of new Set(fotos)) await client.query(`INSERT INTO public.laporan_foto (laporan_id, pathname, nama_file) VALUES ($1,$2,$3)`, [id, pathname, pathname.split('/').pop()])
        await client.query(`INSERT INTO public.laporan_riwayat_status (laporan_id, status, catatan) VALUES ($1,'baru','Laporan dikirim')`, [id])
        await client.query('COMMIT')
        return NextResponse.json({ id, nomorTiket: ticket }, { status: 201 })
      } catch (error) {
        await client.query('ROLLBACK')
        if ((error as { code?: string }).code !== '23505') throw error
      }
    }
    return NextResponse.json({ error: 'Nomor tiket belum dapat dibuat. Coba lagi.' }, { status: 503 })
  } finally {
    client.release()
  }
}
