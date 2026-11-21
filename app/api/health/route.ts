// Pemeriksaan kesehatan publik (tanpa login): hanya menyatakan apakah
// database produksi dapat dihubungi dan apakah data game sudah ada.
// Tidak mengembalikan isi data, pesan error, atau nilai environment.
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await pool.query('SELECT 1')
    let games: number | null = null
    try {
      const result = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM public.game_settings')
      games = Number(result.rows[0]?.count ?? 0)
    } catch {
      games = null
    }
    return NextResponse.json(
      { status: 'ok', db: 'connected', games },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'disconnected' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
