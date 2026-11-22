import { NextResponse, after } from 'next/server'
import { deleteReport, getReportDetail, syncReports, updateReports, type ReportPatch } from '@/lib/laporan-admin'
import { errorResponse, requireStaff } from '@/lib/laporan-admin-guard'
import { readJsonBody } from '@/lib/request-body'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(request)
  if ('response' in auth) return auth.response
  try {
    const { id } = await params
    const detail = await getReportDetail(id, auth.user)
    if (!detail) return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 })
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(request, { mutating: true })
  if ('response' in auth) return auth.response
  try {
    const { id } = await params
    if (!/^\d{1,15}$/.test(id)) return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 })
    const parsed = await readJsonBody<Record<string, unknown>>(request)
    if (!parsed.ok) return NextResponse.json({ error: parsed.reason === 'too_large' ? 'Data terlalu besar.' : 'Data tidak valid.' }, { status: parsed.reason === 'too_large' ? 413 : 400 })
    const body = parsed.data as Record<string, unknown> | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
    const patch: ReportPatch = {}
    if (typeof body.status === 'string') patch.status = body.status
    if (typeof body.alasan === 'string') patch.alasan = body.alasan
    if (typeof body.tanggapan === 'string') patch.tanggapan = body.tanggapan
    if (typeof body.catatanInternal === 'string') patch.catatanInternal = body.catatanInternal
    if (body.penanggungJawab === null || typeof body.penanggungJawab === 'string') patch.penanggungJawab = body.penanggungJawab as string | null
    if (typeof body.saranTerbaik === 'boolean') patch.saranTerbaik = body.saranTerbaik
    const updated = await updateReports([id], patch, auth.user)
    if (updated.length) {
      const origin = new URL(request.url).origin
      after(async () => { await syncReports(origin, updated).catch(() => null) })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff(request, { mutating: true, adminOnly: true })
  if ('response' in auth) return auth.response
  try {
    const { id } = await params
    await deleteReport(id, auth.user)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}
