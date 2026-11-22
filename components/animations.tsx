// Modul animasi terpusat untuk situs Adiwiyata55.
//
// Library: Motion (paket "motion", impor dari "motion/react") untuk
// animasi komponen + Lenis untuk smooth scroll. GSAP sengaja TIDAK
// dipakai (satu library animasi saja, sesuai keputusan pengguna).
//
// Aturan yang dijaga modul ini:
// - Hanya transform + opacity yang dianimasikan (batang skor / bilah
//   progres memakai scaleX, bukan width).
// - Kondisi awal sembunyi (initial) hanya diterapkan lewat JavaScript
//   (props Motion) — tanpa JavaScript, konten tampil utuh karena HTML
//   hasil render server tidak membawa gaya sembunyi.
// - prefers-reduced-motion: MotionConfig reducedMotion="user" membuat
//   semua komponen Motion langsung tampil di kondisi akhir; Lenis
//   tidak dipasang; CountUp langsung menampilkan angka akhir.
// - Lenis: syncTouch false — gerakan sentuh tetap memakai scroll
//   bawaan, hanya roda mouse yang dihaluskan. Area gulir di dalam
//   halaman diberi atribut data-lenis-prevent di komponennya.
// - Impor modul ini hanya di komponen yang memakai animasi, supaya
//   tambahan JavaScript tetap ringan.
//
// Cara mematikan animasi (lihat juga laporan akhir):
// - Semua animasi: jangan render <SiteMotion> di app/layout.tsx
//   (atau hapus pemakaian komponen di bawah dari halaman).
// - Satu animasi saja: hapus pemakaian komponen itu di halaman terkait
//   (mis. hapus <ScoreBar> di leaderboard) — komponen lain tidak
//   terpengaruh.
// - Smooth scroll saja: hapus <LenisRunner> dari SiteMotion.

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, MotionConfig, useInView } from 'motion/react'
import Lenis from 'lenis'

export const ANIM_EASE = [0.22, 1, 0.36, 1] as const
export const ANIM_DURATION = 0.5

// Induk stagger: anak dengan variants fadeUpChild masuk bergantian.
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export const fadeUpChild = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: ANIM_DURATION, ease: ANIM_EASE } },
}

// Kata per kata untuk judul: tiap kata naik sedikit + fade, berurutan.
export const wordParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
}

export const wordChild = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: ANIM_EASE } },
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

function formatId(value: number, decimals: number): string {
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Judul kata per kata. Teks asli dipertahankan di aria-label pada
 *  elemen pembungkus (h1/h2 di pemakai) supaya screen reader tetap
 *  membaca kalimat utuh; kata-kata di sini aria-hidden. */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <motion.span
      className={className}
      variants={wordParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      aria-hidden="true"
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={wordChild}
          style={{ display: 'inline-block', willChange: 'transform, opacity' }}
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </motion.span>
  )
}

/** Angka hitung naik dari 0 saat terlihat, hanya sekali. Tanpa
 *  JavaScript, angka akhir tetap tampil (nilai awal state = value). */
export function CountUp({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 0.9,
  className,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const reduced = usePrefersReducedMotion()
  const done = useRef(false)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    if (!inView) {
      setDisplay(value)
      return
    }
    if (done.current) {
      setDisplay(value)
      return
    }
    done.current = true
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (current) => setDisplay(current),
    })
    return () => controls.stop()
  }, [inView, value, reduced, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatId(display, decimals)}
      {suffix}
    </span>
  )
}

/** Batang skor / bilah progres: isi mengalir lewat scaleX (transform),
 *  bukan width. `ratio` 0–1. Dipakai untuk batang skor leaderboard,
 *  bilah kepatuhan kelas, dan bilah progres kuis (lihat ProgressFill). */
export function BarFill({
  ratio,
  trackClassName = 'anim-bar-track',
  fillClassName = 'anim-bar-fill',
}: {
  ratio: number
  trackClassName?: string
  fillClassName?: string
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0))
  return (
    <span className={trackClassName} aria-hidden="true">
      <motion.span
        className={fillClassName}
        style={{ transformOrigin: 'left', willChange: 'transform' }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: clamped }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.6, ease: ANIM_EASE }}
      />
    </span>
  )
}

/** Bilah progres yang nilainya berubah (kuis): scaleX mengikuti
 *  nilai akhir tiap langkah, dengan transisi halus. */
export function ProgressFill({ ratio }: { ratio: number }) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0))
  return (
    <motion.span
      style={{ width: '100%', transformOrigin: 'left', willChange: 'transform' }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: clamped }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  )
}

function LenisRunner() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis: Lenis | null = null
    let raf = 0
    let previousScrollBehavior = ''

    const start = () => {
      if (lenis) return
      // Lenis mengambil alih penghalusan scroll; matikan
      // scroll-behavior: smooth dari CSS supaya tidak ganda.
      previousScrollBehavior = document.documentElement.style.scrollBehavior
      document.documentElement.style.scrollBehavior = 'auto'
      lenis = new Lenis({ duration: 0.8, smoothWheel: true, syncTouch: false })
      const loop = (time: number) => {
        lenis?.raf(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    const stop = () => {
      cancelAnimationFrame(raf)
      lenis?.destroy()
      lenis = null
      document.documentElement.style.scrollBehavior = previousScrollBehavior
    }

    const sync = () => {
      if (media.matches) stop()
      else start()
    }

    sync()
    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
      stop()
    }
  }, [])
  return null
}

/** Pasang di root layout membungkus {children}: mengaktifkan
 *  reducedMotion="user" untuk semua komponen Motion + Lenis. */
export function SiteMotion({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <LenisRunner />
    </MotionConfig>
  )
}
