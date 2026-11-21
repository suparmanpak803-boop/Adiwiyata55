import { NextResponse, after } from 'next/server'
import { STATUS_IDS, syncReports, updateReports } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireStaff(request, { mutating: true })
  if ('response' in auth) return auth.response
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown; status?: unknown; alasan?: unknown } | null
    const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.map(String))].filter((id) => /^\d{1,15}$/.test(id)).slice(0, 100) : []
    const status = typeof body?.status === 'string' ? body.status : ''
    if (!ids.length || !(STATUS_IDS as readonly string[]).includes(status)) return NextResponse.json({ error: 'Pilih laporan dan status yang valid.' }, { status: 400 })
    const updated = await updateReports(ids, { status, alasan: typeof body?.alasan === 'string' ? body.alasan : '' }, auth.user)
    if (updated.length) {
      const origin = new URL(request.url).origin
      after(async () => { await syncReports(origin, updated).catch(() => null) })
    }
    return NextResponse.json({ ok: true, diperbarui: updated.length })
  } catch (error) {
    return errorResponse(error)
  }
}
