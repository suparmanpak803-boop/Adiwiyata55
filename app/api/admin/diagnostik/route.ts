import { NextResponse } from 'next/server'
import { requirePortalRole } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'
import { repairDatabase } from '@/lib/db-repair'
import { seedGameDefaults } from '@/lib/game-content-seed'
import { seedKegiatanMedia } from '@/lib/kegiatan-media-seed'
import { jalankanPergantianTahunAjaran, pratinjauPergantianTahunAjaran, pulihkanCadanganXI } from '@/lib/tahun-ajaran'
import { readJsonBody } from '@/lib/request-body'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const requiredTables: Record<string, string> = {
  users: 'neon_auth.user', master_kelas: 'adiwiyata_classes', data_sampah: 'adiwiyata_deposits',
  kuis_soal: 'kuis_soal', item_sampah: 'item_sampah', misi_mingguan: 'misi_mingguan', video_edukasi: 'video_edukasi',
  game_settings: 'game_settings', app_settings: 'app_settings', game_sessions: 'game_sessions', game_scores: 'game_scores',
  leaderboard_periods: 'leaderboard_periods', leaderboard_settings: 'leaderboard_settings', laporan: 'laporan', slider_slides: 'slider_slides',
  struktur_petugas: 'struktur_petugas', hari_libur: 'hari_libur', arsip_tahun_ajaran: 'arsip_tahun_ajaran', backup_log: 'backup_log',
}

function respond(data: unknown, status = 200) {
  return NextResponse.json(status >= 400
    ? { galat: true, kode: status === 401 ? 'BELUM_LOGIN' : status === 403 ? 'AKSES_DITOLAK' : 'DIAGNOSTIK_GAGAL', pesan: typeof data === 'string' ? data : 'Permintaan belum dapat diproses.' }
    : { galat: false, data }, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function GET() {
  const startedAt = Date.now()
  try {
    await requirePortalRole(['admin'])
    await pool.query('SELECT 1')
    const tables = await pool.query<{ table_schema: string; table_name: string }>(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public','neon_auth') AND table_type = 'BASE TABLE'`)
    const present = new Set(tables.rows.map((row) => `${row.table_schema}.${row.table_name}`))
    const checks = Object.entries(requiredTables).map(([label, qualifiedName]) => ({ label, table: qualifiedName, ready: present.has(qualifiedName.includes('.') ? qualifiedName : `public.${qualifiedName}`) }))
    let activePeriod: { id: string; startedAt: string | null } | null = null
    if (present.has('public.leaderboard_settings') && present.has('public.leaderboard_periods')) {
      const period = await pool.query<{ id: string | null; mulai: string | null }>(`SELECT p.id, p.mulai::text AS mulai FROM public.leaderboard_settings s LEFT JOIN public.leaderboard_periods p ON p.id = s.period_id WHERE s.id = true`)
      if (period.rows[0]?.id) activePeriod = { id: period.rows[0].id, startedAt: period.rows[0].mulai }
    }
    // Ukuran database + 8 tabel terbesar + cadangan terakhir (semua
    // read-only). Batas paket gratis Neon: 1 GB/proyek. Bila query ini
    // gagal, halaman tetap tampil tanpa bagian ukuran/cadangan.
    let ukuranDatabase: { ukuranByte: number; batasByte: number; tabelTerbesar: { skema: string; tabel: string; ukuranByte: number }[] } | null = null
    let cadanganTerakhir: { dijalankanPada: string; ukuranByte: number; jumlahTabel: number; status: string; catatan: string } | null = null
    try {
      const ukuran = await pool.query<{ ukuran: string }>(`SELECT pg_database_size(current_database()) AS ukuran`)
      const terbesar = await pool.query<{ table_schema: string; table_name: string; ukuran: string }>(
        `SELECT table_schema, table_name, pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name)) AS ukuran
         FROM information_schema.tables
         WHERE table_schema IN ('public', 'neon_auth') AND table_type = 'BASE TABLE'
         ORDER BY ukuran DESC LIMIT 8`,
      )
      ukuranDatabase = {
        ukuranByte: Number(ukuran.rows[0]?.ukuran ?? 0),
        batasByte: 1073741824,
        tabelTerbesar: terbesar.rows.map((row) => ({ skema: row.table_schema, tabel: row.table_name, ukuranByte: Number(row.ukuran) })),
      }
      if (present.has('public.backup_log')) {
        const terakhir = await pool.query<{ dijalankan_pada: Date | string; ukuran_byte: string; jumlah_tabel: number; status: string; catatan: string }>(
          `SELECT dijalankan_pada, ukuran_byte, jumlah_tabel, status, catatan FROM public.backup_log ORDER BY dijalankan_pada DESC LIMIT 1`,
        )
        const baris = terakhir.rows[0]
        if (baris) {
          cadanganTerakhir = {
            dijalankanPada: baris.dijalankan_pada instanceof Date ? baris.dijalankan_pada.toISOString() : String(baris.dijalankan_pada),
            ukuranByte: Number(baris.ukuran_byte ?? 0),
            jumlahTabel: baris.jumlah_tabel ?? 0,
            status: baris.status ?? '',
            catatan: baris.catatan ?? '',
          }
        }
      }
    } catch (error) {
      console.error('[api/admin/diagnostik GET] ukuran/cadangan', error)
    }
    return respond({ database: { connected: true, responseMs: Date.now() - startedAt }, tables: checks, activePeriod, ukuranDatabase, cadanganTerakhir })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'UNAUTHORIZED') return respond('Silakan login kembali.', 401)
    if (message === 'FORBIDDEN') return respond('Halaman ini hanya untuk Admin.', 403)
    console.error('[api/admin/diagnostik GET]', error)
    return respond('Diagnostik database belum dapat dimuat.', 503)
  }
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return respond('Permintaan tidak valid.', 403)
  try {
    const user = await requirePortalRole(['admin'])
    // B-04: batas laju aksi diagnostik berat (10/menit per admin).
    if (!(await allowRequest(`admin-diagnostik:${user.id}`, 10, 60))) return respond('Terlalu banyak permintaan. Coba lagi sebentar.', 429)
    const parsed = await readJsonBody<{ aksi?: unknown; paksa?: unknown; tahunAjaran?: unknown }>(request)
    if (!parsed.ok) return respond(parsed.reason === 'too_large' ? 'Data terlalu besar.' : 'Data tidak valid.', parsed.reason === 'too_large' ? 413 : 400)
    const body = parsed.data
    if (body?.aksi === 'pratinjau_tahun_ajaran') {
      const pratinjau = await pratinjauPergantianTahunAjaran()
      return respond(pratinjau)
    }
    if (body?.aksi === 'jalankan_tahun_ajaran') {
      const hasil = await jalankanPergantianTahunAjaran({ paksa: body?.paksa === true })
      return respond(hasil)
    }
    if (body?.aksi === 'pulihkan_cadangan_tahun_ajaran') {
      const tahunAjaran = typeof body?.tahunAjaran === 'string' ? body.tahunAjaran : undefined
      const hasil = await pulihkanCadanganXI(tahunAjaran ? { tahunAjaran } : {})
      return respond(hasil)
    }
    if (body?.aksi === 'perbaiki_tabel') {
      const result = await repairDatabase()
      return respond(result)
    }
    if (body?.aksi === 'tambah_media_kegiatan') {
      const media = await seedKegiatanMedia(user.id)
      return respond(media)
    }
    if (body?.aksi !== 'buat_data_awal') return respond('Tindakan diagnostik tidak dikenal.', 400)
    const seed = await seedGameDefaults(user.id)
    return respond(seed)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'UNAUTHORIZED') return respond('Silakan login kembali.', 401)
    if (message === 'FORBIDDEN') return respond('Tindakan ini hanya untuk Admin.', 403)
    console.error('[api/admin/diagnostik POST]', error)
    return respond('Data awal belum dapat dibuat. Periksa koneksi database.', 500)
  }
}
