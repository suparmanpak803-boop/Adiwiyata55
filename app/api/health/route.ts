// Pemeriksaan kesehatan: hanya menyatakan apakah database produksi
// dapat dihubungi. Daftar tabel HANYA untuk admin (I-01) — sebelumnya
// publik dan memetakan inventaris skema ke siapa saja.
// Tidak mengembalikan isi data, pesan error, atau nilai environment.
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { getPortalUser } from '@/lib/auth/access'
import { allowRequest, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Tabel yang wajib ada agar game (dan fitur lain) bisa jalan.
// Sama dengan daftar di /api/admin/diagnostik.
const requiredTables: Record<string, string> = {
  users: 'neon_auth.user', master_kelas: 'adiwiyata_classes', data_sampah: 'adiwiyata_deposits',
  kuis_soal: 'kuis_soal', item_sampah: 'item_sampah', misi_mingguan: 'misi_mingguan', video_edukasi: 'video_edukasi',
  game_settings: 'game_settings', app_settings: 'app_settings', game_sessions: 'game_sessions', game_scores: 'game_scores',
  leaderboard_periods: 'leaderboard_periods', leaderboard_settings: 'leaderboard_settings', laporan: 'laporan', slider_slides: 'slider_slides',
  dokumen: 'adiwiyata_documents', peran_pengguna: 'adiwiyata_user_roles',
}

export async function GET(request: Request) {
  try {
    // B-13: batas laju pemeriksaan kesehatan (30/menit per IP).
    if (!(await allowRequest(`health:${getClientIp(request)}`, 30, 60))) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
    }
    await pool.query('SELECT 1')
    const user = await getPortalUser().catch(() => null)
    if (user?.role !== 'admin') {
      return NextResponse.json(
        { status: 'ok', db: 'connected' },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    const tables = await pool.query<{ table_schema: string; table_name: string }>(
      `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public', 'neon_auth') AND table_type = 'BASE TABLE'`,
    )
    const present = new Set(tables.rows.map((row) => `${row.table_schema}.${row.table_name}`))
    const status: Record<string, boolean> = {}
    for (const [label, qualifiedName] of Object.entries(requiredTables)) {
      status[label] = present.has(qualifiedName.includes('.') ? qualifiedName : `public.${qualifiedName}`)
    }
    return NextResponse.json(
      { status: 'ok', db: 'connected', tables: status },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'disconnected' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
