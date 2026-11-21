'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { ArrowDown, ArrowUp, Download, Leaf, Medal, RefreshCw, ShieldCheck, Trophy } from 'lucide-react'
import { fetchJson } from '@/lib/api-client'
import './leaderboard.css'

const tabs = [
  { id: 'pengguna', label: 'Pengguna' },
  { id: 'kelas', label: 'Kelas' },
  { id: 'game', label: 'Per Game' },
  { id: 'sampah', label: 'Sampah Kelas' },
  { id: 'riwayat', label: 'Riwayat' },
] as const
const games = [
  ['tangkap_sampah', 'Tangkap Sampah'],
  ['kuis_adiwiyata', 'Kuis Adiwiyata'],
] as const
const wasteTypes = [['all', 'Semua jenis'], ['organic', 'Organik'], ['inorganic', 'Anorganik'], ['paper', 'Kertas'], ['residual', 'Residu'], ['hazardous', 'B3']] as const
const fetcher = (url: string) => fetchJson<LeaderboardPayload>(url, { cache: 'no-store' })
type LeaderboardPayload = {
  tab: string
  state: { reset_berikutnya: string | null; mulai: string }
  rows: Record<string, unknown>[]
  insufficient?: Record<string, unknown>[]
  summary?: { total_kg: number | string; jumlah_kelas: number }
  minimumDays?: number
  currentUserId: string
  currentClass: string | null
  currentRank?: number | null
  period?: string
  metric?: string
  settings?: { tampil_tersedikit: boolean; tampil_terbanyak: boolean; metrik_default: string } | null
}

function formatNumber(value: unknown, digits = 0) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(Number(value ?? 0))
}
function formatDate(value: string | null | undefined) {
  if (!value) return 'Belum dijadwalkan'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value)) + ' WIB'
}
function downloadCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const columns = ['peringkat', 'nama_tampil', 'nama', 'kode_kelas', 'skor', 'total_kg', 'kg_per_siswa', 'organic', 'inorganic', 'paper', 'residual', 'hazardous', 'kepatuhan', 'days', 'tren_persen']
  const present = columns.filter((column) => rows.some((row) => column in row))
  const csv = [present.join(','), ...rows.map((row) => present.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'leaderboard-adiwiyata.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function LeaderboardPage({ initialTab = 'pengguna', initialInitials = false }: { initialTab?: string; initialInitials?: boolean }) {
  const [tab, setTab] = useState(tabs.some((item) => item.id === initialTab) ? initialTab : 'pengguna')
  const [grade, setGrade] = useState('all')
  const [game, setGame] = useState<string>(games[0][0])
  const [scope, setScope] = useState('angkatan')
  const [wastePeriod, setWastePeriod] = useState('')
  const [wasteType, setWasteType] = useState('all')
  const [metric, setMetric] = useState('')
  const [sort, setSort] = useState('terbanyak')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showInitials, setShowInitials] = useState(initialInitials)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [privacyMessage, setPrivacyMessage] = useState('')
  const params = useMemo(() => {
    const query = new URLSearchParams({ tab, grade })
    if (tab === 'game') query.set('game', game)
    if (tab === 'sampah') {
      query.set('scope', scope); query.set('type', wasteType); query.set('sort', sort)
      if (wastePeriod) query.set('period', wastePeriod)
      if (metric) query.set('metric', metric)
      if (grade !== 'all') query.set('grade', grade)
      if (wastePeriod === 'custom') { query.set('from', customFrom); query.set('to', customTo) }
    }
    return query.toString()
  }, [tab, grade, game, scope, wastePeriod, wasteType, metric, sort, customFrom, customTo])
  const { data, error, isLoading, mutate } = useSWR<LeaderboardPayload>(`/api/leaderboard?${params}`, fetcher, { refreshInterval: 60_000, revalidateOnFocus: true, keepPreviousData: true })
  const rows = data?.rows ?? []
  const showWasteSort = sort === 'terbanyak' ? data?.settings?.tampil_terbanyak !== false : data?.settings?.tampil_tersedikit !== false

  async function savePrivacy(value: boolean) {
    setShowInitials(value); setSavingPrivacy(true); setPrivacyMessage('')
    try {
      await fetchJson('/api/leaderboard/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tampilInisial: value }) })
      setPrivacyMessage('Pilihan privasi tersimpan.')
    } catch (err) {
      setShowInitials(!value)
      setPrivacyMessage(err instanceof Error ? err.message : 'Pilihan privasi gagal disimpan.')
    } finally { setSavingPrivacy(false) }
  }

  return (
    <main className="leaderboard-page">
      <header className="leaderboard-header">
        <a href="/" className="leaderboard-back">← Kembali ke beranda</a>
        <div className="leaderboard-title-row"><span className="leaderboard-mark"><Trophy aria-hidden="true" /></span><div><span className="eyebrow">ADIWIYATA · AKSI NYATA</span><h1>Leaderboard</h1><p>Apresiasi untuk warga sekolah yang terus bergerak menjaga bumi.</p></div></div>
        <div className="leaderboard-summary"><div><span>Periode berjalan</span><strong>{data?.state?.mulai ? formatDate(data.state.mulai) : 'Memuat periode…'}</strong></div><div><span>Reset berikutnya</span><strong>{formatDate(data?.state?.reset_berikutnya)}</strong></div></div>
      </header>

      <nav className="leaderboard-tabs" aria-label="Jenis leaderboard" role="tablist">
        {tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => { setTab(item.id); if (item.id === 'sampah' && grade === 'all') setGrade('X'); if (item.id !== 'sampah' && grade !== 'all') setGrade('all') }}>{item.label}</button>)}
      </nav>

      <section className="leaderboard-content" aria-live="polite">
        <div className="leaderboard-tools">
          {(tab === 'pengguna' || tab === 'kelas' || tab === 'game') && <label>Tingkat<select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="all">Semua tingkat</option><option value="X">Kelas X</option><option value="XI">Kelas XI</option><option value="XII">Kelas XII</option></select></label>}
          {tab === 'game' && <label>Pilih game<select value={game} onChange={(event) => setGame(event.target.value)}>{games.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}
          {tab === 'sampah' && <>
            <label>Lingkup<select value={scope} onChange={(event) => { setScope(event.target.value); if (event.target.value === 'semua') setGrade('all'); else if (grade === 'all') setGrade('X') }}><option value="angkatan">Per angkatan</option><option value="semua">Seluruh angkatan</option></select></label>
            {scope === 'angkatan' && <label>Angkatan<select value={grade === 'all' ? 'X' : grade} onChange={(event) => setGrade(event.target.value)}><option value="X">Kelas X</option><option value="XI">Kelas XI</option><option value="XII">Kelas XII</option></select></label>}
            <label>Periode<select value={wastePeriod || data?.period || 'bulan_ini'} onChange={(event) => setWastePeriod(event.target.value)}><option value="bulan_ini">Bulan ini</option><option value="minggu_ini">Minggu ini</option><option value="semester_ini">Semester ini</option><option value="30_hari">30 hari terakhir</option><option value="custom">Rentang kustom</option></select></label>
            <label>Jenis sampah<select value={wasteType} onChange={(event) => setWasteType(event.target.value)}>{wasteTypes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label>Metrik<select value={metric || data?.metric || 'total'} onChange={(event) => setMetric(event.target.value)}><option value="total">Total (kg)</option><option value="per_siswa">Per siswa (kg/siswa)</option></select></label>
            <label>Urutan<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="terbanyak">Terbanyak</option><option value="tersedikit">Tersedikit</option></select></label>
            {(wastePeriod || data?.period) === 'custom' && <><label>Dari<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label>Sampai<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label></>}
          </>}
          {tab !== 'sampah' && tab !== 'riwayat' && <span className="leaderboard-period-label">Periode berjalan</span>}
          <button type="button" className="leaderboard-refresh" onClick={() => void mutate()} aria-label="Muat ulang leaderboard"><RefreshCw aria-hidden="true" /> Perbarui</button>
        </div>

        {tab === 'pengguna' && <div className="privacy-setting"><label><input type="checkbox" checked={showInitials} disabled={savingPrivacy} onChange={(event) => void savePrivacy(event.target.checked)} /> Tampilkan sebagai inisial</label><span>{privacyMessage}</span></div>}
        {tab === 'sampah' && data?.summary && <div className="waste-summary"><div><span>Total terkumpul</span><strong>{formatNumber(data.summary.total_kg, 1)} kg</strong></div><div><span>Kelas dengan data</span><strong>{formatNumber(data.summary.jumlah_kelas)}</strong></div><div><span>Minimal hari input</span><strong>{data.minimumDays ?? 3} hari</strong></div></div>}
        {tab === 'sampah' && <p className="leaderboard-note"><ShieldCheck aria-hidden="true" /> Peringkat ini berdasarkan data pemilahan sampah asli dan tidak terpengaruh reset leaderboard game.</p>}

        {isLoading && <div className="leaderboard-state">Memuat peringkat terbaru…</div>}
        {error && <div className="leaderboard-state is-error" role="alert">{error.message}<button onClick={() => void mutate()}>Coba lagi</button></div>}
        {!isLoading && !error && rows.length === 0 && <div className="leaderboard-state">Belum ada data pada periode ini. Jadilah yang pertama memulai aksi baik.</div>}
        {!isLoading && !error && rows.length > 0 && <>
          {tab !== 'riwayat' && tab !== 'sampah' && <div className="leaderboard-podium" aria-label="Tiga peringkat teratas">{rows.slice(0, 3).map((row, index) => <article className={`podium-card place-${Number(row.peringkat ?? index + 1)}`} key={`${String(row.user_id ?? row.kode_kelas)}-${index}`}><span className="podium-medal"><Medal aria-hidden="true" /></span><strong>#{String(row.peringkat ?? index + 1)}</strong><b>{String(row.nama_tampil ?? row.nama ?? row.kode_kelas ?? '')}</b><span>{tab === 'kelas' ? `${formatNumber(row.skor, 1)} poin rata-rata` : `${formatNumber(row.skor)} poin`}</span></article>)}</div>}
          <div className="leaderboard-table-wrap"><table className="leaderboard-table"><thead><tr>{tab === 'sampah' ? <><th scope="col">Peringkat</th><th scope="col">Kelas</th><th scope="col">Total</th><th scope="col">Per siswa</th><th scope="col">Organik</th><th scope="col">Anorganik</th><th scope="col">Kertas</th><th scope="col">Residu</th><th scope="col">B3</th><th scope="col">Kepatuhan</th><th scope="col">Hari input</th><th scope="col">Tren</th></> : tab === 'riwayat' ? <><th scope="col">Tanggal arsip</th><th scope="col">Papan</th><th scope="col">Peringkat</th><th scope="col">Nama / kelas</th><th scope="col">Skor</th></> : <><th scope="col">Peringkat</th><th scope="col">Nama / kelas</th><th scope="col">Lencana</th><th scope="col">Poin</th></>}</tr></thead><tbody>{rows.map((row, index) => {
            const isOwn = tab === 'sampah' ? row.kode_kelas === data?.currentClass : row.user_id === data?.currentUserId
            const badgeList = Array.isArray(row.lencana) ? row.lencana as { badge_key: string; nama: string }[] : []
            return <tr className={isOwn ? 'is-own' : ''} key={`${String(row.user_id ?? row.kode_kelas ?? row.created_at)}-${String(row.peringkat ?? index)}`}>
              {tab === 'sampah' ? <><td>#{String(row.peringkat)}</td><th scope="row">{String(row.class_name ?? row.kode_kelas)}</th><td>{formatNumber(row.total_kg, 1)} kg</td><td>{formatNumber(row.kg_per_siswa, 2)} kg</td><td>{formatNumber(row.organic, 1)}</td><td>{formatNumber(row.inorganic, 1)}</td><td>{formatNumber(row.paper, 1)}</td><td>{formatNumber(row.residual, 1)}</td><td>{formatNumber(row.hazardous, 1)}</td><td>{formatNumber(row.kepatuhan, 1)}%</td><td>{formatNumber(row.days)}</td><td>{row.tren_persen == null ? '—' : `${Number(row.tren_persen) > 0 ? '▲' : Number(row.tren_persen) < 0 ? '▼' : '='} ${formatNumber(Math.abs(Number(row.tren_persen)), 1)}%`}</td></> : tab === 'riwayat' ? <><td>{formatDate(String(row.created_at))}</td><td>{String(row.papan)}</td><td>#{String(row.peringkat)}</td><th scope="row">{String(row.nama_tampil ?? row.nama ?? row.kode_kelas ?? '')}</th><td>{formatNumber(row.skor)}</td></> : <><td>#{String(row.peringkat)}</td><th scope="row">{String(row.nama_tampil ?? row.nama ?? row.kode_kelas ?? '')}{row.kode_kelas ? <small className="table-subtitle">{String(row.kode_kelas)}</small> : null}{isOwn && <small className="table-subtitle">Peringkatmu</small>}</th><td>{badgeList.length ? badgeList.map((badge) => badge.nama).join(', ') : '—'}</td><td>{formatNumber(row.skor)}</td></>}
            </tr>
          })}</tbody></table></div>
          {tab === 'sampah' && (data?.insufficient?.length ?? 0) > 0 && <section className="insufficient-data"><h2>Belum ada data cukup</h2><p>Kelas dengan jumlah hari input di bawah batas minimal tidak ikut diperingkat.</p><ul>{data?.insufficient?.map((row) => <li key={String(row.class_name)}>{String(row.class_name)} <span>{formatNumber(row.days)} / {data.minimumDays} hari{row.tanpa_jumlah_siswa ? ' · jumlah siswa belum diisi' : ''}</span></li>)}</ul></section>}
          {tab === 'sampah' && rows.length > 0 && <div className="leaderboard-export"><button type="button" className="leaderboard-refresh" onClick={() => downloadCsv(rows)}><Download aria-hidden="true" /> Ekspor CSV</button></div>}
        </>}
        {data?.currentRank && tab === 'pengguna' && <p className="current-rank">Peringkatmu: #{data.currentRank}</p>}
        {tab === 'sampah' && <div className="waste-rank-controls"><span>{sort === 'terbanyak' ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />} {showWasteSort ? `Urutan ${sort}` : 'Tampilan ini dinonaktifkan Admin'}</span></div>}
      </section>
      <footer className="leaderboard-footer"><Leaf aria-hidden="true" /> Aksi kecil hari ini, dampak besar untuk bumi.</footer>
    </main>
  )
}
