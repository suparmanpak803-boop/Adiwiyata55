'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { fetchJson } from '@/lib/api-client'
import { ClipboardList, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { ALLOWED_LOCATIONS, KATEGORI, STATUS_LABEL, URGENSI } from '@/lib/laporan'
import { NotificationBell, StatusBadge, fetcher, formatDate } from '../shared'
import { AdminLaporanDetail } from './admin-laporan-detail'
import { AdminLaporanStats } from './admin-laporan-stats'

type Row = {
  id: string; nomorTiket: string; kategori: string; lokasi: string | null; judul: string; urgensi: string; status: string
  pelapor: string | null; tingkat: string | null; penanggungJawab: string | null; saranTerbaik: boolean; statusSinkron: string
  dibuatPada: string; terlambat: boolean
}
type Summary = { baru: number; diproses: number; selesai: number; ditolak: number; terlambat: number; tertunda: number; rataJamSelesai: number | null; rataRating: number | null }
type Payload = { laporan: Row[]; total: number; pageSize: number; summary: Summary }
type Settings = { spreadsheetUrl: string | null; waAktif: boolean; waNomor: string | null }

const emptyFilters = { status: '', kategori: '', urgensi: '', tingkat: '', lokasi: '', dari: '', sampai: '', q: '', urut: 'urgensi' }

function formatDuration(hours: number | null) {
  if (hours == null) return '-'
  return hours < 48 ? `${hours} jam` : `${Math.round((hours / 24) * 10) / 10} hari`
}

export function AdminLaporan({ role }: { role: 'admin' | 'petugas' }) {
  const [tab, setTab] = useState<'daftar' | 'statistik' | 'pengaturan'>('daftar')
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [bulkStatus, setBulkStatus] = useState('diproses')
  const [bulkReason, setBulkReason] = useState('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value))
    return params
  }, [filters])
  const listUrl = `/api/admin/laporan?${query.toString()}${query.size ? '&' : ''}page=${page}`
  const { data, error, isLoading, mutate } = useSWR<Payload>(listUrl, fetcher, { keepPreviousData: true })
  const { data: settings, mutate: mutateSettings } = useSWR<Settings>('/api/admin/laporan/settings', fetcher)

  const update = (key: keyof typeof emptyFilters, value: string) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); setSelected([]) }
  const rows = data?.laporan ?? []
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id))
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  async function runBulk() {
    if (!selected.length) return
    if (bulkStatus === 'ditolak' && bulkReason.trim().length < 5) { setNotice({ ok: false, text: 'Isi alasan penolakan (minimal 5 karakter).' }); return }
    try {
      const body = await fetchJson<{ diperbarui: number }>('/api/admin/laporan/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selected, status: bulkStatus, alasan: bulkReason }) })
      setNotice({ ok: true, text: `${body.diperbarui} laporan diperbarui.` })
      setSelected([])
      setBulkReason('')
      void mutate()
    } catch (cause) {
      setNotice({ ok: false, text: cause instanceof Error ? cause.message : 'Perubahan massal gagal.' })
    }
  }

  async function syncNow() {
    setNotice({ ok: true, text: 'Menyinkronkan ke Spreadsheet…' })
    try {
      const body = await fetchJson<{ message?: string }>('/api/admin/laporan/sync', { method: 'POST' })
      setNotice({ ok: true, text: body.message ?? 'Sinkronisasi selesai.' })
      void mutate()
    } catch (cause) {
      setNotice({ ok: false, text: cause instanceof Error ? cause.message : 'Sinkronisasi belum berhasil.' })
    }
  }

  const exportHref = (format: 'csv' | 'xlsx') => `/api/admin/laporan/export?${new URLSearchParams([...query.entries(), ['format', format]]).toString()}`
  const summary = data?.summary

  return (
    <main className="leaderboard-page">
      <header className="leaderboard-header">
        <a href="/" className="leaderboard-back">← Kembali ke beranda</a>
        <div className="leaderboard-title-row">
          <span className="leaderboard-mark"><ClipboardList aria-hidden="true" /></span>
          <div><span className="eyebrow">ADIWIYATA · {role === 'admin' ? 'PANEL ADMIN' : 'PANEL PETUGAS'}</span><h1>Kelola Laporan &amp; Saran</h1><p>{role === 'admin' ? 'Pantau, tanggapi, dan tugaskan laporan warga sekolah.' : 'Laporan yang ditugaskan kepada Anda. Identitas pelapor anonim tidak ditampilkan.'}</p></div>
        </div>
        <div className="game-actions" style={{ justifyContent: 'flex-start' }}><NotificationBell /></div>
      </header>

      <section className="lap-summary" aria-label="Ringkasan laporan">
        <div><span>Baru</span><b>{summary?.baru ?? '-'}</b></div>
        <div><span>Diproses</span><b>{summary?.diproses ?? '-'}</b></div>
        <div><span>Selesai</span><b>{summary?.selesai ?? '-'}</b></div>
        <div className={summary?.terlambat ? 'late' : ''}><span>Terlambat</span><b>{summary?.terlambat ?? '-'}</b></div>
        <div><span>Rata-rata waktu selesai</span><b>{formatDuration(summary?.rataJamSelesai ?? null)}</b></div>
        <div><span>Rata-rata rating</span><b>{summary?.rataRating ? `${summary.rataRating} / 5` : '-'}</b></div>
      </section>

      <div className="leaderboard-tabs" role="tablist" aria-label="Bagian kelola laporan">
        {([['daftar', 'Daftar Laporan'], ...(role === 'admin' ? [['statistik', 'Statistik'], ['pengaturan', 'Pengaturan']] : [])] as [typeof tab, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <section className="lap-admin-panel">
        {notice && <p className={notice.ok ? 'lap-ok' : 'lap-error'} role="status">{notice.text}</p>}

        {tab === 'daftar' && (
          <>
            <div className="lap-filters">
              <input type="search" aria-label="Cari laporan" placeholder="Cari tiket, judul, isi, nama…" value={filters.q} onChange={(e) => update('q', e.target.value)} />
              <select aria-label="Status" value={filters.status} onChange={(e) => update('status', e.target.value)}><option value="">Semua status</option>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <select aria-label="Kategori" value={filters.kategori} onChange={(e) => update('kategori', e.target.value)}><option value="">Semua kategori</option>{KATEGORI.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
              <select aria-label="Urgensi" value={filters.urgensi} onChange={(e) => update('urgensi', e.target.value)}><option value="">Semua urgensi</option>{URGENSI.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select>
              <select aria-label="Tingkat" value={filters.tingkat} onChange={(e) => update('tingkat', e.target.value)}><option value="">Semua tingkat</option>{['X', 'XI', 'XII'].map((t) => <option key={t} value={t}>Kelas {t}</option>)}</select>
              <select aria-label="Kelas atau lokasi" value={filters.lokasi} onChange={(e) => update('lokasi', e.target.value)}><option value="">Semua kelas/lokasi</option>{ALLOWED_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}</select>
              <label>Dari<input type="date" value={filters.dari} onChange={(e) => update('dari', e.target.value)} /></label>
              <label>Sampai<input type="date" value={filters.sampai} onChange={(e) => update('sampai', e.target.value)} /></label>
              <select aria-label="Urutan" value={filters.urut} onChange={(e) => update('urut', e.target.value)}><option value="urgensi">Urut urgensi</option><option value="terbaru">Urut terbaru</option></select>
              <button type="button" className="game-ghost" onClick={() => { setFilters(emptyFilters); setPage(1) }}>Reset filter</button>
            </div>

            <div className="lap-toolbar">
              <span className="lap-empty">{data ? `${data.total} laporan` : ''}</span>
              <a className="game-ghost" href={exportHref('csv')}><Download size={14} aria-hidden="true" /> CSV</a>
              <a className="game-ghost" href={exportHref('xlsx')}><Download size={14} aria-hidden="true" /> Excel</a>
              {settings?.spreadsheetUrl && <a className="game-ghost" href={settings.spreadsheetUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true" /> Buka Spreadsheet</a>}
              {role === 'admin' && <button type="button" className="game-ghost" onClick={syncNow}><RefreshCw size={14} aria-hidden="true" /> Sinkronkan{summary?.tertunda ? ` (${summary.tertunda} tertunda)` : ''}</button>}
            </div>

            {selected.length > 0 && (
              <div className="lap-bulk" role="group" aria-label="Aksi massal">
                <b>{selected.length} dipilih</b>
                <select aria-label="Status baru" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                {bulkStatus === 'ditolak' && <input aria-label="Alasan penolakan" placeholder="Alasan penolakan" value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} maxLength={500} />}
                <button type="button" className="game-play" onClick={runBulk}>Ubah status</button>
              </div>
            )}

            {error && <p className="lap-error" role="alert">{error.message}</p>}
            {isLoading && !data && <p className="lap-empty">Memuat…</p>}
            {data && !rows.length && <p className="lap-empty">Tidak ada laporan yang cocok dengan filter.</p>}
            {rows.length > 0 && (
              <div className="lap-table-wrap">
                <table className="lap-table">
                  <thead><tr>
                    <th><input type="checkbox" aria-label="Pilih semua" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
                    <th>Tiket</th><th>Laporan</th><th>Lokasi</th><th>Urgensi</th><th>Status</th><th>Pelapor</th><th>PJ</th>
                  </tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className={r.terlambat ? 'late' : ''}>
                        <td><input type="checkbox" aria-label={`Pilih ${r.nomorTiket}`} checked={selected.includes(r.id)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id))} /></td>
                        <td className="nowrap">{r.nomorTiket}<small>{formatDate(r.dibuatPada)}</small></td>
                        <td><button type="button" className="lap-link" onClick={() => setOpenId(r.id)}>{r.judul}</button><small>{KATEGORI.find((k) => k.id === r.kategori)?.label}</small></td>
                        <td>{r.lokasi ?? '-'}</td>
                        <td><span className={`lap-urg lap-urg-${r.urgensi}`}>{URGENSI.find((u) => u.id === r.urgensi)?.label}</span>{r.terlambat && <span className="lap-badge lap-late">Terlambat</span>}</td>
                        <td><StatusBadge status={r.status} />{r.saranTerbaik && <span className="lap-badge lap-best">Terbaik</span>}</td>
                        <td>{r.pelapor ?? <i>Anonim</i>}</td>
                        <td>{r.penanggungJawab ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pages > 1 && (
              <div className="lap-toolbar" style={{ justifyContent: 'center' }}>
                <button type="button" className="game-ghost" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelected([]) }}>Sebelumnya</button>
                <span className="lap-empty">Halaman {page} dari {pages}</span>
                <button type="button" className="game-ghost" disabled={page >= pages} onClick={() => { setPage(page + 1); setSelected([]) }}>Berikutnya</button>
              </div>
            )}
          </>
        )}

        {tab === 'statistik' && role === 'admin' && <AdminLaporanStats />}
        {tab === 'pengaturan' && role === 'admin' && <SettingsForm settings={settings} onSaved={() => mutateSettings()} setNotice={setNotice} />}
      </section>

      {openId && <AdminLaporanDetail id={openId} role={role} waNumber={settings?.waAktif ? settings.waNomor : null} onClose={() => setOpenId(null)} onChanged={() => void mutate()} />}
    </main>
  )
}

function SettingsForm({ settings, onSaved, setNotice }: { settings?: Settings; onSaved: () => void; setNotice: (n: { ok: boolean; text: string }) => void }) {
  const [draft, setDraft] = useState<Settings | null>(null)
  const value = draft ?? settings ?? { spreadsheetUrl: '', waAktif: false, waNomor: '' }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    try {
      await fetchJson('/api/admin/laporan/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spreadsheetUrl: value.spreadsheetUrl ?? '', waAktif: value.waAktif, waNomor: value.waNomor ?? '' }) })
      setNotice({ ok: true, text: 'Pengaturan tersimpan.' })
      setDraft(null); onSaved()
    } catch (cause) {
      setNotice({ ok: false, text: cause instanceof Error ? cause.message : 'Pengaturan belum tersimpan.' })
    }
  }
  return (
    <form className="lap-form lap-settings" onSubmit={save}>
      <label>Tautan Google Spreadsheet laporan (untuk tombol &quot;Buka Spreadsheet&quot;)
        <input type="url" placeholder="https://docs.google.com/spreadsheets/d/…" value={value.spreadsheetUrl ?? ''} onChange={(e) => setDraft({ ...value, spreadsheetUrl: e.target.value })} />
      </label>
      <label className="lap-check"><input type="checkbox" checked={value.waAktif} onChange={(e) => setDraft({ ...value, waAktif: e.target.checked })} /> Aktifkan tombol &quot;Hubungi via WhatsApp&quot; pada laporan urgensi Tinggi</label>
      <label>Nomor WhatsApp tujuan
        <input inputMode="tel" placeholder="081234567890" value={value.waNomor ?? ''} onChange={(e) => setDraft({ ...value, waNomor: e.target.value })} />
        <small>Sinkronisasi memakai URL Apps Script dan token yang sudah diatur di Pengaturan Sheets.</small>
      </label>
      <button className="game-play">Simpan pengaturan</button>
    </form>
  )
}
