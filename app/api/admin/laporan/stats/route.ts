import { NextResponse } from 'next/server'
import { getStats } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireStaff(request, { adminOnly: true })
  if ('response' in auth) return auth.response
  try {
    return NextResponse.json(await getStats(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}
