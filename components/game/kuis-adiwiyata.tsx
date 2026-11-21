'use client'

import { useEffect, useRef, useState } from 'react'
import { readJsonResponse } from '@/lib/api-client'
import { SessionShell, useGameSession } from './game-session'

type Prepared = { id: string; q: string; options: { key: string; text: string }[]; correctIndex: number | null; explanation: string }
type QuizAnswer = { correct: boolean; correctOptionKey: string; explanation: string; remaining: number; completed: boolean }

export function KuisAdiwiyata({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number) => void }) {
  const session = useGameSession('kuis_adiwiyata', onFinished)
  const { phase, start, finish, sessionData } = session
  const [questions, setQuestions] = useState<Prepared[]>([])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [left, setLeft] = useState(20)
  const [questionSeconds, setQuestionSeconds] = useState(20)
  const [correct, setCorrect] = useState(0)
  const [answerError, setAnswerError] = useState('')
  const [answering, setAnswering] = useState(false)
  const answeringRef = useRef(false)
  const askedAt = useRef(0)

  useEffect(() => { void start() }, [start])
  useEffect(() => {
    if (phase !== 'main') return
    const payload = sessionData?.questions
    if (!Array.isArray(payload) || !payload.length) return
    setQuestions(payload.map((entry) => {
      const question = entry as { id: string; question: string; options: { key: string; text: string }[] }
      return { id: question.id, q: question.question, options: question.options, correctIndex: null, explanation: '' }
    }))
    const seconds = typeof sessionData?.waktuPerSoal === 'number' ? sessionData.waktuPerSoal : 20
    setQuestionSeconds(seconds); setIndex(0); setChosen(null); setRevealed(false); setCorrect(0); setLeft(seconds); setAnswerError('')
    answeringRef.current = false
    askedAt.current = Date.now()
  }, [phase, sessionData])

  async function answer(option: number | null) {
    const current = questions[index]
    if (revealed || answeringRef.current || !current) return
    answeringRef.current = true; setAnswering(true); setAnswerError(''); setChosen(option)
    try {
      const response = await fetch('/api/game/quiz-answer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sessionData?.token, questionId: current.id, optionKey: option === null ? null : current.options[option]?.key }),
      })
      const body = await readJsonResponse<QuizAnswer>(response)
      const correctIndex = current.options.findIndex((item) => item.key === body.correctOptionKey)
      setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, correctIndex, explanation: body.explanation } : item))
      setChosen(option); setRevealed(true)
      if (body.correct) setCorrect((count) => count + 1)
    } catch (cause) {
      setAnswerError(cause instanceof Error ? cause.message : 'Jawaban belum dapat diperiksa. Coba lagi.')
      answeringRef.current = false
    } finally {
      setAnswering(false)
    }
  }

  useEffect(() => {
    if (phase !== 'main' || revealed || answering || !questions.length) return
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(questionSeconds - (Date.now() - askedAt.current) / 1000))
      setLeft(remaining)
      if (remaining <= 0) { window.clearInterval(timer); void answer(null) }
    }, 250)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed, answering, index, questions, questionSeconds])

  function next() {
    if (index >= questions.length - 1) { void finish(); return }
    setIndex(index + 1); setChosen(null); setRevealed(false); setLeft(questionSeconds); setAnswerError('')
    answeringRef.current = false
    askedAt.current = Date.now()
  }

  const current = questions[index]
  return (
    <SessionShell session={session} onExit={onExit} title="Kuis selesai">
      {current && (
        <section className="game-stage">
          <div className="game-hud"><span>Soal <b>{index + 1}/{questions.length}</b></span><span>Benar <b>{correct}</b></span><span>Waktu <b>{revealed ? '-' : `${left}s`}</b></span></div>
          <h2 className="game-question">{current.q}</h2>
          <div className="game-options" role="group" aria-label="Pilihan jawaban">
            {current.options.map((option, i) => {
              const state = revealed ? (i === current.correctIndex ? 'right' : i === chosen ? 'wrong' : '') : ''
              return <button key={option.key} type="button" className={`game-option ${state}`} disabled={revealed || answering} onClick={() => void answer(i)}>{option.text}</button>
            })}
          </div>
          {answerError && <p role="alert">{answerError} <button className="game-ghost" type="button" onClick={() => void answer(chosen)}>Coba periksa lagi</button></p>}
          {answering && <p role="status">Memeriksa jawaban…</p>}
          {revealed && (
            <div className="game-explain" aria-live="polite">
              <p><b>{chosen === current.correctIndex ? 'Benar!' : chosen === null ? 'Waktu habis.' : 'Kurang tepat.'}</b> {current.explanation}</p>
              <p><a href="/edukasi" target="_blank" rel="noreferrer">Pelajari lebih lanjut di Edukasi</a></p>
              <button className="game-play" type="button" onClick={next}>{index >= questions.length - 1 ? 'Lihat hasil' : 'Soal berikutnya'}</button>
            </div>
          )}
        </section>
      )}
      {phase === 'main' && !current && <section className="game-stage" role="alert"><p>Soal kuis belum dapat dimuat. Hubungi Admin.</p><button className="game-ghost" type="button" onClick={onExit}>Kembali</button></section>}
    </SessionShell>
  )
}
