'use client'

import { useEffect, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Bell } from 'lucide-react'
import { fetchJson } from '@/lib/api-client'
import { STATUS_LABEL } from '@/lib/laporan'
import '@/components/leaderboard/leaderboard.css'
import '@/components/game/game.css'
import './laporan.css'

export function fetcher<T>(url: string): Promise<T> {
  return fetchJson<T>(url, { cache: 'no-store' })
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value))
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`lap-badge lap-${status}`}>{STATUS_LABEL[status] ?? status}</span>
}

function useVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}

type Notif = { id: number; judul: string; isi: string; tautan: string | null; dibaca: boolean; dibuatPada: string }

export function NotificationBell() {
  const visible = useVisible()
  const [open, setOpen] = useState(false)
  const { data } = useSWR<{ notifikasi: Notif[]; belumDibaca: number }>('/api/notifikasi', fetcher, { refreshInterval: visible ? 60_000 : 0, revalidateOnFocus: false })

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && data?.belumDibaca) {
      await fetch('/api/notifikasi', { method: 'POST' })
      void mutate('/api/notifikasi')
    }
  }

  return (
    <div className="lap-bell">
      <button type="button" className="game-ghost" onClick={toggle} aria-expanded={open} aria-label={`Notifikasi, ${data?.belumDibaca ?? 0} belum dibaca`}>
        <Bell aria-hidden="true" size={16} />{data?.belumDibaca ? <span className="lap-count">{data.belumDibaca}</span> : null}
      </button>
      {open && (
        <div className="lap-pop" role="region" aria-label="Daftar notifikasi">
          {data?.notifikasi.length ? data.notifikasi.map((n) => (
            <a key={n.id} href={n.tautan ?? '/laporan'} className={n.dibaca ? 'lap-notif' : 'lap-notif unread'}><b>{n.judul}</b><span>{n.isi}</span><small>{formatDate(n.dibuatPada)}</small></a>
          )) : <p className="lap-empty">Belum ada notifikasi.</p>}
        </div>
      )}
    </div>
  )
}
