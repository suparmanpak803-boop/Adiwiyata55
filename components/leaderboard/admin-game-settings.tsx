'use client'

import { FormEvent, useState } from 'react'
import { AlertTriangle, Save, Settings2, ShieldCheck } from 'lucide-react'
import { fetchJson } from '@/lib/api-client'
import { hapusHariLibur, tambahHariLibur } from '@/app/actions/hari-libur'
import './leaderboard.css'

type AdminData = {
  settings: Record<string, unknown> | null
  games: Record<string, unknown>[]
  waste: Record<string, unknown> | null
  classes: Record<string, unknown>[]
  libur: { tanggal: string; keterangan: string }[]
}

function formatTanggalLibur(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
const gameLabels: Record<string, string> = {
  tangkap_sampah: 'Tangkap Sampah',
  kuis_adiwiyata: 'Kuis Adiwiyata',
}
const gameKeys = Object.keys(gameLabels)

export function AdminGameSettings({ initialData }: { initialData: AdminData }) {
  const setting = initialData.settings ?? {}
  const [mode, setMode] = useState(String(setting.mode ?? 'mingguan'))
  const [hari, setHari] = useState(Number(setting.hari ?? 1))
  const [tanggal, setTanggal] = useState(Number(setting.tanggal ?? 1))
  const [jam, setJam] = useState(String(setting.jam ?? '00:00').slice(0, 5))
  const [semesterStart, setSemesterStart] = useState(String(setting.tanggal_mulai_semester ?? ''))
  const [semesterEnd, setSemesterEnd] = useState(String(setting.tanggal_akhir_semester ?? ''))
  const [scope, setScope] = useState(String(setting.cakupan ?? 'semua'))
  const [gameKey, setGameKey] = useState(String(setting.game_key ?? gameKeys[0]))
  const [resetPoints, setResetPoints] = useState(setting.reset_poin_total === true)
  const [resetBadges, setResetBadges] = useState(setting.reset_lencana === true)
  const [autoRewards, setAutoRewards] = useState(setting.hadiah_otomatis !== false)
  const [wasteMetric, setWasteMetric] = useState(String(initialData.waste?.metrik_default ?? 'total'))
  const [minimumDays, setMinimumDays] = useState(Number(initialData.waste?.min_hari_input ?? 3))
  const quizSettings = initialData.games.find((item) => item.game_key === 'kuis_adiwiyata')?.konfigurasi as Record<string, unknown> | undefined
  const [quizCount, setQuizCount] = useState(Number(quizSettings?.jumlah_soal ?? 10))
  const [quizSeconds, setQuizSeconds] = useState(Number(quizSettings?.waktu_per_soal ?? 20))
  const [games, setGames] = useState(() => Object.fromEntries(gameKeys.map((key) => {
    const current = initialData.games.find((item) => item.game_key === key)
    return [key, { aktif: current?.aktif !== false, durasi_detik: Number(current?.durasi_detik ?? 60), tingkat_kesulitan: Number(current?.tingkat_kesulitan ?? 1) }]
  })))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [libur, setLibur] = useState(() => initialData.libur ?? [])
  const [newTanggal, setNewTanggal] = useState('')
  const [newKeterangan, setNewKeterangan] = useState('')
  const [liburBusy, setLiburBusy] = useState(false)
  const [liburMessage, setLiburMessage] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      await fetchJson('/api/admin/game', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, hari, tanggal, jam, tanggal_mulai_semester: semesterStart || null, tanggal_akhir_semester: semesterEnd || null, cakupan: scope, game_key: gameKey, reset_poin_total: resetPoints, reset_lencana: resetBadges, hadiah_otomatis: autoRewards, games: { ...games, kuis_adiwiyata: { ...games.kuis_adiwiyata, konfigurasi: { jumlah_soal: quizCount, waktu_per_soal: quizSeconds } } }, waste: { metrik_default: wasteMetric, min_hari_input: minimumDays, periode_default: 'bulan_ini', tampil_terbanyak: true, tampil_tersedikit: true } }),
      })
      setMessage('Pengaturan leaderboard berhasil disimpan.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Terjadi gangguan saat menyimpan.') }
    finally { setBusy(false) }
  }

  async function resetNow() {
    if (confirmation !== 'RESET') return
    setBusy(true); setMessage('')
    try {
      await fetchJson('/api/admin/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset', confirmation }) })
      setMessage('Periode baru dimulai. Peringkat sebelumnya tersimpan sebagai arsip.')
      setConfirmation('')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Reset gagal.') }
    finally { setBusy(false) }
  }

  async function tambahLibur() {
    if (!newTanggal) return
    setLiburBusy(true); setLiburMessage('')
    const result = await tambahHariLibur(newTanggal, newKeterangan)
    if (result.ok) {
      setLibur((current) => [...current.filter((item) => item.tanggal !== newTanggal), { tanggal: newTanggal, keterangan: newKeterangan.trim() }].sort((a, b) => a.tanggal.localeCompare(b.tanggal)))
      setNewTanggal(''); setNewKeterangan('')
      setLiburMessage('Hari libur ditambahkan.')
    } else setLiburMessage(result.error)
    setLiburBusy(false)
  }

  async function hapusLibur(tanggal: string) {
    setLiburBusy(true); setLiburMessage('')
    const result = await hapusHariLibur(tanggal)
    if (result.ok) {
      setLibur((current) => current.filter((item) => item.tanggal !== tanggal))
      setLiburMessage('Hari libur dihapus.')
    } else setLiburMessage(result.error)
    setLiburBusy(false)
  }

  return (
    <main className="admin-game-page">
      <a className="leaderboard-back" href="/">← Kembali ke portal</a>
      <header className="admin-game-header"><span className="leaderboard-mark"><Settings2 aria-hidden="true" /></span><div><span className="eyebrow">PANEL ADMINISTRATOR</span><h1>Pengaturan game & leaderboard</h1><p>Kelola periode, pengaturan permainan, dan kriteria leaderboard sampah.</p><a className="leaderboard-back" href="/admin/game/konten">Kelola konten permainan →</a><a className="leaderboard-back" href="/admin/diagnostik">Diagnostik sistem →</a></div></header>
      <form className="admin-game-form" onSubmit={save}>
        <section className="admin-setting-card"><div className="admin-setting-heading"><div><span className="eyebrow">01 / PERIODE</span><h2>Jadwal reset leaderboard</h2></div></div>
          <div className="admin-form-grid"><label>Frekuensi reset<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="harian">Harian</option><option value="mingguan">Mingguan</option><option value="bulanan">Bulanan</option><option value="semester">Akhir semester</option><option value="khusus">Kustom</option><option value="manual">Manual saja</option><option value="never">Nonaktif</option></select></label>
            {mode === 'mingguan' && <label>Hari reset<select value={hari} onChange={(event) => setHari(Number(event.target.value))}><option value={0}>Minggu</option><option value={1}>Senin</option><option value={2}>Selasa</option><option value={3}>Rabu</option><option value={4}>Kamis</option><option value={5}>Jumat</option><option value={6}>Sabtu</option></select></label>}
            {(mode === 'bulanan' || mode === 'khusus') && <label>Tanggal reset<input type="number" min={1} max={31} value={tanggal} onChange={(event) => setTanggal(Number(event.target.value))} /></label>}
            {mode === 'semester' && <><label>Mulai semester<input type="date" value={semesterStart} onChange={(event) => setSemesterStart(event.target.value)} required /></label><label>Akhir semester<input type="date" value={semesterEnd} onChange={(event) => setSemesterEnd(event.target.value)} required /></label></>}
            <label>Waktu reset (WIB)<input type="time" value={jam} onChange={(event) => setJam(event.target.value)} required /></label>
            <label>Cakupan reset<select value={scope} onChange={(event) => setScope(event.target.value)}><option value="semua">Semua leaderboard game</option><option value="game">Satu game</option><option value="kelas_pengguna">Leaderboard kelas dan pengguna</option></select></label>
            {scope === 'game' && <label>Game yang direset<select value={gameKey} onChange={(event) => setGameKey(event.target.value)}>{gameKeys.map((key) => <option key={key} value={key}>{gameLabels[key]}</option>)}</select></label>}
          </div>
          <div className="admin-check-list"><label><input type="checkbox" checked={resetPoints} onChange={(event) => setResetPoints(event.target.checked)} /> Reset poin total pengguna</label><label><input type="checkbox" checked={resetBadges} onChange={(event) => setResetBadges(event.target.checked)} /> Reset lencana pengguna</label><label><input type="checkbox" checked={autoRewards} onChange={(event) => setAutoRewards(event.target.checked)} /> Berikan lencana otomatis kepada peringkat teratas</label></div>
          <p className="admin-setting-note"><AlertTriangle aria-hidden="true" /> Reset hanya mengarsipkan peringkat dan membuka periode game baru. Data setoran sampah tidak akan dihapus.</p>
        </section>
        <section className="admin-setting-card"><div className="admin-setting-heading"><div><span className="eyebrow">02 / PERMAINAN</span><h2>Durasi, kesulitan & status</h2></div></div>
          <div className="game-settings-grid">{gameKeys.map((key) => <article className="game-setting-row" key={key}><div className="game-setting-title"><strong>{gameLabels[key]}</strong><label><input type="checkbox" checked={games[key].aktif} onChange={(event) => setGames((current) => ({ ...current, [key]: { ...current[key], aktif: event.target.checked } }))} /> Aktif</label></div><label>Durasi (detik)<input type="number" min={15} max={600} value={games[key].durasi_detik} onChange={(event) => setGames((current) => ({ ...current, [key]: { ...current[key], durasi_detik: Number(event.target.value) } }))} /></label><label>Kesulitan<select value={games[key].tingkat_kesulitan} onChange={(event) => setGames((current) => ({ ...current, [key]: { ...current[key], tingkat_kesulitan: Number(event.target.value) } }))}><option value={1}>Mudah</option><option value={2}>Menengah</option><option value={3}>Standar</option><option value={4}>Sulit</option><option value={5}>Tantangan</option></select></label>{key === 'kuis_adiwiyata' && <div className="admin-quiz-config"><label>Jumlah soal<input type="number" min={5} max={20} value={quizCount} onChange={(event) => setQuizCount(Number(event.target.value))} /></label><label>Waktu per soal (detik)<input type="number" min={5} max={20} value={quizSeconds} onChange={(event) => setQuizSeconds(Number(event.target.value))} /></label></div>}</article>)}</div>
        </section>
        <section className="admin-setting-card"><div className="admin-setting-heading"><div><span className="eyebrow">03 / DATA SAMPAH</span><h2>Persyaratan leaderboard sampah</h2></div></div><div className="admin-form-grid"><label>Metrik awal<select value={wasteMetric} onChange={(event) => setWasteMetric(event.target.value)}><option value="total">Total kg</option><option value="per_siswa">Kg per siswa</option></select></label><label>Minimal hari input untuk masuk peringkat<input type="number" min={1} max={31} value={minimumDays} onChange={(event) => setMinimumDays(Number(event.target.value))} /></label></div><p className="admin-setting-note"><ShieldCheck aria-hidden="true" /> Peringkat sampah menggunakan data laporan tersimpan, terpisah dari reset leaderboard game.</p></section>
        <section className="admin-setting-card"><div className="admin-setting-heading"><div><span className="eyebrow">04 / HARI LIBUR</span><h2>Hari libur sekolah</h2></div></div>
          <p className="admin-setting-note">Tanggal merah dan libur sekolah mengurangi hitungan hari sekolah efektif untuk rata-rata pengumpulan sampah per hari sekolah. Daftar mulai kosong — bila kosong, hitungan memakai Senin–Jumat saja.</p>
          <div className="admin-form-grid"><label>Tanggal libur<input type="date" value={newTanggal} onChange={(event) => setNewTanggal(event.target.value)} /></label><label>Keterangan<input value={newKeterangan} onChange={(event) => setNewKeterangan(event.target.value)} maxLength={100} placeholder="Mis. Hari Raya Idulfitri" /></label><button type="button" className="admin-save-button" onClick={() => void tambahLibur()} disabled={liburBusy || !newTanggal}>Tambah hari libur</button></div>
          {libur.length === 0 ? <p className="admin-setting-note">Belum ada hari libur yang tercatat.</p> : <ul className="libur-list">{libur.map((item) => <li key={item.tanggal}><span><strong>{formatTanggalLibur(item.tanggal)}</strong>{item.keterangan ? ` — ${item.keterangan}` : ''}</span><button type="button" onClick={() => void hapusLibur(item.tanggal)} disabled={liburBusy}>Hapus</button></li>)}</ul>}
          <p role="status">{liburMessage}</p>
        </section>
        <div className="admin-save-row"><p role="status">{message}</p><button className="admin-save-button" type="submit" disabled={busy}><Save aria-hidden="true" /> {busy ? 'Menyimpan…' : 'Simpan pengaturan'}</button></div>
      </form>
      <section className="admin-setting-card admin-reset-card"><div><span className="eyebrow">TINDAKAN MANUAL</span><h2>Mulai periode baru sekarang</h2><p>Leaderboard aktif akan diarsipkan untuk pengguna, kelas, dan game. Data pada periode baru dimulai dari nol.</p></div><div className="admin-reset-controls"><label>Ketik RESET untuk mengonfirmasi<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label><button type="button" onClick={() => void resetNow()} disabled={busy || confirmation !== 'RESET'}>Reset leaderboard</button></div></section>
      <div className="admin-class-info"><h2>Jumlah siswa per kelas</h2><p>Leaderboard per-siswa memerlukan jumlah siswa yang dikelola pada data kelas.</p><ul>{initialData.classes.map((item) => <li key={String(item.name)}>{String(item.name)} <span>{item.student_count ? `${item.student_count} siswa` : 'Belum diatur'}</span></li>)}</ul></div>
    </main>
  )
}
