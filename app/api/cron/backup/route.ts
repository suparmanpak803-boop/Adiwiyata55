// Backup harian database Adiwiyata55 (JSON terkompresi).
//
// Dipanggil oleh pekerjaan terjadwal dari luar (bukan oleh Vercel Cron):
//   GET /api/cron/backup  dengan header  Authorization: Bearer <CRON_SECRET>
// Tanpa token yang benar -> 401, tanpa isi data.
//
// H-02: cadangan TIDAK PERNAH memuat tabel kredensial/sesi
// (neon_auth.session, neon_auth.verification, neon_auth.account), dan
// tabel neon_auth.user hanya diekspor kolom amannya (tanpa kolom
// password/token/hash). Token dibandingkan secara timing-safe dan
// pemanggilan dibatasi 5/jam per IP.
//
// Isi: seluruh tabel lain di skema public + neon_auth (ditemukan otomatis
// lewat information_schema, jadi tabel baru ikut tercadangkan), masing-
// masing sebagai larik baris. Kolom bytea (gambar slider) ikut sebagai
// base64 kecuali bila satu nilainya di atas 5 MB — yang itu dilewati
// dan dicatat di `notes`. Tanggal dinormalisasi ke string ISO.
//
// Skema tabel TIDAK ikut di sini — skema lengkap ada di repo
// (db/semua-migrasi.sql). Jadi cadangan = file ini + repo = pulih penuh.
// File hasil unduhan diberi nama adiwiyata55-backup-YYYY-MM-DD.json.gz
// dan disimpan ke Google Drive oleh pekerjaan terjadwal.
import { gzipSync } from 'node:zlib'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { allowRequest, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTEA_BYTES = 5 * 1024 * 1024

// Tabel kredensial/sesi: tidak pernah masuk cadangan.
const SENSITIVE_TABLES = new Set([
  'neon_auth.session',
  'neon_auth.verification',
  'neon_auth.account',
])

function isValidToken(header: string | null, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false
  const given = Buffer.from(header.slice(7))
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

// Kolom aman neon_auth.user: semua kolom kecuali yang berbau kredensial
// (nama kolom diambil dari information_schema, jadi aman walau skema
// auth berubah). Bila tidak ada kolom aman, kembalikan '*' agar cadangan
// tidak gagal total — tabel user tidak menyimpan kata sandi.
async function safeUserColumns(): Promise<string> {
  try {
    const cols = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'neon_auth' AND table_name = 'user' ORDER BY ordinal_position`,
    )
    const safe = cols.rows.map((row) => row.column_name).filter((name) => !/password|secret|token|hash|salt/i.test(name))
    if (!safe.length) return '*'
    return safe.map((name) => `"${name.replace(/"/g, '""')}"`).join(', ')
  } catch {
    return '*'
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || !isValidToken(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Tidak diizinkan.' }, { status: 401 })
  }
  if (!(await allowRequest(`cron-backup:${getClientIp(request)}`, 5, 3600))) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan backup.' }, { status: 429 })
  }

  try {
    const tables = await pool.query<{ table_schema: string; table_name: string }>(
      `SELECT table_schema, table_name FROM information_schema.tables
       WHERE table_schema IN ('public', 'neon_auth') AND table_type = 'BASE TABLE'
       ORDER BY table_schema, table_name`,
    )

    const data: Record<string, unknown[]> = {}
    const notes: string[] = []
    let skippedBytea = 0

    for (const { table_schema, table_name } of tables.rows) {
      const qualified = `"${table_schema}"."${table_name}"`
      const key = `${table_schema}.${table_name}`
      if (SENSITIVE_TABLES.has(key)) {
        notes.push(`Tabel ${key} dilewati (berisi kredensial/sesi).`)
        continue
      }
      try {
        const columns = key === 'neon_auth.user' ? await safeUserColumns() : '*'
        const result = await pool.query(`SELECT ${columns} FROM ${qualified}`)
        data[`${table_schema}.${table_name}`] = result.rows.map((row: Record<string, unknown>) => {
          const out: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(row)) {
            if (Buffer.isBuffer(value)) {
              if (value.byteLength > MAX_BYTEA_BYTES) {
                skippedBytea += 1
                out[key] = null
              } else {
                out[key] = { __bytea_base64: value.toString('base64') }
              }
            } else if (value instanceof Date) {
              out[key] = value.toISOString()
            } else {
              out[key] = value
            }
          }
          return out
        })
      } catch (error) {
        notes.push(`Tabel ${table_schema}.${table_name} gagal dibaca, dilewati.`)
        console.error('[api/cron/backup] tabel dilewati:', qualified, error)
      }
    }
    if (skippedBytea > 0) {
      notes.push(`${skippedBytea} nilai bytea di atas 5 MB dilewati (tidak masuk cadangan).`)
    }

    const payload = JSON.stringify({
      app: 'adiwiyata55',
      format: 'adiwiyata55-backup-json/1',
      exported_at: new Date().toISOString(),
      tables: data,
      notes,
    })
    const gz = gzipSync(payload)
    // Pencatatan cadangan (best-effort): satu baris ke public.backup_log
    // agar /admin/diagnostik bisa menampilkan kapan cadangan terakhir
    // dibuat. Kegagalan INSERT (mis. tabel belum dibuat) TIDAK BOLEH
    // menggagalkan respons cadangan — hanya dicatat di log server.
    try {
      await pool.query(
        `INSERT INTO public.backup_log (ukuran_byte, jumlah_tabel, status, catatan) VALUES ($1, $2, 'berhasil', $3)`,
        [gz.byteLength, Object.keys(data).length, notes.join(' ')],
      )
    } catch (error) {
      console.error('[api/cron/backup] backup_log gagal dicatat:', error)
    }
    const stamp = new Date().toISOString().slice(0, 10)
    return new Response(gz, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="adiwiyata55-backup-${stamp}.json.gz"`,
        'Content-Length': String(gz.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[api/cron/backup]', error)
    return NextResponse.json({ error: 'Backup gagal.' }, { status: 500 })
  }
}
