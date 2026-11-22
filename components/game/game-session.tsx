'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { CountUp } from '@/components/animations'
import { readJsonResponse } from '@/lib/api-client'

export type SessionResult = { skor: number; poin: number; rekorBaru: boolean; peringkat: number | null; ditinjau: boolean }
type Phase = 'memuat' | 'main' | 'menyimpan' | 'selesai' | 'galat'
type Entry = { ok?: boolean; sisa?: number; v?: number }
type SessionPayload = Record<string, unknown> & { token: string; durasiDetik: number }

export function useGameSession(gameKey: string, onFinished: (score: number) => void) {
  const [phase, setPhase] = useState<Phase>('memuat')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<SessionResult | null>(null)
  const [duration, setDuration] = useState(60)
  const [sessionData, setSessionData] = useState<SessionPayload | null>(null)
  const token = useRef('')
  const startedAt = useRef(0)
  const log = useRef<({ t: number } & Entry)[]>([])
  const finishing = useRef(false)

  const start = useCallback(async () => {
    setPhase('memuat'); setMessage(''); setResult(null); setSessionData(null)
    log.current = []; finishing.current = false
    try {
      const response = await fetch('/api/game/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameKey }) })
      const body = await readJsonResponse<SessionPayload & { error?: unknown }>(response)
      // Server mengembalikan { error } bila gagal (mis. game nonaktif,
      // soal belum cukup, atau gangguan server). Tampilkan pesan aslinya
      // agar tidak tertutup pesan generik di bawah.
      if (!response.ok || typeof body.error === 'string') throw new Error(typeof body.error === 'string' && body.error.trim() ? body.error : `Gagal memulai game (${response.status}).`)
      if (typeof body.token !== 'string' || typeof body.durasiDetik !== 'number') throw new Error('Respons sesi game tidak lengkap.')
      token.current = body.token
      setSessionData(body)
      setDuration(body.durasiDetik)
      startedAt.current = Date.now()
      setPhase('main')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Game belum dapat dimulai.')
      setPhase('galat')
    }
  }, [gameKey])

  const push = useCallback((entry: Entry) => { log.current.push({ t: Date.now() - startedAt.current, ...entry }) }, [])

  const finish = useCallback(async () => {
    if (finishing.current) return
    finishing.current = true
    setPhase('menyimpan')
    try {
      const response = await fetch('/api/game/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token.current, log: log.current }) })
      const body = await readJsonResponse<Record<string, unknown> & { error?: unknown }>(response)
      if (!response.ok || typeof body.error === 'string') throw new Error(typeof body.error === 'string' && body.error.trim() ? body.error : `Gagal menyimpan skor (${response.status}).`)
      if (typeof body.skor !== 'number' || typeof body.poin !== 'number') throw new Error('Respons skor tidak lengkap.')
      setResult(body as unknown as SessionResult)
      onFinished(body.skor)
      setPhase('selesai')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Skor belum dapat disimpan.')
      setPhase('galat')
    }
  }, [onFinished])

  const elapsed = useCallback(() => Date.now() - startedAt.current, [])
  return { phase, message, result, duration, sessionData, start, push, finish, elapsed }
}

export type Session = ReturnType<typeof useGameSession>

export function SessionShell({ session, onExit, title = 'Selesai', children }: { session: Session; onExit: () => void; title?: string; children: ReactNode }) {
  const { phase, message, result, start } = session
  if (phase === 'memuat') return <section className="game-stage"><p>Menyiapkan permainan…</p></section>
  if (phase === 'menyimpan') return <section className="game-stage"><p>Menyimpan skor…</p></section>
  if (phase === 'galat') return <section className="game-stage" role="alert"><p>{message}</p><div className="game-actions"><button className="game-play" onClick={() => void start()}>Coba lagi</button><button className="game-ghost" onClick={onExit}>Kembali</button></div></section>
  if (phase === 'selesai' && result) return (
    <section className="game-stage" aria-live="polite">
      <h2>{title}</h2>
      <p className="game-big"><CountUp value={result.skor} /></p>
      <p>{result.ditinjau ? 'Skor ini sedang ditinjau dan belum menambah poin.' : `+${result.poin} poin${result.rekorBaru ? ' · Rekor baru!' : ''}${result.peringkat ? ` · Peringkat #${result.peringkat}` : ''}`}</p>
      <div className="game-actions"><button className="game-play" onClick={() => void start()}>Main lagi</button><a className="game-ghost" href="/leaderboard">Leaderboard</a><button className="game-ghost" onClick={onExit}>Menu game</button></div>
    </section>
  )
  return <>{children}</>
}
