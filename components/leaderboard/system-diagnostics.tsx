'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Activity, Database, RefreshCw, ShieldCheck } from 'lucide-react'
import { fetchJson } from '@/lib/api-client'
import './leaderboard.css'

type DiagnosticData = {
  database: { connected: boolean; responseMs: number }
  tables: { label: string; table: string; ready: boolean }[]
  activePeriod: { id: string; startedAt: string | null } | null
}
type Envelope<T> = { galat: false; data: T }

export function SystemDiagnostics() {
  const { data, error, isLoading, mutate } = useSWR<Envelope<DiagnosticData>>('/api/admin/diagnostik', (url: string) => fetchJson<Envelope<DiagnosticData>>(url, { cache: 'no-store' }))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function repairTables() {
    setBusy(true); setNotice('')
    try {
      const result = await fetchJson<Envelope<{ statementsOk: number; statementsFailed: number; failures: { statement: string; error: string }[]; missingTables: string[] }>>('/api/admin/diagnostik', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'perbaiki_tabel' }),
      })
      const summary = result.data
      setNotice(summary.statementsFailed === 0
        ? `Tabel diperbaiki: ${summary.statementsOk} pernyataan berhasil. ${summary.missingTables.length === 0 ? 'Semua tabel wajib kini tersedia — silakan coba game lagi.' : `Masih hilang: ${summary.missingTables.join(', ')}.`}`
        : `Perbaikan sebagian: ${summary.statementsOk} berhasil, ${summary.statementsFailed} gagal. ${summary.failures[0]?.error ?? ''}`)
      await mutate()
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Tabel belum dapat diperbaiki.')
    } finally { setBusy(false) }
  }

  async function createDefaults() {
    setBusy(true); setNotice('')
    try {
      const result = await fetchJson<Envelope<{ questionsAdded: number; itemsAdded: number; missionsAdded: number; videosAdded: number }>>('/api/admin/diagnostik', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'buat_data_awal' }),
      })
      const added = result.data
      setNotice(`Data awal disiapkan: ${added.questionsAdded} soal, ${added.itemsAdded} item, ${added.missionsAdded} misi baru.`)
      await mutate()
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Data awal belum dapat dibuat.')
    } finally { setBusy(false) }
  }

  async function tambahMediaKegiatan() {
    setBusy(true); setNotice('')
    try {
      const result = await fetchJson<Envelope<{ slidesDitambah: number; dokumenDitambah: number }>>('/api/admin/diagnostik', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'tambah_media_kegiatan' }),
      })
      const added = result.data
      setNotice(added.slidesDitambah === 0 && added.dokumenDitambah === 0
        ? 'Semua media kegiatan sudah ada — tidak ada yang ditambah.'
        : `Media kegiatan ditambahkan: ${added.slidesDitambah} slide beranda dan ${added.dokumenDitambah} dokumen & arsip baru.`)
      await mutate()
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Media kegiatan belum dapat ditambahkan.')
    } finally { setBusy(false) }
  }

  return (
    <main className="admin-game-page">
      <a className="leaderboard-back" href="/">← Kembali ke portal</a>
      <header className="admin-game-header"><span className="leaderboard-mark"><Activity aria-hidden="true" /></span><div><span className="eyebrow">PANEL ADMINISTRATOR</span><h1>Diagnostik sistem</h1><p>Periksa koneksi database, tabel yang diperlukan, dan periode leaderboard aktif.</p><a className="leaderboard-back" href="/admin/game/konten">Kelola konten permainan →</a></div></header>
      {isLoading && <div className="leaderboard-state">Memeriksa sistem…</div>}
      {error && <div className="leaderboard-state is-error" role="alert">{error.message}<button type="button" onClick={() => void mutate()}>Coba lagi</button></div>}
      {data && <>
        <section className="admin-setting-card diagnostics-summary">
          <div><Database aria-hidden="true" /><span>Koneksi database</span><strong>{data.data.database.connected ? 'Terhubung' : 'Tidak terhubung'}</strong></div>
          <div><Activity aria-hidden="true" /><span>Waktu respons</span><strong>{data.data.database.responseMs} ms</strong></div>
          <div><ShieldCheck aria-hidden="true" /><span>Periode leaderboard</span><strong>{data.data.activePeriod ? 'Aktif' : 'Belum tersedia'}</strong></div>
        </section>
        <section className="admin-setting-card diagnostics-tables"><div className="admin-setting-heading"><div><span className="eyebrow">KESEHATAN SKEMA</span><h2>Status tabel wajib</h2></div><button className="leaderboard-refresh" type="button" onClick={() => void mutate()}><RefreshCw aria-hidden="true" /> Periksa ulang</button></div>
          <div className="leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr><th scope="col">Tabel</th><th scope="col">Status</th></tr></thead><tbody>{data.data.tables.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td><span className={item.ready ? 'diagnostic-status ready' : 'diagnostic-status missing'}>{item.ready ? 'Tersedia' : 'Belum tersedia'}</span>{!item.ready && <small className="table-subtitle">Periksa migrasi: {item.table}</small>}</td></tr>)}</tbody></table></div>
        </section>
        {!data.data.activePeriod && <p className="admin-content-warning is-warning" role="status">Periode leaderboard belum tersedia. Tombol data awal akan menyiapkannya dengan aman.</p>}
      </>}
      {notice && <p className="admin-content-notice" role="status">{notice}</p>}
      <section className="admin-setting-card diagnostics-seed"><div><span className="eyebrow">PERBAIKAN SKEMA</span><h2>Perbaiki tabel yang hilang</h2><p>Menjalankan ulang seluruh migrasi pada database yang dipakai aplikasi ini. Tabel dan data yang sudah ada tidak diubah; tabel yang hilang dibuat beserta data awalnya.</p></div><button className="admin-save-button" type="button" disabled={busy} onClick={() => void repairTables()}>{busy ? 'Memperbaiki…' : 'Perbaiki Tabel'}</button></section>
      <section className="admin-setting-card diagnostics-seed"><div><span className="eyebrow">INISIALISASI AMAN</span><h2>Buat data awal</h2><p>Menambahkan nilai pengaturan bawaan dan contoh soal, item sampah, serta misi yang belum ada. Data yang sudah tersedia tidak ditimpa.</p><p>Video edukasi sengaja tidak diisi dengan tautan yang belum diverifikasi; tambahkan sumber resmi melalui Kelola Konten.</p></div><button className="admin-save-button" type="button" disabled={busy} onClick={() => void createDefaults()}>{busy ? 'Menyiapkan…' : 'Buat Data Awal'}</button></section>
      <section className="admin-setting-card diagnostics-seed"><div><span className="eyebrow">KONTEN KEGIATAN</span><h2>Tambah slide &amp; dokumen kegiatan</h2><p>Menambahkan 5 foto kegiatan sebagai slide beranda (Kerja Bakti, Botol Plastik Media Tanam, Membersihkan Depan Masjid, Sehari Tanpa Asap Kendaraan, Penghargaan Kelas Terbersih) dan 5 foto sebagai Dokumen &amp; Arsip (Rapat Koordinasi, Hemat Energi Saklar, Kolam Ikan, Kompos Padat). Foto yang sudah ada tidak ditambah lagi.</p></div><button className="admin-save-button" type="button" disabled={busy} onClick={() => void tambahMediaKegiatan()}>{busy ? 'Menambahkan…' : 'Tambah Media Kegiatan'}</button></section>
    </main>
  )
}
