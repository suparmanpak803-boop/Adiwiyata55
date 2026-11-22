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

type PratinjauRollover = {
  tahunAjaran: string
  sudahDijalankan: boolean
  adaCadangan: boolean
  sudahDipulihkan: boolean
  renames: { dari: string; ke: string }[]
  archives: string[]
  archivesX: string[]
  archivesXII: string[]
  arsipDipindah: { dari: string; ke: string }[]
  dilewati: string[]
  peranDiperbarui: number
  lulusanDiputus: number
  peranXDikosongkan: number
  cadangan: { kelasXI: number; kelasX: number; kelasXII: number }
}
type HasilRollover =
  | { ok: true; tahunAjaran: string; ringkasan: { dipromosikan: { dari: string; ke: string }[]; diarsipkan: string[]; arsipDipindah: { dari: string; ke: string }[]; dilewati: string[]; peranDiperbarui: number; lulusanDiputus: number; peranXDikosongkan: number; dipaksa: boolean } }
  | { ok: false; tahunAjaran: string; sudahDijalankan: boolean; error: string }
type HasilPulihkan =
  | { ok: true; tahunAjaran: string; kelasDipulihkan: number; peranDipulihkan: number }
  | { ok: false; tahunAjaran: string; error: string }

export function SystemDiagnostics() {
  const { data, error, isLoading, mutate } = useSWR<Envelope<DiagnosticData>>('/api/admin/diagnostik', (url: string) => fetchJson<Envelope<DiagnosticData>>(url, { cache: 'no-store' }))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [pratinjau, setPratinjau] = useState<PratinjauRollover | null>(null)
  const [jalankanSiap, setJalankanSiap] = useState(false)
  const [paksaSiap, setPaksaSiap] = useState(false)
  const [pulihkanSiap, setPulihkanSiap] = useState(false)

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

  async function lihatPratinjauTahunAjaran() {
    setBusy(true); setNotice(''); setJalankanSiap(false); setPaksaSiap(false); setPulihkanSiap(false)
    try {
      const result = await fetchJson<Envelope<PratinjauRollover>>('/api/admin/diagnostik', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'pratinjau_tahun_ajaran' }),
      })
      setPratinjau(result.data)
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Pratinjau belum dapat dimuat.')
    } finally { setBusy(false) }
  }

  async function jalankanTahunAjaran(paksa: boolean) {
    setBusy(true); setNotice('')
    try {
      const result = await fetchJson<Envelope<HasilRollover>>('/api/admin/diagnostik', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'jalankan_tahun_ajaran', paksa }),
      })
      const hasil = result.data
      if (!hasil.ok) {
        setNotice(hasil.sudahDijalankan ? `Pergantian tahun ajaran ${hasil.tahunAjaran} sudah pernah dijalankan. Gunakan jalankan ulang (paksa) bila memang perlu.` : hasil.error)
      } else {
        const ringkasan = hasil.ringkasan
        setNotice(`Pergantian tahun ajaran ${hasil.tahunAjaran} selesai${ringkasan.dipaksa ? ' (paksa)' : ''}: ${ringkasan.dipromosikan.length} kelas dipromosikan, ${ringkasan.diarsipkan.length} kelas diarsipkan, ${ringkasan.lulusanDiputus} akun lulusan diputus dari kelas, ${ringkasan.peranXDikosongkan} peran X dikosongkan, ${ringkasan.peranDiperbarui} peran diperbarui.`)
        setPratinjau(null)
      }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Pergantian tahun ajaran belum dapat dijalankan.')
    } finally { setBusy(false); setJalankanSiap(false); setPaksaSiap(false) }
  }

  async function pulihkanCadanganXI() {
    setBusy(true); setNotice('')
    try {
      const result = await fetchJson<Envelope<HasilPulihkan>>('/api/admin/diagnostik', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'pulihkan_cadangan_tahun_ajaran' }),
      })
      const hasil = result.data
      if (!hasil.ok) {
        setNotice(hasil.error)
      } else {
        setNotice(`Cadangan XI tahun ajaran ${hasil.tahunAjaran} dipulihkan: ${hasil.kelasDipulihkan} kelas dikembalikan ke XI dan ${hasil.peranDipulihkan} peran siswa dikembalikan.`)
        await lihatPratinjauTahunAjaran()
      }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Cadangan belum dapat dipulihkan.')
    } finally { setBusy(false); setPulihkanSiap(false) }
  }

  async function eksporArsipExcel() {
    setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/admin/arsip-excel', { cache: 'no-store' })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { pesan?: string } | null
        throw new Error(body?.pesan ?? `Ekspor gagal (${response.status}).`)
      }
      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') ?? ''
      const cocok = /filename="([^"]+)"/.exec(disposition)
      const namaFile = cocok?.[1] ?? 'Arsip Adiwiyata55.xlsx'
      const url = URL.createObjectURL(blob)
      const tautan = document.createElement('a')
      tautan.href = url
      tautan.download = namaFile
      document.body.appendChild(tautan)
      tautan.click()
      tautan.remove()
      URL.revokeObjectURL(url)
      setNotice(`Arsip Excel berhasil diunduh (${namaFile}).`)
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Arsip Excel belum dapat diunduh.')
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
      <section className="admin-setting-card diagnostics-seed"><div><span className="eyebrow">TAHUN AJARAN</span><h2>Pergantian tahun ajaran</h2><p>Setiap awal tahun ajaran: kelas XI naik ke XII (orangnya tetap sama) dan kelas XII yang lulus diarsipkan. Kelas X lama ikut diarsipkan — siswa kelas X diacak ulang ke kelas XI berdasarkan jurusan (rolling), jadi peran siswa X dikosongkan untuk ditetapkan ulang admin setelah hasil rolling keluar. Sebelum XI naik, diambil salinan pengaman (cadangan) kelas XI beserta perannya, yang bisa dipulihkan bila promosi ternyata salah. Data dan riwayat tetap tersimpan, tidak dihapus. Setoran sampah tidak disentuh. Otomatis berjalan tiap 12 Juli 00:00 WIB; tombol di bawah hanya untuk menjalankan manual.</p><p>Pembaruan sheet Master_Kelas tetap manual: tambah kelas X baru dan kelas XI hasil rolling, nonaktifkan kelas XII di sheet, lalu isi jumlah siswa kelas baru lewat pengelolaan kelas.</p>
        {pratinjau && <div className="diagnostics-preview"><p><strong>Tahun ajaran {pratinjau.tahunAjaran}</strong>{pratinjau.sudahDijalankan ? ' — sudah pernah dijalankan.' : ''}</p><p>Dipromosikan: {pratinjau.renames.length} kelas ({pratinjau.renames.map((item) => `${item.dari} → ${item.ke}`).join(', ') || '—'})</p><p>Diarsipkan (lulus): {pratinjau.archivesXII.length} kelas ({pratinjau.archivesXII.join(', ') || '—'})</p><p>Diarsipkan (kelas X lama): {pratinjau.archivesX.length} kelas ({pratinjau.archivesX.join(', ') || '—'})</p>{pratinjau.arsipDipindah.length > 0 && <p>Nama arsip dipindah: {pratinjau.arsipDipindah.map((item) => `${item.dari} → ${item.ke}`).join(', ')}</p>}{pratinjau.dilewati.length > 0 && <p>Dilewati: {pratinjau.dilewati.join(', ')}</p>}<p>Peran diperbarui: {pratinjau.peranDiperbarui} · Akun lulusan diputus dari kelas: {pratinjau.lulusanDiputus} · Peran X dikosongkan: {pratinjau.peranXDikosongkan}</p><p>Cadangan yang akan diambil: {pratinjau.cadangan.kelasXI} baris kelas XI, {pratinjau.cadangan.kelasX} baris kelas X, {pratinjau.cadangan.kelasXII} baris kelas XII (hanya data kelas, tanpa daftar murid).</p>{pratinjau.adaCadangan && <p>Cadangan tersedia untuk tahun ajaran ini{pratinjau.sudahDipulihkan ? ' — sudah pernah dipulihkan.' : '.'}</p>}</div>}
      </div><button className="admin-save-button" type="button" disabled={busy} onClick={() => void lihatPratinjauTahunAjaran()}>{busy ? 'Memuat…' : 'Lihat Pratinjau'}</button>
        {pratinjau && !pratinjau.sudahDijalankan && <button className="admin-save-button" type="button" disabled={busy} onClick={() => { if (!jalankanSiap) { setJalankanSiap(true); return } void jalankanTahunAjaran(false) }}>{busy ? 'Menjalankan…' : jalankanSiap ? 'Ketuk lagi untuk menjalankan' : 'Jalankan Pergantian Tahun Ajaran'}</button>}
        {pratinjau && pratinjau.sudahDijalankan && <><p>Jalankan ulang hanya bila rollover sebelumnya gagal di tengah jalan — kelas akan dipromosikan lagi dari kondisi saat ini.</p><button className="admin-save-button" type="button" disabled={busy} onClick={() => { if (!paksaSiap) { setPaksaSiap(true); return } void jalankanTahunAjaran(true) }}>{busy ? 'Menjalankan…' : paksaSiap ? 'Ketuk lagi untuk menjalankan ulang (paksa)' : 'Jalankan Ulang (Paksa)'}</button></>}
        {pratinjau && pratinjau.adaCadangan && !pratinjau.sudahDipulihkan && <><p>Salinan pengaman kelas XI tersedia. Pulihkan hanya bila promosi XI ke XII ternyata salah — kelas dikembalikan ke XI dan peran di kelas XII dikembalikan ke XI berdasarkan nama kelas. Peran siswa X tidak ikut dipulihkan: tidak ada data perorangan yang disimpan, jadi peran X ditetapkan ulang admin setelah rolling.</p><button className="admin-save-button" type="button" disabled={busy} onClick={() => { if (!pulihkanSiap) { setPulihkanSiap(true); return } void pulihkanCadanganXI() }}>{busy ? 'Memulihkan…' : pulihkanSiap ? 'Ketuk lagi untuk memulihkan cadangan XI' : 'Pulihkan cadangan XI'}</button></>}
        <p>Unduh arsip tahun ajaran berjalan sebagai file Excel (daftar kelas, rekap sampah per kelas, dan peringkat akhir). File yang sama juga diambil pekerjaan terjadwal untuk diunggah ke Drive tiap pergantian tahun ajaran.</p>
        <button className="admin-save-button" type="button" disabled={busy} onClick={() => void eksporArsipExcel()}>{busy ? 'Menyiapkan…' : 'Ekspor arsip Excel'}</button>
      </section>
    </main>
  )
}
