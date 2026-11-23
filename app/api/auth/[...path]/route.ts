import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'
import { allowRequest, getClientIp } from '@/lib/rate-limit'

type AuthRouteContext = { params: Promise<{ path: string[] }> }

// M-04: batas laju untuk endpoint auth (brute-force login / spam OTP).
// Satu bucket per IP untuk SEMUA endpoint membuat satu pengguna di
// balik NAT sekolah bisa mengunci semua pengguna lain dari semua
// endpoint auth. Karena itu bucket dipisah: endpoint baca sesi
// memakai bucket terpisah 300/menit, supaya lonjakan masuk
// bersamaan (mis. satu kelas login bareng) tidak mengunci pengguna
// yang sudah login. Semua endpoint lain — termasuk endpoint
// kredensial (sign-in, sign-up, lupa/reset kata sandi, verifikasi
// email) dan yang tidak dikenal — tetap memakai bucket ketat 60/menit
// per IP, jadi perlindungan brute-force tidak dilonggarkan.
// Lockout akun dan wajib verifikasi email tetap harus diaktifkan di
// dashboard Neon Auth, karena route ini hanya proxy ke SDK dan tidak
// melihat isi request.
const READ_AUTH_SEGMENTS = new Set([
  'get-session', 'list-sessions', 'revoke-session', 'revoke-sessions',
  'sign-out', 'refresh-token', 'callback',
])

async function checkAuthRateLimit(request: Request, path: string[]): Promise<NextResponse | null> {
  const readOnly = READ_AUTH_SEGMENTS.has(path[0] ?? '')
  const key = readOnly ? `auth-baca:${getClientIp(request)}` : `auth:${getClientIp(request)}`
  const limit = readOnly ? 300 : 60
  if (!(await allowRequest(key, limit, 60))) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan masuk. Coba lagi sebentar.' }, { status: 429 })
  }
  return null
}

export async function GET(request: Request, context: AuthRouteContext) {
  const { path } = await context.params
  const limited = await checkAuthRateLimit(request, path)
  if (limited) return limited
  return getAuth().handler().GET(request, context)
}

export async function POST(request: Request, context: AuthRouteContext) {
  const { path } = await context.params
  const limited = await checkAuthRateLimit(request, path)
  if (limited) return limited
  return getAuth().handler().POST(request, context)
}

export async function PUT(request: Request, context: AuthRouteContext) {
  const { path } = await context.params
  const limited = await checkAuthRateLimit(request, path)
  if (limited) return limited
  return getAuth().handler().PUT(request, context)
}

export async function PATCH(request: Request, context: AuthRouteContext) {
  const { path } = await context.params
  const limited = await checkAuthRateLimit(request, path)
  if (limited) return limited
  return getAuth().handler().PATCH(request, context)
}

export async function DELETE(request: Request, context: AuthRouteContext) {
  const { path } = await context.params
  const limited = await checkAuthRateLimit(request, path)
  if (limited) return limited
  return getAuth().handler().DELETE(request, context)
}
