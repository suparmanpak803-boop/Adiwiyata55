import { NextResponse } from 'next/server'
import { listStaff } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireStaff(request, { adminOnly: true })
  if ('response' in auth) return auth.response
  try {
    return NextResponse.json({ staff: await listStaff() })
  } catch (error) {
    return errorResponse(error)
  }
}
