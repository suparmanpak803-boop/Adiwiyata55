'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { readJsonResponse } from '@/lib/api-client'
import { KATEGORI, STATUS_LABEL, URGENSI } from '@/lib/laporan'
import { StatusBadge, fetcher, formatDate } from './shared'

type Detail = {
  laporan: { id: string; nomorTiket: string; kategori: string; lokasi: string | null; judul: string; isi: string; urgensi: string; status: string; anonim: boolean; tanggapan: string | null; rating: number | null }
  foto: string[]
  komentar: { dariAdmin: boolean; isi: string; dibuatPada: string }[]
  riwayat: { status: string; catatan: string | null; dibuatPada: string }[]
}

export function LaporanDetail({ id }: { id: string }) {
  const { data, error, mutate } = useSWR<Detail>(`/api/laporan/${id}`, fetcher)
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState('')

  async function act(body: object) {
    setMessage('')
    try {
      await readJsonResponse(await fetch(`/api/laporan/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Gagal menyimpan.'); return }
    setComment('')
    await mutate()
  }

  if (error) return <main className="leaderboard-page"><p role="alert">{error.message}</p><a href="/laporan">Kembali</a></main>
  if (!data) return <main className="leaderboard-page"><p>Memuat…</p></main>
  const { laporan } = data
  const closed = laporan.status === 'selesai' || laporan.status === 'ditolak'

  return (
    <main className="leaderboard-page">
      <article className="lap-detail">
        <a href="/laporan" className="leaderboard-back">← Laporan saya</a>
        <h1>{laporan.judul}</h1>
        <p className="lap-meta"><StatusBadge status={laporan.status} /> {laporan.nomorTiket} · {KATEGORI.find((k) => k.id === laporan.kategori)?.label}{laporan.lokasi ? ` · ${laporan.lokasi}` : ''} · Urgensi {URGENSI.find((u) => u.id === laporan.urgensi)?.label}{laporan.anonim ? ' · Anonim' : ''}</p>
        <p className="lap-body">{laporan.isi}</p>
        {data.foto.length > 0 && <div className="lap-photos">{data.foto.map((p) => <a key={p} href={`/api/laporan/file?pathname=${encodeURIComponent(p)}`} target="_blank" rel="noreferrer"><img src={`/api/laporan/file?pathname=${encodeURIComponent(p)}`} alt="Foto bukti laporan" loading="lazy" /></a>)}</div>}
        {laporan.tanggapan && <section className="lap-box"><h2>Tanggapan Admin</h2><p>{laporan.tanggapan}</p></section>}
        <section><h2>Riwayat Status</h2><ol className="lap-timeline">{data.riwayat.map((r, i) => <li key={i}><b>{STATUS_LABEL[r.status] ?? r.status}</b> <small>{formatDate(r.dibuatPada)}</small>{r.catatan ? <span>{r.catatan}</span> : null}</li>)}</ol></section>
        <section><h2>Komentar</h2>
          {data.komentar.length === 0 && <p className="lap-empty">Belum ada komentar.</p>}
          {data.komentar.map((k, i) => <div key={i} className={k.dariAdmin ? 'lap-comment admin' : 'lap-comment'}><b>{k.dariAdmin ? 'Admin' : 'Anda'}</b><p>{k.isi}</p><small>{formatDate(k.dibuatPada)}</small></div>)}
          {!closed && (
            <form onSubmit={(e) => { e.preventDefault(); void act({ aksi: 'komentar', isi: comment }) }} className="lap-form-inline">
              <label htmlFor="komentar" className="sr-only">Tambah informasi</label>
              <textarea id="komentar" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={3} placeholder="Tambahkan informasi atau komentar" />
              <button className="game-play" type="submit" disabled={comment.trim().length < 3}>Kirim komentar</button>
            </form>
          )}
        </section>
        {laporan.status === 'selesai' && (
          <section><h2>Beri Rating</h2>
            <div className="lap-stars" role="group" aria-label="Rating 1 sampai 5">
              {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={laporan.rating && n <= laporan.rating ? 'on' : ''} aria-label={`${n} bintang`} aria-pressed={laporan.rating === n} onClick={() => void act({ aksi: 'rating', rating: n })}>★</button>)}
            </div>
          </section>
        )}
        {message && <p role="alert" className="lap-error">{message}</p>}
      </article>
    </main>
  )
}
