import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { GAME_RULES, pointsFromScore, type GameAction } from '@/lib/game-scoring'
import { GAME_KEYS, resetLeaderboardIfDue, type GameKey } from '@/lib/leaderboard-data'
import { allowRequest } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function parseStoredQuizLog(value: unknown): GameAction[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const quiz = (value as { quiz?: { questions?: unknown; answers?: unknown } }).quiz
  if (!Array.isArray(quiz?.questions) || !Array.isArray(quiz.answers) || quiz.answers.length !== quiz.questions.length) return null
  return quiz.answers.every((answer) => answer && typeof answer === 'object' && typeof (answer as Record<string, unknown>).t === 'number' && typeof (answer as Record<string, unknown>).ok === 'boolean' && typeof (answer as Record<string, unknown>).sisa === 'number')
    ? quiz.answers as GameAction[]
    : null
}

function parseLog(value: unknown): GameAction[] | null {
  if (!Array.isArray(value) || value.length > 500) return null
  const log: GameAction[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const { t, ok, sisa, v } = item as Record<string, unknown>
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) return null
    log.push({ t, ok: ok === true, sisa: typeof sisa === 'number' ? sisa : undefined, v: typeof v === 'number' ? v : undefined })
  }
  return log.every((action, index) => index === 0 || action.t >= log[index - 1].t) ? log : null
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 403 })
  if (Number(request.headers.get('content-length') ?? 0) > 60_000) return NextResponse.json({ error: 'Data terlalu besar.' }, { status: 413 })
  let user: NonNullable<Awaited<ReturnType<typeof getPortalUser>>>
  try {
    const authenticatedUser = await getPortalUser()
    if (!authenticatedUser) return NextResponse.json({ error: 'Silakan masuk terlebih dahulu.' }, { status: 401 })
    user = authenticatedUser
    if (!(await allowRequest(`skor:${user.id}`, 10, 60))) return NextResponse.json({ error: 'Terlalu banyak pengiriman skor. Coba lagi sebentar.' }, { status: 429 })
  } catch (cause) {
    console.error('[api/game/score auth]', cause)
    return NextResponse.json({ error: 'Layanan autentikasi belum dapat dihubungi.' }, { status: 503 })
  }

  const body = await request.json().catch(() => null) as { token?: unknown; log?: unknown } | null
  const token = typeof body?.token === 'string' && body.token.length < 100 ? body.token : ''
  const log = parseLog(body?.log)
  if (!token || !log) return NextResponse.json({ error: 'Data skor tidak valid.' }, { status: 400 })

  await resetLeaderboardIfDue().catch(() => false)
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const client = await pool.connect().catch((cause) => {
    console.error('[api/game/score database]', cause)
    return null
  })
  if (!client) return NextResponse.json({ error: 'Database belum dapat dihubungi. Coba lagi sebentar.' }, { status: 503 })
  try {
    await client.query('BEGIN')
    const session = await client.query<{ id: string; game_key: string; dimulai_pada: string; durasi: number; log_aksi: unknown }>(
      `UPDATE public.game_sessions s SET dipakai = true,
         log_aksi = CASE WHEN s.game_key = 'kuis_adiwiyata' THEN s.log_aksi ELSE $3::jsonb END
       WHERE s.token_hash = $1 AND s.user_id = $2 AND s.dipakai = false AND s.kedaluwarsa_pada > now()
       RETURNING s.id, s.game_key, s.dimulai_pada::text, s.log_aksi, EXTRACT(EPOCH FROM (now() - s.dimulai_pada))::int AS durasi`,
      [tokenHash, user.id, JSON.stringify(log)],
    )
    const row = session.rows[0]
    if (!row) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Sesi game tidak valid atau sudah dipakai.' }, { status: 400 }) }
    const gameKey = row.game_key as GameKey
    const rule = GAME_KEYS.includes(gameKey) ? GAME_RULES[gameKey] : undefined
    if (!rule) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Penilaian game ini belum tersedia.' }, { status: 501 }) }
    const verifiedLog = gameKey === 'kuis_adiwiyata' ? parseStoredQuizLog(row.log_aksi) : log
    if (!verifiedLog) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Jawaban kuis belum lengkap atau tidak valid.' }, { status: 409 }) }

    const config = await client.query<{ durasi_detik: number; konfigurasi: Record<string, unknown> }>(`SELECT durasi_detik, konfigurasi FROM public.game_settings WHERE game_key = $1`, [gameKey])
    const savedConfig = config.rows[0]
    const quizDuration = Math.max(1, Math.min(20, Number(savedConfig?.konfigurasi?.jumlah_soal ?? 10))) * Math.max(5, Math.min(20, Number(savedConfig?.konfigurasi?.waktu_per_soal ?? 20)))
    const allowedDuration = gameKey === 'kuis_adiwiyata' ? quizDuration + 30 : (savedConfig?.durasi_detik ?? 60) + 30
    const lastAction = verifiedLog.length ? verifiedLog[verifiedLog.length - 1].t / 1000 : 0
    if (row.durasi < rule.minDuration || lastAction > allowedDuration + 600 || lastAction > row.durasi + 5) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Skor ditolak karena durasi permainan tidak wajar.' }, { status: 422 })
    }
    const result = rule.score(verifiedLog, row.durasi)
    if (result.skor > rule.maxScore(Math.min(row.durasi, allowedDuration))) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Skor ditolak karena melebihi batas wajar.' }, { status: 422 })
    }
    const points = pointsFromScore(result.skor, rule.maxPoints)
    const period = await client.query<{ period_id: string }>(`SELECT period_id FROM public.leaderboard_settings WHERE id = true`)
    const periodId = period.rows[0]?.period_id
    if (!periodId) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Periode leaderboard belum siap.' }, { status: 503 }) }

    const previousBest = await client.query<{ best: number | null }>(
      `SELECT MAX(skor) AS best FROM public.game_scores WHERE user_id = $1 AND game_key = $2 AND mencurigakan = false`, [user.id, gameKey],
    )
    await client.query(
      `INSERT INTO public.game_scores (user_id, game_key, skor, poin_didapat, durasi_detik, level, period_id, mencurigakan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [user.id, gameKey, result.skor, points, row.durasi, result.level, periodId, result.mencurigakan],
    )
    if (!result.mencurigakan) {
      await client.query(`UPDATE public.adiwiyata_user_roles SET total_poin = total_poin + $2, updated_at = now() WHERE user_id = $1`, [user.id, points])
    } else {
      await client.query(`INSERT INTO public.log_aktivitas (actor_id, aksi, detail) VALUES ($1, 'skor_mencurigakan', $2::jsonb)`, [user.id, JSON.stringify({ gameKey, skor: result.skor })])
    }
    const rank = await client.query<{ peringkat: number | null }>(
      `WITH best AS (
         SELECT user_id, game_key, MAX(skor) AS skor FROM public.game_scores
         WHERE period_id = $1 AND mencurigakan = false GROUP BY user_id, game_key
       ), totals AS (SELECT user_id, SUM(skor) AS skor FROM best GROUP BY user_id),
       ranked AS (SELECT user_id, DENSE_RANK() OVER (ORDER BY skor DESC)::int AS peringkat FROM totals)
       SELECT peringkat FROM ranked WHERE user_id = $2`, [periodId, user.id],
    )
    await client.query('COMMIT')
    return NextResponse.json({
      skor: result.skor, poin: result.mencurigakan ? 0 : points, level: result.level,
      rekorBaru: !result.mencurigakan && result.skor > (previousBest.rows[0]?.best ?? 0),
      rekorPribadi: Math.max(result.skor, previousBest.rows[0]?.best ?? 0),
      peringkat: rank.rows[0]?.peringkat ?? null, ditinjau: result.mencurigakan,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    await client.query('ROLLBACK').catch(() => undefined)
    return NextResponse.json({ error: 'Skor belum dapat disimpan.' }, { status: 500 })
  } finally {
    client.release()
  }
}
