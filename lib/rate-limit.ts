// Pembatas laju sederhana berbasis Postgres (tabel public.rate_limits,
// sudah ada di migrasi). Dipakai semua route game & laporan.
// Mengembalikan true bila permintaan masih dalam batas, false bila
// sudah mencapai limit dalam jendela (caller menjawab 429).
// Bila tabel/DB sedang tidak bisa diakses, kembalikan true (fail-open)
// agar satu gangguan DB tidak mematikan seluruh fitur — KECUALI bila
// caller memakai opts.failClosed (dipakai endpoint sensitif: skor game
// dan laporan), yang mengembalikan false agar proteksi tidak mati
// diam-diam saat DB bermasalah (M-07).
import { pool } from '@/lib/db'

export async function allowRequest(key: string, limit: number, windowSeconds: number, opts?: { failClosed?: boolean }): Promise<boolean> {
  try {
    // jendela bertipe timestamptz: awal jendela saat ini (epoch dibulatkan
    // ke bawah per windowSeconds). Satu baris per (kunci, awal jendela).
    const result = await pool.query<{ jumlah: number }>(
      `INSERT INTO public.rate_limits (kunci, jendela, jumlah)
         VALUES ($1, to_timestamp((EXTRACT(EPOCH FROM now())::bigint / $2) * $2), 1)
       ON CONFLICT (kunci, jendela)
         DO UPDATE SET jumlah = public.rate_limits.jumlah + 1
       RETURNING jumlah`,
      [key, windowSeconds],
    )
    return (result.rows[0]?.jumlah ?? 1) <= limit
  } catch (error) {
    console.error('[rate-limit]', error)
    return opts?.failClosed ? false : true
  }
}

// IP klien tepercaya untuk kunci rate limit: Vercel menambahkan IP asli
// di AKHIR X-Forwarded-For. Entri pertama dikontrol pengirim, jadi
// jangan pernah dipakai sebagai kunci (M-06).
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : 'unknown'
}
