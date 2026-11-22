// Koneksi database: satu Pool `pg` dipakai bersama oleh Drizzle (`db`)
// dan query SQL mentah (`pool`). Keduanya harus menunjuk connection
// string yang sama (DATABASE_URL) agar data konsisten.
//
// Keduanya dibuat MALAS (lazy) lewat Proxy: mengimpor modul ini saat
// build tidak boleh gagal hanya karena DATABASE_URL belum diisi.
// Error yang jelas baru dilempar saat query pertama dijalankan.
//
// Env yang dibutuhkan di runtime:
//   DATABASE_URL — connection string Postgres (Neon).
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './db/schema'

type Schema = typeof schema

let poolInstance: Pool | null = null
let dbInstance: NodePgDatabase<Schema> | null = null

function getPool(): Pool {
  if (!poolInstance) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL belum dikonfigurasi. Isi connection string Postgres (Neon) di environment.')
    }
    poolInstance = new Pool({
      connectionString: url,
      // Neon serverless: jangan menahan banyak koneksi idle.
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // M-02: sertifikat TLS Postgres DIVERIFIKASI (sebelumnya
      // rejectUnauthorized: false). Neon memakai sertifikat dari CA
      // publik, jadi verifikasi standar Node sudah cukup. Bila koneksi
      // DB gagal setelah perubahan ini, kembalikan ke false dan catat
      // sebagai risiko yang diterima — jangan diam-diam.
      ssl: { rejectUnauthorized: true },
    })
    poolInstance.on('error', (error) => {
      console.error('[db] idle client error', error)
    })
  }
  return poolInstance
}

function getDb(): NodePgDatabase<Schema> {
  if (!dbInstance) dbInstance = drizzle(getPool(), { schema })
  return dbInstance
}

// `pool` dipakai langsung oleh ~30 route/action dengan pola pg:
// pool.query<T>(sql, params), pool.connect() -> BEGIN/COMMIT/ROLLBACK.
export const pool = new Proxy({} as Pool, {
  get(_target, property) {
    const real = getPool()
    const value = (real as unknown as Record<string | symbol, unknown>)[property]
    return typeof value === 'function' ? value.bind(real) : value
  },
})

// `db` dipakai oleh server action (Drizzle ORM).
export const db = new Proxy({} as NodePgDatabase<Schema>, {
  get(_target, property) {
    const real = getDb()
    const value = (real as unknown as Record<string | symbol, unknown>)[property]
    return typeof value === 'function' ? value.bind(real) : value
  },
})
