// Backup harian database Adiwiyata55 (JSON terkompresi).
//
// Dipanggil oleh pekerjaan terjadwal dari luar (bukan oleh Vercel Cron):
//   GET /api/cron/backup  dengan header  Authorization: Bearer <CRON_SECRET>
// Tanpa token yang benar -> 401, tanpa isi data.
//
// Isi: seluruh tabel di skema public + neon_auth (ditemukan otomatis
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
import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTEA_BYTES = 5 * 1024 * 1024

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Tidak diizinkan.' }, { status: 401 })
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
      try {
        const result = await pool.query(`SELECT * FROM ${qualified}`)
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
