import { get } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
  const pathname = request.nextUrl.searchParams.get('pathname') ?? ''
  if (!/^laporan\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(pathname)) return new NextResponse('Not found', { status: 404 })

  const allowed = await pool.query(
    `SELECT 1 FROM public.laporan_foto_unggahan WHERE pathname = $1 AND user_id = $2
     UNION ALL SELECT 1 FROM public.laporan_foto f JOIN public.laporan l ON l.id = f.laporan_id
       WHERE f.pathname = $1 AND (l.user_id = $2 OR $3 = 'admin' OR (l.anonim = false AND $3 = 'petugas')) LIMIT 1`,
    [pathname, user.id, user.role],
  )
  if (!allowed.rowCount) return new NextResponse('Not found', { status: 404 })

  const ifNoneMatch = request.headers.get('if-none-match') ?? undefined
  let result = await get(pathname, { access: 'private', ifNoneMatch }).catch(() => null)
  if (!result) result = await get(pathname, { access: 'public', ifNoneMatch }).catch(() => null)
  if (!result) return new NextResponse('Not found', { status: 404 })
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
  return new NextResponse(result.stream, { headers: { 'Content-Type': result.blob.contentType, ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
}
