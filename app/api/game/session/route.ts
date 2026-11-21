import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { ensureStarterGameContent } from '@/lib/game-content-seed'
import { GAME_KEYS, resetLeaderboardIfDue, type GameKey } from '@/lib/leaderboard-data'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const SESSION_GRACE_SECONDS = 30

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  try {
    const user = await getPortalUser()
    if (!user) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
    const body = await request.json().catch(() => null) as { gameKey?: unknown } | null
    const gameKey = typeof body?.gameKey === 'string' ? body.gameKey : ''
    if (!GAME_KEYS.includes(gameKey as GameKey)) return NextResponse.json({ error: 'Game tidak dikenal.' }, { status: 400 })
    const allowed = await allowRequest(`sesi:${user.id}`, 20, 60).catch((error) => {
      console.error('[api/game/session rate-limit]', error)
      return true
    })
    if (!allowed) return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' }, { status: 429 })

    await resetLeaderboardIfDue().catch(() => false)
    await pool.query(
      `INSERT INTO public.game_settings (game_key) SELECT unnest($1::text[]) ON CONFLICT (game_key) DO NOTHING`,
      [GAME_KEYS],
    )
    const settings = await pool.query<{ aktif: boolean; durasi_detik: number; tingkat_kesulitan: number; konfigurasi: Record<string, unknown> }>(
      `SELECT aktif, durasi_detik, tingkat_kesulitan, konfigurasi FROM public.game_settings WHERE game_key = $1`, [gameKey],
    )
    const config = settings.rows[0]
    if (!config?.aktif) return NextResponse.json({ error: 'Game ini sedang dinonaktifkan Admin.' }, { status: 403 })

    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    let sessionState: unknown = null
    let playerQuestions: { id: string; question: string; options: { key: string; text: string }[] }[] | undefined
    let playerItems: { id: string; name: string; emoji: string; imageUrl: string | null }[] | undefined
    let sessionDuration = config.durasi_detik
    let questionSeconds = 20
    if (gameKey === 'kuis_adiwiyata') {
      const configuredQuestionCount = Number(config.konfigurasi?.jumlah_soal ?? 10)
      const configuredQuestionSeconds = Number(config.konfigurasi?.waktu_per_soal ?? 20)
      const questionCount = Number.isInteger(configuredQuestionCount) ? Math.max(5, Math.min(20, configuredQuestionCount)) : 10
      questionSeconds = Number.isInteger(configuredQuestionSeconds) ? Math.max(5, Math.min(20, configuredQuestionSeconds)) : 20
      sessionDuration = questionCount * questionSeconds
      const category = typeof config.konfigurasi?.kategori === 'string' && config.konfigurasi.kategori.trim() ? config.konfigurasi.kategori.trim() : null
      const difficulty = typeof config.konfigurasi?.tingkat_kesulitan === 'string' && config.konfigurasi.tingkat_kesulitan.trim() ? config.konfigurasi.tingkat_kesulitan.trim() : null
      await ensureStarterGameContent('kuis_adiwiyata')
      const result = await pool.query<{ id: string; pertanyaan: string; opsi_a: string; opsi_b: string; opsi_c: string; opsi_d: string; jawaban: string; penjelasan: string }>(
        `SELECT id, pertanyaan, opsi_a, opsi_b, opsi_c, opsi_d, jawaban, penjelasan
         FROM public.kuis_soal WHERE aktif = true AND ($1::text IS NULL OR kategori = $1)
           AND ($2::text IS NULL OR tingkat_kesulitan = $2)
         ORDER BY random() LIMIT $3`, [category, difficulty, questionCount],
      )
      if (result.rows.length < questionCount) return NextResponse.json({ error: `Soal aktif belum mencukupi. Tersedia ${result.rows.length} dari ${questionCount}; hubungi Admin.` }, { status: 409 })
      const plans = result.rows.map((row) => {
        const keys = ['a', 'b', 'c', 'd'].sort(() => Math.random() - 0.5)
        const options = keys.map((key) => ({ key, text: row[`opsi_${key}` as 'opsi_a' | 'opsi_b' | 'opsi_c' | 'opsi_d'] }))
        return { id: row.id, answer: row.jawaban, options, explanation: row.penjelasan }
      })
      sessionState = { quiz: { questionSeconds, questions: plans, answers: [] } }
      playerQuestions = result.rows.map((row, index) => ({ id: row.id, question: row.pertanyaan, options: plans[index].options }))
    }
    await pool.query(
      `INSERT INTO public.game_sessions (user_id, game_key, token_hash, kedaluwarsa_pada, log_aksi)
       VALUES ($1, $2, $3, now() + ($4 || ' seconds')::interval, $5::jsonb)`,
      [user.id, gameKey, tokenHash, String(sessionDuration + SESSION_GRACE_SECONDS + 600), JSON.stringify(sessionState ?? [])],
    )
    return NextResponse.json({ token, durasiDetik: sessionDuration, tingkatKesulitan: config.tingkat_kesulitan, ...(playerQuestions ? { questions: playerQuestions, waktuPerSoal: questionSeconds } : {}), ...(playerItems ? { items: playerItems } : {}) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[api/game/session POST]', error)
    return NextResponse.json({ error: 'Server game sedang mengalami gangguan. Coba lagi beberapa saat.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
