// Penjaga route admin laporan: siapa boleh masuk, dan bagaimana
// error dijawab. Dipakai 8 route app/api/admin/laporan/**.
//
// requireStaff mengembalikan { user } bila lolos, atau { response }
// (401 bila belum login, 403 bila bukan staf / bukan admin / origin
// tidak cocok untuk mutasi). errorResponse memetakan error dari
// lib/laporan-admin: pesan + status yang dilekatkan withStatus(),
// UNAUTHORIZED -> 401, FORBIDDEN -> 403, sisanya 500.
import { NextResponse } from 'next/server'
import { getPortalUser, type PortalUser } from '@/lib/auth/access'

export async function requireStaff(
  request: Request,
  opts?: { mutating?: boolean; adminOnly?: boolean },
): Promise<{ user: PortalUser } | { response: NextResponse }> {
  const user = await getPortalUser().catch(() => null)
  if (!user) {
    return { response: NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 }) }
  }
  if (user.role === 'pengunjung' || (opts?.adminOnly && user.role !== 'admin')) {
    return { response: NextResponse.json({ error: 'Akses hanya untuk staf Adiwiyata.' }, { status: 403 }) }
  }
  if (opts?.mutating) {
    const origin = request.headers.get('origin')
    if (origin !== new URL(request.url).origin) {
      return { response: NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 }) }
    }
  }
  return { user }
}

export function errorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : ''
  if (message === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'Silakan masuk kembali.' }, { status: 401 })
  }
  if (message === 'FORBIDDEN') {
    return NextResponse.json({ error: 'Akses tidak diizinkan.' }, { status: 403 })
  }
  const status = (error as { status?: unknown } | null)?.status
  if (typeof status === 'number' && [400, 401, 403, 404, 409, 422, 429, 503].includes(status)) {
    return NextResponse.json({ error: message || 'Permintaan tidak valid.' }, { status })
  }
  console.error('[api/admin/laporan]', error)
  return NextResponse.json({ error: 'Terjadi gangguan. Coba lagi beberapa saat.' }, { status: 500 })
}
