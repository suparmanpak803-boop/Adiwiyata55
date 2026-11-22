import { NextResponse } from 'next/server'
import { requirePortalRole } from '@/lib/auth/access'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const definitions = {
  kuis: {
    table: 'kuis_soal',
    columns: ['pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'jawaban', 'penjelasan', 'kategori', 'tingkat_kesulitan', 'link_video', 'aktif'],
    required: ['pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'jawaban'],
  },
  sampah: {
    table: 'item_sampah',
    columns: ['nama', 'emoji', 'gambar_url', 'jenis', 'penjelasan', 'tingkat_kesulitan', 'aktif'],
    required: ['nama', 'jenis'],
  },
  misi: {
    table: 'misi_mingguan',
    columns: ['judul', 'deskripsi', 'poin', 'mulai', 'selesai', 'aktif'],
    required: ['judul', 'mulai', 'selesai'],
  },
  video: {
    table: 'video_edukasi',
    columns: ['judul', 'youtube_url', 'youtube_id', 'kategori', 'deskripsi', 'durasi', 'tampil', 'urutan'],
    required: ['judul', 'youtube_url', 'youtube_id'],
  },
} as const

type ContentType = keyof typeof definitions

type InputRecord = Record<string, unknown>

class InputValidationError extends Error {
  name = 'InputValidationError'
}

function json(data: unknown, status = 200) {
  return NextResponse.json(status >= 400
    ? { galat: true, kode: status === 401 ? 'BELUM_LOGIN' : status === 403 ? 'AKSES_DITOLAK' : 'KONTEN_GAGAL', pesan: typeof data === 'string' ? data : 'Permintaan belum dapat diproses.', error: typeof data === 'string' ? data : 'Permintaan belum dapat diproses.' }
    : { galat: false, data }, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

function parseYouTubeId(value: string) {
  try {
    const url = new URL(value)
    const id = url.hostname === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : ''
  } catch {
    return ''
  }
}

// PERBAIKAN (B-02): saat update (isUpdate), kolom `required` yang tidak
// dikirim TIDAK wajib ada — sebelumnya tombol Aktifkan/Nonaktifkan
// selalu gagal 400 karena validate() menuntut semua kolom create.
// PERBAIKAN (B-06): pengecekan jenis memakai Object.hasOwn, bukan
// `in`, agar 'constructor'/'__proto__' tidak lolos validasi.
function validate(type: ContentType, source: InputRecord, isUpdate = false): InputRecord {
  const definition = definitions[type]
  const record: InputRecord = {}
  for (const key of definition.columns) if (source[key] !== undefined) record[key] = source[key]
  for (const key of definition.required) {
    if (isUpdate && !(key in record)) continue
    if (typeof record[key] !== 'string' || !(record[key] as string).trim()) throw new InputValidationError(`Kolom ${key.replaceAll('_', ' ')} wajib diisi.`)
    record[key] = (record[key] as string).trim()
  }

  if (type === 'kuis') {
    if (record.jawaban !== undefined && !['a', 'b', 'c', 'd'].includes(String(record.jawaban))) throw new InputValidationError('Kunci jawaban harus a, b, c, atau d.')
    if (record.tingkat_kesulitan !== undefined && !['mudah', 'sedang', 'sulit'].includes(String(record.tingkat_kesulitan))) throw new InputValidationError('Tingkat kesulitan tidak valid.')
  }
  if (type === 'sampah') {
    if (record.jenis !== undefined && !['organik', 'anorganik', 'kertas', 'residu', 'b3'].includes(String(record.jenis))) throw new InputValidationError('Jenis sampah tidak valid.')
    if (record.tingkat_kesulitan !== undefined && !['mudah', 'sedang', 'sulit'].includes(String(record.tingkat_kesulitan))) throw new InputValidationError('Tingkat kesulitan tidak valid.')
    if (record.gambar_url && (typeof record.gambar_url !== 'string' || !/^https:\/\//.test(record.gambar_url))) throw new InputValidationError('Tautan gambar harus menggunakan HTTPS.')
  }
  if (type === 'misi') {
    if (record.poin !== undefined) {
      const points = Number(record.poin)
      if (!Number.isInteger(points) || points < 0 || points > 10000) throw new InputValidationError('Poin misi harus antara 0 dan 10.000.')
      record.poin = points
    }
    if (record.mulai !== undefined || record.selesai !== undefined) {
      const start = Date.parse(String(record.mulai ?? ''))
      const end = Date.parse(String(record.selesai ?? ''))
      if ((record.mulai !== undefined && !Number.isFinite(start)) || (record.selesai !== undefined && !Number.isFinite(end))) throw new InputValidationError('Periode misi tidak valid.')
      if (Number.isFinite(start) && Number.isFinite(end) && end < start) throw new InputValidationError('Periode misi tidak valid.')
    }
  }
  if (type === 'video') {
    if (record.youtube_url !== undefined) {
      const youtubeId = parseYouTubeId(String(record.youtube_url))
      if (!youtubeId) throw new InputValidationError('Tautan YouTube tidak valid.')
      record.youtube_id = youtubeId
    }
    if (record.urutan !== undefined) record.urutan = Number.isInteger(Number(record.urutan)) ? Number(record.urutan) : 0
  }
  for (const key of ['aktif', 'tampil']) if (record[key] !== undefined && typeof record[key] !== 'boolean') throw new InputValidationError('Status aktif harus berupa pilihan ya/tidak.')
  return record
}

async function audit(actorId: string, action: string, type: ContentType, id: string | null) {
  await pool.query(
    `INSERT INTO public.log_aktivitas (actor_id, aksi, detail) VALUES ($1, $2, $3::jsonb)`,
    [actorId, `game_content_${action}`, JSON.stringify({ type, id })],
  ).catch(() => undefined)
}

async function readBody(request: Request): Promise<InputRecord | null> {
  const text = await request.text()
  if (!text || text.length > 1_000_000) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as InputRecord : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    await requirePortalRole(['admin'])
    const type = new URL(request.url).searchParams.get('jenis') as ContentType | null
    if (!type || !Object.hasOwn(definitions, type)) return json('Jenis konten tidak dikenal.', 400)
    const { table } = definitions[type]
    const order = type === 'video' ? 'urutan, judul' : type === 'misi' ? 'mulai DESC' : 'dibuat_pada DESC'
    const result = await pool.query(`SELECT * FROM public.${table} ORDER BY ${order} LIMIT 500`)
    return json(result.rows)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'UNAUTHORIZED') return json('Silakan login kembali.', 401)
    if (message === 'FORBIDDEN') return json('Akses hanya untuk Admin.', 403)
    console.error('[api/admin/game/content GET]', error)
    return json('Konten belum dapat dimuat. Coba lagi.', 500)
  }
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json('Permintaan tidak valid.', 403)
  try {
    const user = await requirePortalRole(['admin'])
    const body = await readBody(request)
    if (!body) return json('Data permintaan tidak valid atau terlalu besar.', 400)
    const type = body.jenis as ContentType
    if (!type || !Object.hasOwn(definitions, type)) return json('Jenis konten tidak dikenal.', 400)

    if (body.aksi === 'impor') {
      if ((type !== 'kuis' && type !== 'sampah') || !Array.isArray(body.baris) || body.baris.length > 500) return json('Impor hanya mendukung maksimal 500 soal atau item sampah.', 400)
      const { table, columns } = definitions[type]
      const client = await pool.connect()
      let imported = 0
      let rejected = 0
      try {
        await client.query('BEGIN')
        for (const row of body.baris) {
          let data: InputRecord
          try {
            data = validate(type, row as InputRecord)
          } catch {
            rejected += 1
            continue
          }
          const keys = Object.keys(data).filter((key) => (columns as readonly string[]).includes(key))
          const values = keys.map((key) => data[key])
          const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
          const result = await client.query(`INSERT INTO public.${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values)
          if (result.rowCount) imported += 1
          else rejected += 1
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined)
        throw error
      } finally {
        client.release()
      }
      await audit(user.id, 'import', type, null)
      return json({ imported, rejected })
    }

    const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null
    if (body.id && !id) return json('ID konten tidak valid.', 400)
    const data = validate(type, body.data as InputRecord ?? {}, Boolean(id))
    const { table, columns } = definitions[type]
    let savedId = id
    if (id) {
      const keys = Object.keys(data).filter((key) => (columns as readonly string[]).includes(key))
      if (!keys.length) return json('Tidak ada perubahan yang disimpan.', 400)
      const assignments = keys.map((key, index) => `${key} = $${index + 1}`).join(', ')
      const values = keys.map((key) => data[key])
      values.push(id)
      const result = await pool.query(`UPDATE public.${table} SET ${assignments}, diubah_pada = now() WHERE id = $${values.length} RETURNING id`, values)
      if (!result.rowCount) return json('Konten tidak ditemukan.', 404)
    } else {
      if (type === 'kuis' || type === 'misi' || type === 'video') data.dibuat_oleh = user.id
      const keys = Object.keys(data).filter((key) => (columns as readonly string[]).includes(key) || key === 'dibuat_oleh')
      const values = keys.map((key) => data[key])
      const result = await pool.query(`INSERT INTO public.${table} (${keys.join(', ')}) VALUES (${keys.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING id`, values)
      savedId = result.rows[0]?.id ?? null
    }
    await audit(user.id, id ? 'update' : 'create', type, savedId)
    return json({ id: savedId })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'UNAUTHORIZED') return json('Silakan login kembali.', 401)
    if (message === 'FORBIDDEN') return json('Akses hanya untuk Admin.', 403)
    if (error instanceof InputValidationError) return json(message, 400)
    if (message.includes('duplicate key')) return json('Konten serupa sudah tersimpan.', 409)
    console.error('[api/admin/game/content POST]', error)
    return json('Konten gagal disimpan karena gangguan server. Coba lagi.', 500)
  }
}

export async function DELETE(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json('Permintaan tidak valid.', 403)
  try {
    const user = await requirePortalRole(['admin'])
    const body = await readBody(request)
    const type = body?.jenis as ContentType
    const id = typeof body?.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : ''
    if (!type || !Object.hasOwn(definitions, type) || !id) return json('Data penghapusan tidak valid.', 400)
    const result = await pool.query(`DELETE FROM public.${definitions[type].table} WHERE id = $1 RETURNING id`, [id])
    if (!result.rowCount) return json('Konten tidak ditemukan.', 404)
    await audit(user.id, 'delete', type, id)
    return json({ id })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'UNAUTHORIZED') return json('Silakan login kembali.', 401)
    if (message === 'FORBIDDEN') return json('Akses hanya untuk Admin.', 403)
    console.error('[api/admin/game/content DELETE]', error)
    return json('Konten belum dapat dihapus. Coba lagi.', 500)
  }
}
