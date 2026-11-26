'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react'
import type { SliderPageData, SliderSlide } from '@/lib/slider/data'

export function HomeSlider({ slides, settings, preview = false, titleAsH1 = false }: SliderPageData & { preview?: boolean; titleAsH1?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(settings.autoplay)
  const [hovered, setHovered] = useState(false)
  const [touching, setTouching] = useState(false)
  const [documentActive, setDocumentActive] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(true)
  const pointerStart = useRef<number | null>(null)
  const count = slides.length
  const current = count ? slides[Math.min(activeIndex, count - 1)] : null
  const automatic = count > 1 && playing && !reducedMotion && !hovered && !touching && documentActive

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const updateVisibility = () => setDocumentActive(!document.hidden)
    updateMotion()
    updateVisibility()
    motion.addEventListener('change', updateMotion)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      motion.removeEventListener('change', updateMotion)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    setActiveIndex(0)
    setProgress(0)
    setPlaying(settings.autoplay)
  }, [slides.length, settings.autoplay])

  useEffect(() => {
    if (!automatic) return
    const duration = Math.max(2, Math.min(15, settings.intervalDetik)) * 1000
    const startedAt = performance.now()
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt
      const nextProgress = Math.min(100, (elapsed / duration) * 100)
      setProgress(nextProgress)
      if (elapsed >= duration) {
        setProgress(0)
        setActiveIndex((index) => (index + 1) % count)
      }
    }, 80)
    return () => window.clearInterval(timer)
  }, [automatic, activeIndex, count, settings.intervalDetik])

  const goTo = useCallback((index: number) => {
    if (!count) return
    setActiveIndex((index + count) % count)
    setProgress(0)
  }, [count])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(activeIndex - 1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(activeIndex + 1)
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return
    pointerStart.current = event.clientX
    setTouching(true)
  }

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (pointerStart.current !== null) {
      const distance = event.clientX - pointerStart.current
      if (Math.abs(distance) > 48) goTo(activeIndex + (distance < 0 ? 1 : -1))
    }
    pointerStart.current = null
    setTouching(false)
  }

  const onPointerCancel = () => {
    pointerStart.current = null
    setTouching(false)
  }

  return (
    <section
      className={`home-slider${preview ? ' home-slider-preview' : ''}`}
      aria-label={preview ? 'Pratinjau slider beranda' : 'Sorotan Adiwiyata'}
      aria-roledescription="carousel"
      tabIndex={0}
      data-transition={settings.transisi}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false) }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {current ? (
        <div className="home-slider-frame" key={current.id}>
          <Image
            src={current.imageUrl}
            alt={current.altText}
            fill
            sizes="(max-width: 700px) 100vw, 1240px"
            priority={activeIndex === 0}
            className="home-slider-image"
          />
          <div className="home-slider-overlay" />
          <div className="home-slider-copy">
            <span className="home-slider-kicker">SEKOLAH ADIWIYATA</span>
            {current.judul && (titleAsH1 ? <h1>{current.judul}</h1> : <h2>{current.judul}</h2>)}
            {current.deskripsi && <p>{current.deskripsi}</p>}
            {current.ctaTeks && current.ctaUrl && <CtaLink slide={current} />}
          </div>
          {count > 1 && settings.tampilPanah && (
            <div className="home-slider-arrows">
              <button type="button" aria-label="Slide sebelumnya" onClick={() => goTo(activeIndex - 1)}><ArrowLeft aria-hidden="true" /></button>
              <button type="button" aria-label="Slide berikutnya" onClick={() => goTo(activeIndex + 1)}><ArrowRight aria-hidden="true" /></button>
            </div>
          )}
          {count > 1 && settings.tampilDots && (
            <div className="home-slider-dots" role="group" aria-label="Pilih slide">
              {slides.map((slide, index) => <button
                key={slide.id}
                type="button"
                className={index === activeIndex ? 'is-active' : ''}
                aria-label={`Tampilkan slide ${index + 1}${slide.judul ? `: ${slide.judul}` : ''}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => goTo(index)}
              />)}
            </div>
          )}
          {automatic && <div className="home-slider-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>}
          {count > 1 && (
            <button
              type="button"
              className="home-slider-play"
              aria-label={reducedMotion ? 'Autoplay dinonaktifkan sesuai preferensi gerak' : playing ? 'Jeda autoplay' : 'Putar autoplay'}
              aria-pressed={playing && !reducedMotion}
              disabled={reducedMotion}
              onClick={() => { setPlaying((value) => !value); setProgress(0) }}
            >
              {playing && !reducedMotion ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span className="sr-only">{playing && !reducedMotion ? 'Jeda' : 'Putar'}</span>
            </button>
          )}
          <span className="sr-only" aria-live="polite" aria-atomic="true">Slide {activeIndex + 1} dari {count}{current.judul ? `: ${current.judul}` : ''}</span>
        </div>
      ) : (
        <div className="home-slider-empty">
          <span className="home-slider-empty-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="home-slider-kicker">ADIWIYATA · SMAN 55 JAKARTA</span>
          {titleAsH1 ? <h1>Selamat datang</h1> : <h2>Selamat datang</h2>}
          <p>Bersama merawat lingkungan sekolah, satu kebiasaan baik setiap hari.</p>
        </div>
      )}
    </section>
  )
}

function CtaLink({ slide }: { slide: SliderSlide }) {
  if (!slide.ctaUrl || !slide.ctaTeks) return null
  const external = /^https?:\/\//i.test(slide.ctaUrl)
  const internal = slide.ctaUrl.startsWith('/') && !slide.ctaUrl.startsWith('//')
  if (!external && !internal) return null
  return <a className="home-slider-cta" href={slide.ctaUrl} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
    {slide.ctaTeks}<ArrowUpRight aria-hidden="true" />
  </a>
}
