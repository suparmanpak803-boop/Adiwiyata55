'use client'

import { useEffect, useRef, useState } from 'react'
import { BINS, WASTE_ITEMS, type Bin } from '@/lib/waste-items'
import { SessionShell, useGameSession } from './game-session'

const W = 360, H = 480, BASKET_W = 84, BASKET_Y = H - 34
type Falling = { x: number; y: number; vy: number; name: string; bin: Bin }

export function TangkapSampah({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number) => void }) {
  const session = useGameSession('tangkap_sampah', onFinished)
  const { phase, duration, start, push, finish } = session
  const canvas = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ score: 0, lives: 3, bin: BINS[0].label, left: 60 })

  useEffect(() => { void start() }, [start])

  useEffect(() => {
    if (phase !== 'main') return
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    const startTime = Date.now()
    let basketX = W / 2, direction = 0, activeIndex = Math.floor(Math.random() * BINS.length)
    let nextBinAt = 15, nextSpawn = 0.6, lastFrame = performance.now()
    let score = 0, streak = 0, lives = 3, ended = false, raf = 0
    const items: Falling[] = []
    setHud({ score: 0, lives: 3, bin: BINS[activeIndex].label, left: duration })

    const fail = () => {
      push({ ok: false }); streak = 0; lives -= 1
      setHud((h) => ({ ...h, lives }))
      if (lives <= 0) end()
    }
    const end = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); void finish() }

    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      basketX = Math.min(W - BASKET_W / 2, Math.max(BASKET_W / 2, ((event.clientX - rect.left) * W) / rect.width))
    }
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') { direction = -1; event.preventDefault() }
      if (event.key === 'ArrowRight') { direction = 1; event.preventDefault() }
    }
    const keyUp = (event: KeyboardEvent) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') direction = 0 }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerdown', move)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrame) / 1000)
      lastFrame = now
      const elapsed = (Date.now() - startTime) / 1000
      if (elapsed >= duration) return end()
      if (elapsed >= nextBinAt) {
        let next = activeIndex
        while (next === activeIndex) next = Math.floor(Math.random() * BINS.length)
        activeIndex = next; nextBinAt += 15
        setHud((h) => ({ ...h, bin: BINS[activeIndex].label }))
      }
      const active = BINS[activeIndex]
      if (elapsed >= nextSpawn) {
        const matching = WASTE_ITEMS.filter((i) => i.bin === active.id), other = WASTE_ITEMS.filter((i) => i.bin !== active.id)
        const pool = Math.random() < 0.5 ? matching : other
        const item = pool[Math.floor(Math.random() * pool.length)]
        items.push({ x: 50 + Math.random() * (W - 100), y: -14, vy: Math.min(300, 110 + elapsed * 3), name: item.name, bin: item.bin })
        nextSpawn = elapsed + Math.max(0.9, 1.5 - elapsed / 90)
      }
      basketX = Math.min(W - BASKET_W / 2, Math.max(BASKET_W / 2, basketX + direction * 300 * dt))

      for (let i = items.length - 1; i >= 0; i -= 1) {
        const item = items[i]
        item.y += item.vy * dt
        const caught = item.y >= BASKET_Y - 12 && item.y <= BASKET_Y + 10 && Math.abs(item.x - basketX) < BASKET_W / 2 + 28
        if (caught) {
          items.splice(i, 1)
          if (item.bin === active.id) {
            streak += 1; score += 10 + Math.min(streak - 1, 5) * 2
            push({ ok: true }); setHud((h) => ({ ...h, score }))
          } else fail()
        } else if (item.y > H + 10) {
          items.splice(i, 1)
          if (item.bin === active.id) fail()
        }
        if (ended) return
      }

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#e8f1e3'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = active.color; ctx.fillRect(0, 0, W, 6)
      ctx.font = '600 11px sans-serif'; ctx.textAlign = 'center'
      for (const item of items) {
        const color = BINS.find((b) => b.id === item.bin)?.color ?? '#555'
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = color; ctx.lineWidth = 2
        ctx.beginPath(); ctx.roundRect(item.x - 50, item.y - 12, 100, 24, 8); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#1d2b1d'; ctx.fillText(item.name, item.x, item.y + 4)
      }
      ctx.fillStyle = active.color
      ctx.beginPath(); ctx.roundRect(basketX - BASKET_W / 2, BASKET_Y, BASKET_W, 22, 6); ctx.fill()
      ctx.fillStyle = '#ffffff'; ctx.font = '700 11px sans-serif'; ctx.fillText(active.label, basketX, BASKET_Y + 15)
      setHud((h) => { const left = Math.max(0, Math.ceil(duration - elapsed)); return h.left === left ? h : { ...h, left } })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      ended = true; cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', move)
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp)
    }
  }, [phase, duration, push, finish])

  return (
    <SessionShell session={session} onExit={onExit} title="Permainan selesai">
      <section className="game-stage">
        <div className="game-hud"><span>Skor <b>{hud.score}</b></span><span>Nyawa <b>{hud.lives}</b></span><span>Waktu <b>{hud.left}s</b></span></div>
        <p className="game-hint">Tangkap sampah jenis <b>{hud.bin}</b>. Geser keranjang dengan mouse, sentuhan, atau tombol panah.</p>
        <canvas ref={canvas} width={W} height={H} className="game-canvas" aria-label="Area permainan Tangkap Sampah" />
      </section>
    </SessionShell>
  )
}
