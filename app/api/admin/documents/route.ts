import { del, put } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { adiwiyataDocuments } from '@/lib/db/schema'
import { getPortalUser } from '@/lib/auth/access'
import { matchesMagicBytes } from '@/lib/file-magic'
import { allowRequest } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const maxFileSize = 4 * 1024 * 1024
const allowedTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
])

function textValue(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Hanya admin yang dapat mengelola dokumen.' }, { status: 403 })
  // B-04: batas laju unggah dokumen (30/menit per admin) — sebelumnya
  // satu-satunya mutasi admin tanpa rate limit.
  if (!(await allowRequest(`dokumen-unggah:${user.id}`, 30, 60))) return NextResponse.json({ error: 'Terlalu banyak unggahan. Coba lagi sebentar.' }, { status: 429 })

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const title = textValue(formData.get('title'), 160)
    const description = textValue(formData.get('description'), 500)
    const category = textValue(formData.get('category'), 80) || 'Umum'

    if (!(file instanceof File) || file.size < 1 || file.size > maxFileSize) {
      return NextResponse.json({ error: 'Pilih berkas hingga 4 MB.' }, { status: 400 })
    }
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: 'Format yang didukung: PDF, gambar, Word, Excel, atau PowerPoint.' }, { status: 400 })
    }
    // L-03: periksa isi berkas, bukan hanya MIME dari klien.
    const bytes = Buffer.from(await file.arrayBuffer())
    if (!matchesMagicBytes(bytes, file.type)) {
      return NextResponse.json({ error: 'Isi berkas tidak sesuai format yang dipilih.' }, { status: 400 })
    }
    if (!title) return NextResponse.json({ error: 'Judul dokumen wajib diisi.' }, { status: 400 })

    const safeName = file.name.normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(-120) || 'dokumen'
    const blob = await put(`adiwiyata-documents/${safeName}`, bytes, { access: 'public', addRandomSuffix: true })

    try {
      const [document] = await db.insert(adiwiyataDocuments).values({
        title,
        description,
        category,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        contentType: file.type,
        fileSize: file.size,
        uploadedBy: user.id,
      }).returning({ id: adiwiyataDocuments.id })

      return NextResponse.json({ success: true, id: document.id })
    } catch (error) {
      await del(blob.url).catch(() => undefined)
      throw error
    }
  } catch (error) {
    console.error('Document upload failed:', error)
    return NextResponse.json({ error: 'Dokumen belum berhasil diunggah. Silakan coba lagi.' }, { status: 500 })
  }
}
