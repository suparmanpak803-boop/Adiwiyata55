'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile'

export type TurnstileStatus = 'loading' | 'ready' | 'error'
export type TurnstileWidgetHandle = { reset: () => void }

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string
      theme?: 'light' | 'dark' | 'auto'
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    },
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void
  onStatus: (status: TurnstileStatus) => void
}

// Widget Cloudflare Turnstile (mode Managed): tidak menampilkan puzzle
// bagi kebanyakan pengunjung; token diterbitkan otomatis setelah render.
// Bila skrip gagal dimuat, komponen menghilang dan form tetap bisa
// dipakai (fail-open) — proteksi server tetap berjalan bila token ada.
export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onToken, onStatus }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const [failed, setFailed] = useState(false)

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current)
          } catch {
            // abaikan
          }
        }
        onToken(null)
      },
    }))

    useEffect(() => {
      let cancelled = false

      function render() {
        if (cancelled || !containerRef.current || !window.turnstile) return
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'auto',
            callback: (token: string) => {
              if (!cancelled) {
                onToken(token)
                onStatus('ready')
              }
            },
            'expired-callback': () => {
              if (!cancelled) onToken(null)
            },
            'error-callback': () => {
              if (!cancelled) {
                setFailed(true)
                onStatus('error')
              }
            },
          })
        } catch {
          if (!cancelled) {
            setFailed(true)
            onStatus('error')
          }
        }
      }

      function fail() {
        if (!cancelled) {
          setFailed(true)
          onStatus('error')
        }
      }

      if (window.turnstile) {
        render()
        return () => {
          cancelled = true
        }
      }

      const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`)
      if (existing) {
        existing.addEventListener('load', render, { once: true })
        existing.addEventListener('error', fail, { once: true })
      } else {
        const script = document.createElement('script')
        script.src = SCRIPT_URL
        script.async = true
        script.defer = true
        script.onload = render
        script.onerror = fail
        document.head.appendChild(script)
      }

      return () => {
        cancelled = true
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch {
            // abaikan
          }
        }
      }
      // onToken/onStatus stabil (setState); render sekali saja.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (failed) return null
    return (
      <div
        ref={containerRef}
        className="auth-turnstile"
        aria-label="Verifikasi keamanan Cloudflare Turnstile"
      />
    )
  },
)
