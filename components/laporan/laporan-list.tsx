'use client'

import useSWR from 'swr'
import { MessageSquarePlus } from 'lucide-react'
import { KATEGORI } from '@/lib/laporan'
import { NotificationBell, StatusBadge, fetcher, formatDate } from './shared'

type Item = { id: string; nomorTiket: string; kategori: string; judul: string; status: string; dibuatPada: string }

export function LaporanList() {
  const { data, error, isLoading } = useSWR<{ laporan: Item[] }>('/api/laporan', fetcher)
  return (
    <main className="leaderboard-page">
      <header className="leaderboard-header">
        <a href="/" className="leaderboard-back">← Kembali ke beranda</a>
        <div className="leaderboard-title-row">
          <span className="leaderboard-mark"><MessageSquarePlus aria-hidden="true" /></span>
          <div><span className="eyebrow">ADIWIYATA · SUARA WARGA SEKOLAH</span><h1>Laporan &amp; Saran</h1><p>Laporkan kondisi lapangan, beri ide, atau sampaikan apresiasi.</p></div>
        </div>
        <div className="game-actions" style={{ justifyContent: 'flex-start' }}>
          <a className="game-play" href="/laporan/baru">Kirim laporan</a>
          <NotificationBell />
        </div>
      </header>
      <section className="lap-list" aria-label="Laporan saya">
        <h2>Laporan Saya</h2>
        {isLoading && <p className="lap-empty">Memuat…</p>}
        {error && <p className="lap-empty" role="alert">{error.message}</p>}
        {data && !data.laporan.length && <p className="lap-empty">Belum ada laporan. Kirim laporan pertamamu.</p>}
        {data?.laporan.map((item) => (
          <a key={item.id} className="lap-row" href={`/laporan/${item.id}`}>
            <div><b>{item.judul}</b><small>{item.nomorTiket} · {KATEGORI.find((k) => k.id === item.kategori)?.label} · {formatDate(item.dibuatPada)}</small></div>
            <StatusBadge status={item.status} />
          </a>
        ))}
      </section>
    </main>
  )
}
