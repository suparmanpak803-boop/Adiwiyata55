'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Heart, LogOut, MoveHorizontal, Pause, Play, Target, Timer, Trash2, Volume2, VolumeX, Zap } from 'lucide-react'
import { BINS, WASTE_ITEMS, type Bin } from '@/lib/waste-items'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { BATAS_KOIN_ARKADE_HARIAN, koinArkadeDiberikan, koinTangkapSampah, tanggalHariIni } from '@/lib/apa-itu-adiwiyata/arkade'

const W = 360, H = 480, BASKET_W = 84, BASKET_Y = H - 34
const DURASI_DETIK = 60
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

/**
 * Tangkap Sampah — game arkade di dunia kampanye, dibuka lewat NPC Kak Yoga.
 * Sesi sepenuhnya lokal (tanpa server): skor diubah jadi Koin Hijau oleh
 * runner lewat onFinished, dan skor terbaik tersimpan di save kampanye.
 */
export function TangkapSampah({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number) => void }) {
  const { save } = useCampaign()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ score: 0, lives: 3, bin: BINS[0].label, left: DURASI_DETIK })
  const [stage, setStage] = useState<'judul' | 'main' | 'selesai'>('judul')
  const [paused, setPaused] = useState(false)
  const [skorAkhir, setSkorAkhir] = useState(0)
  const [terbaikLama, setTerbaikLama] = useState(0)
  // F13: koin yang benar-benar diberikan (dijepit batas harian) + yang
  // diminta — dijepret saat selesai dari save SEBELUM hadiah runner,
  // supaya angka di layar hasil sama dengan yang masuk ke saldo.
  const [koinHasil, setKoinHasil] = useState<{ diminta: number; diberikan: number } | null>(null)
  const pausedRef = useRef(false)
  const rondeRef = useRef(0)
  const [ronde, setRonde] = useState(0)
  const selesaiRef = useRef(false)
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished
  const saveRef = useRef(save)
  saveRef.current = save
  const sound = useGameSound()

  // Selesai lokal: dipanggil tepat satu kali per ronde — simpan skor akhir,
  // tampilkan layar hasil, dan beri tahu runner (koin + rekor terbaik).
  const finishLocal = useCallback((score: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    setTerbaikLama(saveRef.current.arkade?.tangkap ?? 0)
    const koinDiminta = koinTangkapSampah(score)
    setKoinHasil({
      diminta: koinDiminta,
      diberikan: koinArkadeDiberikan(
        koinDiminta,
        saveRef.current.arkadeTanggal ?? null,
        saveRef.current.arkadeKoinHariIni ?? 0,
        tanggalHariIni(),
      ),
    })
    setSkorAkhir(score)
    sound.playEnd()
    setStage('selesai')
    onFinishedRef.current(score)
  }, [sound.playEnd])

  const mulaiMain = () => {
    sound.playStart()
    selesaiRef.current = false
    pausedRef.current = false
    setPaused(false)
    rondeRef.current += 1
    setRonde(rondeRef.current)
    setStage('main')
  }
  const jeda = () => { pausedRef.current = true; setPaused(true) }
  const lanjut = () => { pausedRef.current = false; setPaused(false) }

  useEffect(() => {
    if (stage !== 'main') return
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    let startTime = Date.now()
    let basketX = W / 2, direction = 0, activeIndex = Math.floor(Math.random() * BINS.length)
    let nextBinAt = 15, nextSpawn = 0.6, lastFrame = performance.now()
    let score = 0, streak = 0, lives = 3, ended = false, raf = 0
    const items: Falling[] = []
    setHud({ score: 0, lives: 3, bin: BINS[activeIndex].label, left: DURASI_DETIK })

    const fail = () => {
      sound.playFail()
      streak = 0; lives -= 1
      setHud((h) => ({ ...h, lives }))
      if (lives <= 0) end()
    }
    const end = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); finishLocal(score) }

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
      // Label bak di atas pil putih + teks gelap (seperti item jatuh):
      // teks putih 11px di atas warna bak gagal AA (mis. Kertas 2,93:1).
      ctx.font = '700 11px sans-serif'
      const labelW = ctx.measureText(active.label).width + 14
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.roundRect(basketX - labelW / 2, BASKET_Y + 3, labelW, 16, 8); ctx.fill()
      ctx.fillStyle = '#1d2b1d'; ctx.fillText(active.label, basketX, BASKET_Y + 15)
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
      if (elapsed >= DURASI_DETIK) return end()
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
            setHud((h) => ({ ...h, score }))
          } else fail()
        } else if (item.y > H + 10) {
          items.splice(i, 1)
          if (item.bin === active.id) fail()
        }
        if (ended) return
      }

      draw()
      setHud((h) => { const left = Math.max(0, Math.ceil(DURASI_DETIK - elapsed)); return h.left === left ? h : { ...h, left } })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      ended = true; cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', move)
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp)
    }
  }, [stage, ronde, finishLocal, sound.playCatch, sound.playFail])

  if (stage === 'judul') {
    return (
      <section className="game-stage" aria-labelledby="tangkap-judul">
        <div className="game-ikon-judul" aria-hidden="true"><Trash2 /></div>
        <h2 id="tangkap-judul" className="game-judul">Tangkap Sampah</h2>
        <p className="game-hint">Tangkap sampah yang jatuh dan masukkan ke bak yang tepat sebelum waktu habis.</p>
        <div className="game-bak-row" aria-label="Lima bak sampah">
          {BINS.map((b) => (
            <span key={b.id} className="game-bak-chip"><span className="game-bak-dot" style={{ background: b.color }} aria-hidden="true" />{b.label}</span>
          ))}
        </div>
        <div className="game-fakta">
          <div className="game-fakta-chip"><Target aria-hidden="true" />Tangkap<span>jenis di keranjang</span></div>
          <div className="game-fakta-chip"><Heart aria-hidden="true" />3<span>nyawa</span></div>
          <div className="game-fakta-chip"><Timer aria-hidden="true" />60 dtk<span>waktu main</span></div>
        </div>
        <ul className="game-aturan">
          <li><MoveHorizontal aria-hidden="true" /><span>Geser keranjang dengan mouse, sentuhan, atau tombol panah kiri dan kanan.</span></li>
          <li><Zap aria-hidden="true" /><span>Tangkapan beruntun menambah skor makin besar. Salah tangkap atau sampah yang diminta lolos mengurangi 1 nyawa.</span></li>
        </ul>
        <div className="game-actions game-actions--tumpuk">
          <button type="button" className="game-play" style={{ minHeight: 44 }} onClick={mulaiMain}><Play aria-hidden="true" /> Mulai main</button>
          <button type="button" className="game-ghost" style={{ minHeight: 44 }} onClick={onExit}><ArrowLeft aria-hidden="true" /> Kembali ke dunia</button>
        </div>
      </section>
    )
  }

  if (stage === 'selesai') {
    const rekorBaru = skorAkhir > terbaikLama
    return (
      <section className="game-stage" aria-labelledby="tangkap-selesai">
        <h2 id="tangkap-selesai">Permainan selesai</h2>
        <p className="game-big">Skor {skorAkhir}</p>
        <p className="game-hint">Kamu mendapat <b>+{koinHasil?.diberikan ?? 0} Koin Hijau</b>.</p>
        {koinHasil && koinHasil.diberikan < koinHasil.diminta && (
          <p className="game-hint">Batas harian arkade tercapai ({BATAS_KOIN_ARKADE_HARIAN} Koin Hijau/hari). Coba lagi besok.</p>
        )}
        <p className="game-hint">
          Rekor terbaik: <b>{Math.max(terbaikLama, skorAkhir)}</b>
          {rekorBaru && ' — Rekor baru!'}
        </p>
        <div className="game-actions game-actions--tumpuk">
          <button type="button" className="game-play" style={{ minHeight: 44 }} onClick={mulaiMain}><Play aria-hidden="true" /> Main lagi</button>
          <button type="button" className="game-ghost" style={{ minHeight: 44 }} onClick={onExit}><ArrowLeft aria-hidden="true" /> Kembali ke dunia</button>
        </div>
      </section>
    )
  }

  return (
    <section className="game-stage">
      <div className="game-hud"><span>Skor <b>{hud.score}</b></span><span>Nyawa <b>{hud.lives}</b></span><span>Waktu <b>{hud.left}s</b></span></div>
      <p className="game-hint">Tangkap sampah jenis <b>{hud.bin}</b>. Geser keranjang dengan mouse, sentuhan, atau tombol panah.</p>
      <div className="game-controls">
        {paused
          ? <button type="button" className="game-play" style={{ minHeight: 44 }} onClick={lanjut}><Play aria-hidden="true" /> Lanjutkan</button>
          : <button type="button" className="game-play" style={{ minHeight: 44 }} onClick={jeda}><Pause aria-hidden="true" /> Jeda</button>}
        <button type="button" className="game-ghost" style={{ minHeight: 44 }} onClick={onExit}><LogOut aria-hidden="true" /> Keluar</button>
        <button type="button" className="game-ghost" style={{ minHeight: 44 }} onClick={sound.toggleMuted} aria-pressed={sound.muted}>{sound.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />} {sound.muted ? 'Suara mati' : 'Suara nyala'}</button>
      </div>
      <div className="game-canvas-wrap">
        <canvas ref={canvas} width={W} height={H} className="game-canvas" aria-label="Area permainan Tangkap Sampah" />
        {paused && <div className="game-paused-overlay" role="status"><strong>Jeda</strong><span>Ketuk Lanjutkan untuk bermain lagi.</span></div>}
      </div>
    </section>
  )
}
