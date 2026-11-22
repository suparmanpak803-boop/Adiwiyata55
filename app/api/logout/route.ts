import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Fallback sign-out: expires every Neon Auth cookie on this origin, so the user is signed out
 * even when the upstream sign-out call fails (e.g. an untrusted deployment origin or a network error).
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })

  const store = await cookies()
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  for (const { name } of store.getAll()) {
    if (!name.includes('neon-auth')) continue
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: name.startsWith('__Secure-') || name.startsWith('__Host-') || process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'development' ? 'none' : 'lax',
    })
  }
  return response
}
