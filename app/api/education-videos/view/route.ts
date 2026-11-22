import { NextResponse } from 'next/server'
import { readJsonResponse } from '@/lib/api-client'
import { getAppsScriptConfig } from '@/lib/sheets-config'
import { allowRequest, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function normalizeText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : ''
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin !== new URL(request.url).origin) return NextResponse.json({ success: false }, { status: 403 })
  // M-06: batas laju berbasis Postgres (bukan Map in-memory yang tidak
  // berlaku antar instance serverless) dan IP tepercaya — entri TERAKHIR
  // X-Forwarded-For yang ditambahkan Vercel, bukan entri pertama yang
  // bisa diputar pengirim.
  if (!(await allowRequest(`video-view:${getClientIp(request)}`, 60, 60))) return NextResponse.json({ success: false }, { status: 429 })

  try {
    const body = await request.json() as { videoId?: unknown; title?: unknown }
    const videoId = normalizeText(body.videoId, 11)
    const title = normalizeText(body.title, 160)
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !title) return NextResponse.json({ success: false }, { status: 400 })

    const { url, token } = await getAppsScriptConfig()
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'record_video_view', token, videoId, title }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    const result = await readJsonResponse<{ success?: boolean }>(response)
    if (!result.success) return NextResponse.json({ success: false }, { status: 502 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 503 })
  }
}
