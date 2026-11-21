import { NextResponse, after } from 'next/server'
import { getSummary, listReports, parseFilters, syncReports } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireStaff(request)
  if ('response' in auth) return auth.response
  try {
    const filters = parseFilters(new URL(request.url).searchParams)
    const [list, summary] = await Promise.all([listReports(filters, auth.user), getSummary(auth.user)])
    // Coba ulang data tertunda di latar belakang agar sinkronisasi pulih otomatis.
    if (auth.user.role === 'admin' && summary.tertunda > 0) {
      const origin = new URL(request.url).origin
      after(async () => { await syncReports(origin).catch(() => null) })
    }
    return NextResponse.json({ ...list, summary }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}
