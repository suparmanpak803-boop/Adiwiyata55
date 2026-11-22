import { NextResponse } from 'next/server'
import { syncReports } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const auth = await requireStaff(request, { mutating: true, adminOnly: true })
  if ('response' in auth) return auth.response
  // B-04: batas laju sinkronisasi ke Apps Script (10/menit per admin).
  if (!(await allowRequest(`admin-laporan-sync:${auth.user.id}`, 10, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
  try {
    const result = await syncReports(new URL(request.url).origin)
    return NextResponse.json(result, { status: result.skipped ? 503 : result.failed ? 502 : 200 })
  } catch (error) {
    return errorResponse(error)
  }
}
