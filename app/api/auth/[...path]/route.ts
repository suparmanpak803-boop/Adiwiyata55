import { NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth/server'
import { allowRequest, getClientIp } from '@/lib/rate-limit'

type AuthRouteContext = { params: Promise<{ path: string[] }> }

// M-04: batas laju untuk endpoint auth (brute-force login / spam OTP).
// 60/menit per IP — cukup longgar untuk banyak pengguna di balik satu
// NAT sekolah, tapi menghentikan banjir. Lockout akun dan wajib
// verifikasi email tetap harus diaktifkan di dashboard Neon Auth,
// karena route ini hanya proxy ke SDK dan tidak melihat isi request.
async function checkAuthRateLimit(request: Request): Promise<NextResponse | null> {
  if (!(await allowRequest(`auth:${getClientIp(request)}`, 60, 60))) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan masuk. Coba lagi sebentar.' }, { status: 429 })
  }
  return null
}

export async function GET(request: Request, context: AuthRouteContext) {
  const limited = await checkAuthRateLimit(request)
  if (limited) return limited
  return getAuth().handler().GET(request, context)
}

export async function POST(request: Request, context: AuthRouteContext) {
  const limited = await checkAuthRateLimit(request)
  if (limited) return limited
  return getAuth().handler().POST(request, context)
}

export async function PUT(request: Request, context: AuthRouteContext) {
  const limited = await checkAuthRateLimit(request)
  if (limited) return limited
  return getAuth().handler().PUT(request, context)
}

export async function PATCH(request: Request, context: AuthRouteContext) {
  const limited = await checkAuthRateLimit(request)
  if (limited) return limited
  return getAuth().handler().PATCH(request, context)
}

export async function DELETE(request: Request, context: AuthRouteContext) {
  const limited = await checkAuthRateLimit(request)
  if (limited) return limited
  return getAuth().handler().DELETE(request, context)
}
