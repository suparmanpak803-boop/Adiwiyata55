import { NextResponse, after } from 'next/server'
import { STATUS_IDS, syncReports, updateReports } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'
import { allowRequest } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request-body'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireStaff(request, { mutating: true })
  if ('response' in auth) return auth.response
  try {
    // B-04: batas laju ubah massal laporan (30/menit per staf).
    if (!(await allowRequest(`admin-laporan-bulk:${auth.user.id}`, 30, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })
    const parsed = await readJsonBody<{ ids?: unknown; status?: unknown; alasan?: unknown }>(request)
    if (!parsed.ok) return NextResponse.json({ error: parsed.reason === 'too_large' ? 'Data terlalu besar.' : 'Data tidak valid.' }, { status: parsed.reason === 'too_large' ? 413 : 400 })
    const body = parsed.data
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
