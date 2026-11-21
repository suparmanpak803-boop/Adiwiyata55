import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePortalRole } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { appSettings } from '@/lib/db/schema'
import { parseAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content'
import { getAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content.server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

function accessError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (message === 'UNAUTHORIZED') return response({ error: 'Silakan masuk kembali.' }, 401)
  if (message === 'FORBIDDEN') return response({ error: 'Akses hanya untuk Admin.' }, 403)
  return null
}

export async function GET() {
  try {
    await requirePortalRole(['admin'])
    return response({ content: await getAdiwiyataSiteContent() })
  } catch (error) {
    const authResponse = accessError(error)
    if (authResponse) return authResponse
    console.error('[api/admin/adiwiyata/informasi GET]', error)
    return response({ error: 'Informasi belum dapat dimuat. Coba lagi.' }, 500)
  }
}

export async function PUT(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return response({ error: 'Permintaan tidak valid.' }, 403)
  }

  try {
    const user = await requirePortalRole(['admin'])
    const raw = await request.text()
    if (!raw || raw.length > 1_000_000) return response({ error: 'Data terlalu besar atau kosong.' }, 400)

    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return response({ error: 'Format data tidak valid.' }, 400)
    }

    const input = body && typeof body === 'object' ? (body as { content?: unknown }).content : undefined
    const content = parseAdiwiyataSiteContent(input)
    if (!content) return response({ error: 'Isi setiap kolom dengan teks valid (maksimal 3.000 karakter) dan lengkapi judul setiap item.' }, 400)

    await db.insert(appSettings).values({
      key: 'adiwiyata_site_content',
      value: content,
      diubahOleh: user.id,
    }).onConflictDoUpdate({
      target: appSettings.key,
      set: { value: content, diubahOleh: user.id, diubahPada: new Date() },
    })

    revalidatePath('/adiwiyata')
    revalidatePath('/adiwiyata/[section]', 'page')
    return response({ content })
  } catch (error) {
    const authResponse = accessError(error)
    if (authResponse) return authResponse
    console.error('[api/admin/adiwiyata/informasi PUT]', error)
    return response({ error: 'Perubahan belum berhasil disimpan. Coba lagi.' }, 500)
  }
}
