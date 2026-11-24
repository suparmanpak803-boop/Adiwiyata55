import { NextResponse } from 'next/server'
import { allowRequest, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Memverifikasi token Cloudflare Turnstile dari halaman masuk/daftar.
// Dipanggil klien sebelum signIn/signUp; token sekali pakai.
export async function POST(request: Request) {
  const ip = getClientIp(request)
  if (!(await allowRequest(`turnstile:${ip}`, 30, 60))) {
    return NextResponse.json(
      { ok: false, error: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.' },
      { status: 429 },
    )
  }

  let token = ''
  try {
    const body = (await request.json()) as { token?: unknown }
    if (typeof body.token === 'string') token = body.token.trim()
  } catch {
    // abaikan — token kosong dijawab 400 di bawah
  }
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Token verifikasi kosong.' }, { status: 400 })
  }

  const result = await verifyTurnstileToken(token, ip)
  return NextResponse.json(
    { ok: result.ok, skipped: result.skipped },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
