'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Home, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { BINS, WASTE_ITEMS, type Bin } from '@/lib/waste-items'
import { SessionShell, useGameSession } from './game-session'

const W = 360, H = 480, BASKET_W = 84, BASKET_Y = H - 34
type Falling = { x: number; y: number; vy: number; name: string; bin: Bin }

// Suara dibuat dengan Web Audio API (tanpa file audio): nada pendek untuk
// tangkapan benar, bunyi rendah untuk salah, dan jingle saat mulai/selesai.
// AudioContext dibuat malas (lazy) saat interaksi pertama pengguna, jadi
// tidak ada suara sebelum pengguna menekan tombol.
function useGameSound() {
  const ctxRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(false)
  const [muted, setMuted] = useState(false)

  const beep = useCallback((freq: number, dur = 0.12, type: OscillatorType = 'sine', delay = 0, volume = 0.15) => {
    if (mutedRef.current) return
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctxRef.current ??= new AC()
      const ac = ctxRef.current
      if (ac.state === 'suspended') void ac.resume()
      const t0 = ac.currentTime + delay
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(t0)
      osc.stop(t0 + dur + 0.05)
    } catch {
      // Suara tidak tersedia di perangkat ini; permainan tetap jalan.
    }
  }, [])

  const playCatch = useCallback(() => { beep(660, 0.1); beep(880, 0.14, 'sine', 0.08) }, [beep])
  const playFail = useCallback(() => { beep(180, 0.22, 'sawtooth', 0, 0.1) }, [beep])
  const playStart = useCallback(() => { beep(523, 0.1); beep(659, 0.1, 'sine', 0.09); beep(784, 0.16, 'sine', 0.18) }, [beep])
  const playEnd = useCallback(() => { beep(392, 0.14); beep(330, 0.14, 'sine', 0.12); beep(262, 0.24, 'sine', 0.24) }, [beep])
  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
  }, [])

  return { muted, toggleMuted, playCatch, playFail, playStart, playEnd }
}

export function TangkapSampah({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number) => void }) {
  const session = useGameSession('tangkap_sampah', onFinished)
  const { phase, duration, start, push, finish } = session
  const canvas = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ score: 0, lives: 3, bin: BINS[0].label, left: 60 })
  const [stage, setStage] = useState<'tutorial' | 'main'>('tutorial')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const sound = useGameSound()

  const mulaiMain = () => {
    sound.playStart()
    setStage('main')
    void start()
  }
  const jeda = () => { pausedRef.current = true; setPaused(true) }
  const lanjut = () => { pausedRef.current = false; setPaused(false) }

  useEffect(() => {
    if (phase !== 'main') return
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    let startTime = Date.now()
    let basketX = W / 2, direction = 0, activeIndex = Math.floor(Math.random() * BINS.length)
    let nextBinAt = 15, nextSpawn = 0.6, lastFrame = performance.now()
    let score = 0, streak = 0, lives = 3, ended = false, raf = 0
    const items: Falling[] = []
    setHud({ score: 0, lives: 3, bin: BINS[activeIndex].label, left: duration })

    const fail = () => {
      sound.playFail()
      push({ ok: false }); streak = 0; lives -= 1
      setHud((h) => ({ ...h, lives }))
      if (lives <= 0) end()
    }
    const end = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); sound.playEnd(); void finish() }

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

    const draw = () => {
      const active = BINS[activeIndex]
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
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrame) / 1000)
      lastFrame = now
      if (pausedRef.current) {
        // Jeda: bekukan jam permainan (geser startTime sebesar waktu yang
        // berlalu) lalu gambar ulang tanpa mengubah apa pun.
        startTime += dt * 1000
        draw()
        raf = requestAnimationFrame(frame)
        return
      }
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
            sound.playCatch()
            push({ ok: true }); setHud((h) => ({ ...h, score }))
          } else fail()
        } else if (item.y > H + 10) {
          items.splice(i, 1)
          if (item.bin === active.id) fail()
        }
        if (ended) return
      }

      draw()
      setHud((h) => { const left = Math.max(0, Math.ceil(duration - elapsed)); return h.left === left ? h : { ...h, left } })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      ended = true; cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', move)
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp)
    }
  }, [phase, duration, push, finish, sound.playCatch, sound.playFail, sound.playEnd])

  if (stage === 'tutorial') {
    return (
      <section className="game-stage" aria-labelledby="tangkap-tutorial-title">
        <h2 id="tangkap-tutorial-title">Cara main Tangkap Sampah</h2>
        <ol className="game-tutorial">
          <li>Sampah jatuh dari atas layar. Geser keranjang dengan mouse, sentuhan, atau tombol panah kiri dan kanan.</li>
          <li>Tangkap hanya sampah jenis yang tertulis di keranjang: Organik, Anorganik, Kertas, Residu, atau B3.</li>
          <li>Tangkapan benar menambah skor (beruntun makin besar). Tangkapan salah, atau sampah yang diminta lolos, mengurangi 1 nyawa.</li>
          <li>Kamu punya 3 nyawa. Kumpulkan skor sebanyak-banyaknya sebelum waktu habis.</li>
        </ol>
        <div className="game-actions">
          <button type="button" className="game-play" onClick={mulaiMain}><Play aria-hidden="true" /> Mulai main</button>
          <button type="button" className="game-ghost" onClick={onExit}>Kembali ke menu</button>
        </div>
      </section>
    )
  }

  return (
    <SessionShell session={session} onExit={onExit} title="Permainan selesai">
      <section className="game-stage">
        <div className="game-hud"><span>Skor <b>{hud.score}</b></span><span>Nyawa <b>{hud.lives}</b></span><span>Waktu <b>{hud.left}s</b></span></div>
        <p className="game-hint">Tangkap sampah jenis <b>{hud.bin}</b>. Geser keranjang dengan mouse, sentuhan, atau tombol panah.</p>
        <div className="game-controls">
          {paused
            ? <button type="button" className="game-play" onClick={lanjut}><Play aria-hidden="true" /> Lanjutkan</button>
            : <button type="button" className="game-play" onClick={jeda}><Pause aria-hidden="true" /> Jeda</button>}
          <button type="button" className="game-ghost" onClick={onExit}><Home aria-hidden="true" /> Menu</button>
          <button type="button" className="game-ghost" onClick={sound.toggleMuted} aria-pressed={sound.muted}>{sound.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />} {sound.muted ? 'Suara mati' : 'Suara nyala'}</button>
        </div>
        <div className="game-canvas-wrap">
          <canvas ref={canvas} width={W} height={H} className="game-canvas" aria-label="Area permainan Tangkap Sampah" />
          {paused && <div className="game-paused-overlay" role="status"><strong>Jeda</strong><span>Ketuk Lanjutkan untuk bermain lagi.</span></div>}
        </div>
      </section>
    </SessionShell>
  )
}
