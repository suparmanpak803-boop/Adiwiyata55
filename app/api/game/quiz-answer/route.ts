import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { pool } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request-body'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type QuizState = {
  quiz?: {
    questionSeconds?: number
    questions?: { id: string; answer: string; options: { key: string; text: string }[]; explanation: string }[]
    answers?: { questionId: string; optionKey: string | null; t: number; ok: boolean; sisa: number }[]
  }
}

function error(message: string, status: number, code: string) {
  return NextResponse.json({ galat: true, kode: code, pesan: message, error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return error('Permintaan tidak valid.', 403, 'AKSES_DITOLAK')
  let user: Awaited<ReturnType<typeof getPortalUser>>
  try {
    user = await getPortalUser()
    if (!user) return error('Silakan masuk kembali.', 401, 'BELUM_LOGIN')
    if (!(await allowRequest(`kuis-jawaban:${user.id}`, 40, 60, { failClosed: true }))) return error('Terlalu banyak jawaban. Coba lagi sebentar.', 429, 'BATAS_PERMINTAAN')
  } catch (cause) {
    console.error('[api/game/quiz-answer auth]', cause)
    return error('Layanan autentikasi belum dapat dihubungi.', 503, 'AUTENTIKASI_GAGAL')
  }

  try {
    const parsed = await readJsonBody<{ token?: unknown; questionId?: unknown; optionKey?: unknown }>(request)
    if (!parsed.ok) return error(parsed.reason === 'too_large' ? 'Data terlalu besar.' : 'Data tidak valid.', parsed.reason === 'too_large' ? 413 : 400, parsed.reason === 'too_large' ? 'DATA_TERLALU_BESAR' : 'DATA_TIDAK_VALID')
    const body = parsed.data
    const token = typeof body?.token === 'string' && body.token.length < 100 ? body.token : ''
    const questionId = typeof body?.questionId === 'string' && /^[0-9a-f-]{36}$/i.test(body.questionId) ? body.questionId : ''
    const optionKey = body?.optionKey === null ? null : typeof body?.optionKey === 'string' ? body.optionKey : ''
    if (!token || !questionId || (optionKey !== null && !['a', 'b', 'c', 'd'].includes(optionKey))) return error('Jawaban kuis tidak valid.', 400, 'JAWABAN_TIDAK_VALID')

    const tokenHash = createHash('sha256').update(token).digest('hex')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await client.query<{ id: string; dimulai_pada: string; log_aksi: QuizState }>(
        `SELECT id, dimulai_pada, log_aksi FROM public.game_sessions
         WHERE token_hash = $1 AND user_id = $2 AND game_key = 'kuis_adiwiyata'
           AND dipakai = false AND kedaluwarsa_pada > now() FOR UPDATE`, [tokenHash, user.id],
      )
      const session = result.rows[0]
      const quiz = session?.log_aksi?.quiz
      const questions = quiz?.questions
      const answers = quiz?.answers
      if (!session || !questions || !answers) { await client.query('ROLLBACK'); return error('Sesi kuis tidak valid atau telah berakhir.', 409, 'SESI_KUIS_TIDAK_VALID') }
      const previous = answers[answers.length - 1]
      if (previous?.questionId === questionId) {
        const previousQuestion = questions[answers.length - 1]
        if (previous.optionKey !== optionKey || !previousQuestion) { await client.query('ROLLBACK'); return error('Soal ini sudah dijawab.', 409, 'SOAL_SUDAH_DIJAWAB') }
        await client.query('COMMIT')
        return NextResponse.json({ galat: false, correct: previous.ok, correctOptionKey: previousQuestion.answer, explanation: previousQuestion.explanation, remaining: previous.sisa, completed: answers.length === questions.length }, { headers: { 'Cache-Control': 'no-store' } })
      }
      const question = questions[answers.length]
      if (!question || question.id !== questionId) { await client.query('ROLLBACK'); return error('Urutan soal tidak valid. Muat ulang sesi kuis.', 409, 'URUTAN_SOAL_TIDAK_VALID') }
      if (optionKey !== null && !question.options.some((option) => option.key === optionKey)) { await client.query('ROLLBACK'); return error('Pilihan jawaban tidak valid.', 400, 'PILIHAN_TIDAK_VALID') }

      const elapsed = Math.max(0, Date.now() - new Date(session.dimulai_pada).getTime())
      const elapsedInQuestion = Math.max(0, (elapsed - (previous?.t ?? 0)) / 1000)
      const secondsAllowed = Math.max(5, Math.min(20, Number(quiz.questionSeconds ?? 20)))
      const withinTime = elapsedInQuestion <= secondsAllowed
      const remaining = optionKey === null || !withinTime ? 0 : Math.max(0, Math.ceil(secondsAllowed - elapsedInQuestion))
      const correct = optionKey === question.answer && withinTime
      answers.push({ questionId, optionKey, t: elapsed, ok: correct, sisa: correct ? remaining : 0 })
      await client.query(`UPDATE public.game_sessions SET log_aksi = $1::jsonb WHERE id = $2`, [JSON.stringify({ quiz: { questions, answers } }), session.id])
      await client.query('COMMIT')
      return NextResponse.json({ galat: false, correct, correctOptionKey: question.answer, explanation: question.explanation, remaining, completed: answers.length === questions.length }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (cause) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw cause
    } finally {
      client.release()
    }
  } catch (cause) {
    console.error('[api/game/quiz-answer POST]', cause)
    return error('Jawaban belum dapat diperiksa. Coba lagi.', 500, 'JAWABAN_GAGAL')
  }
}
