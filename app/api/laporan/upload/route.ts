import { randomBytes } from 'node:crypto'
import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { matchesMagicBytes } from '@/lib/file-magic'
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from '@/lib/laporan'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  if (!(await allowRequest(`laporan-foto:${user.id}`, 15, 600, { failClosed: true }))) return NextResponse.json({ error: 'Terlalu banyak unggahan. Coba lagi nanti.' }, { status: 429 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 })
  if (!PHOTO_TYPES.includes(file.type)) return NextResponse.json({ error: 'Format harus JPG, PNG, atau WebP.' }, { status: 400 })
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Ukuran foto maksimal 3 MB.' }, { status: 400 })
  const bytes = Buffer.from(await file.arrayBuffer())
  // L-03: periksa isi berkas, bukan hanya MIME dari klien.
  if (!matchesMagicBytes(bytes, file.type)) return NextResponse.json({ error: 'Isi berkas tidak sesuai format gambar.' }, { status: 400 })

  const pathname = `laporan/${randomBytes(16).toString('hex')}.${EXT[file.type]}`
  try {
    // M-03: fail-closed — bila put privat gagal, JANGAN jatuh ke publik.
    await put(pathname, bytes, { access: 'private', contentType: file.type, addRandomSuffix: false })
  } catch {
    return NextResponse.json({ error: 'Foto belum dapat diunggah.' }, { status: 500 })
  }
  await pool.query(`INSERT INTO public.laporan_foto_unggahan (pathname, user_id) VALUES ($1, $2)`, [pathname, user.id])
  return NextResponse.json({ pathname })
}
