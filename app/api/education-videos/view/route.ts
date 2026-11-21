import { NextResponse } from 'next/server'
import { readJsonResponse } from '@/lib/api-client'
import { getAppsScriptConfig } from '@/lib/sheets-config'

export const dynamic = 'force-dynamic'

const viewWindows = new Map<string, { count: number; resetAt: number }>()

function normalizeText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : ''
}

export async function POST(request: Request) {
  const address = (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown').slice(0, 100)
  const now = Date.now()
  if (viewWindows.size > 2000) {
    for (const [key, value] of viewWindows) {
      if (value.resetAt <= now) viewWindows.delete(key)
      if (viewWindows.size <= 1500) break
    }
  }
  if (viewWindows.size >= 2000 && !viewWindows.has(address)) return NextResponse.json({ success: false }, { status: 429 })
  const window = viewWindows.get(address)
  if (window && window.resetAt > now && window.count >= 60) return NextResponse.json({ success: false }, { status: 429 })
  if (!window || window.resetAt <= now) viewWindows.set(address, { count: 1, resetAt: now + 60_000 })
  else window.count += 1

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
