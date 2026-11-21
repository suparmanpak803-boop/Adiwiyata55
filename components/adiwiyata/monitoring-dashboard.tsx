'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ExternalLink, Leaf, Recycle, Users } from 'lucide-react'
import type { SpreadsheetSummary } from '@/app/actions/deposits'
import { fetchJson } from '@/lib/api-client'

const chartColors = ['#236b4d', '#8dbb78', '#d7e8a5', '#5f8d73', '#c99b61']

export function MonitoringDashboard({ summary: initialSummary, initialError, classes, role }: {
  summary: SpreadsheetSummary | null
  initialError: string | null
  classes: { name: string; grade: string; rombel: string }[]
  role: 'admin' | 'petugas' | 'pengunjung'
}) {
  const [summary, setSummary] = useState(initialSummary)
  const [error, setError] = useState(initialError)
  const [pending, startTransition] = useTransition()
  const [filters, setFilters] = useState({ from: '', to: '', grade: 'all', classNames: [] as string[] })
  const totalKg = summary?.totalKg ?? 0
  const entryCount = summary?.recordCount ?? 0
  const classRows = summary?.byClass ?? []
  const classRankRows = classRows.filter((item) => ['X', 'XI', 'XII'].includes(item.grade))
  const wasteRows = Object.entries(summary?.totalsByType ?? {}).map(([name, value]) => ({ name, value }))
  const monthRows = Object.entries(summary?.byMonth ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, value }))
  const gradeRows = summary?.byGrade ?? []
  const weekLabels = Array.from(new Set((summary?.weeklyByGrade ?? []).map((item) => item.week))).sort()
  const weeklyRows = weekLabels.map((week) => ({
    week,
    X: summary?.weeklyByGrade.find((item) => item.week === week && item.grade === 'X')?.totalKg ?? 0,
    XI: summary?.weeklyByGrade.find((item) => item.week === week && item.grade === 'XI')?.totalKg ?? 0,
    XII: summary?.weeklyByGrade.find((item) => item.week === week && item.grade === 'XII')?.totalKg ?? 0,
  }))
  const classFilterOptions = filters.grade === 'all' ? classes : classes.filter((item) => item.grade === filters.grade)
  const weightRanking = classRankRows.slice().sort((a, b) => b.totalKg - a.totalKg || a.className.localeCompare(b.className))
  const complianceRanking = classRankRows.filter((item) => item.entries > 0).slice().sort((a, b) => b.compliancePercent - a.compliancePercent || a.className.localeCompare(b.className))

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (filters.from) params.set('from', filters.from)
        if (filters.to) params.set('to', filters.to)
        if (filters.grade !== 'all') params.set('grade', filters.grade)
        if (filters.classNames.length) params.set('classNames', filters.classNames.join(','))
        const result = await fetchJson<{ success?: boolean; error?: string } & Partial<SpreadsheetSummary>>(`/api/submit?${params.toString()}`, { cache: 'no-store' })
        if (!result.success) throw new Error(result.error || 'Rekap Spreadsheet belum dapat dimuat.')
        setSummary(result as SpreadsheetSummary)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Rekap Spreadsheet belum dapat dimuat.')
      }
    })
  }


  return (
    <section className="directory-page monitoring-page" aria-labelledby="monitoring-title">
      <div className="directory-heading">
        <div><span className="eyebrow">DATA LINGKUNGAN · GOOGLE SHEETS</span><h1 id="monitoring-title">Dashboard Monitoring</h1><p>Rekap setoran dan kepatuhan wadah makan yang tercatat.</p></div>
        <div className="monitoring-actions">{summary?.spreadsheetUrl && role !== 'pengunjung' && <a className="text-button spreadsheet-link" href={summary.spreadsheetUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Buka Spreadsheet</a>}</div>
      </div>
      <form className="monitoring-filters" onSubmit={applyFilters} aria-label="Filter rekap kelas">
        <label className="deposit-field"><span>Dari tanggal</span><input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
        <label className="deposit-field"><span>Sampai tanggal</span><input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
        {role === 'admin' && <>
          <label className="deposit-field"><span>Tingkat</span><select value={filters.grade} onChange={(event) => setFilters((current) => ({ ...current, grade: event.target.value, classNames: [] }))}><option value="all">Semua tingkat</option><option value="X">X</option><option value="XI">XI</option><option value="XII">XII</option></select></label>
          <fieldset className="monitoring-class-filter"><legend>Kelas <small>(pilih satu atau lebih)</small></legend><div className="monitoring-class-options">{classFilterOptions.map((item) => <label key={item.name} className="monitoring-class-chip"><input type="checkbox" checked={filters.classNames.includes(item.name)} onChange={(event) => setFilters((current) => ({ ...current, classNames: event.target.checked ? [...current.classNames, item.name] : current.classNames.filter((name) => name !== item.name) }))} /><span>{item.name}</span></label>)}</div></fieldset>
        </>}
        <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Memuat…' : 'Terapkan filter'}</button>
      </form>
      {error && <div className="sheets-error" role="alert"><strong>Belum dapat terhubung ke Google Sheets</strong><span>{error}</span>{role === 'admin' && <details><summary>Panduan konfigurasi untuk Admin</summary><ol><li>Buat Google Spreadsheet dan buka Extensions → Apps Script.</li><li>Salin kode dari folder <code>apps-script/Code.gs</code> ke editor Apps Script.</li><li>Tambahkan <code>SHEETS_SECRET_TOKEN</code> di Script Properties Apps Script.</li><li>Pilih Deploy → New deployment → Web app; Execute as: Me, Access: Anyone, lalu Deploy.</li><li>Salin URL deployment dan token ke menu <strong>Pengaturan Sheets</strong> di portal Admin.</li></ol></details>}</div>}
      <div className="monitoring-kpis">
        <article className="monitoring-kpi"><span><Recycle aria-hidden="true" /></span><small>Total sampah terpilah</small><strong>{totalKg.toLocaleString('id-ID', { maximumFractionDigits: 2 })}<em> kg</em></strong></article>
        <article className="monitoring-kpi"><span><Leaf aria-hidden="true" /></span><small>Baris setoran di Spreadsheet</small><strong>{entryCount.toLocaleString('id-ID')}<em> baris</em></strong></article>
        <article className="monitoring-kpi"><span><Users aria-hidden="true" /></span><small>Kelas berpartisipasi</small><strong>{classRankRows.filter((row) => row.entries > 0).length}<em> kelas</em></strong></article>
        <article className="monitoring-kpi"><span><Leaf aria-hidden="true" /></span><small>Wadah guna ulang dicatat</small><strong>{classRows.reduce((total, row) => total + row.tumbler + row.lunchbox, 0).toLocaleString('id-ID')}<em> penggunaan</em></strong></article>
      </div>
      <section className="grade-summary-grid" aria-label="Ringkasan per tingkat">
        {gradeRows.map((item) => <article className="grade-summary-card" key={item.grade}><span className="eyebrow">TINGKAT {item.grade}</span><strong>{item.totalKg.toLocaleString('id-ID', { maximumFractionDigits: 2 })}<small> kg</small></strong><span>Kepatuhan wadah makan <b>{Math.round(item.compliancePercent)}%</b></span></article>)}
      </section>
      <div className="monitoring-chart-grid">
        <article className="monitoring-chart-card"><div className="subsection-heading"><div><span className="eyebrow">KOMPOSISI SAMPAH</span><h2>Total per jenis</h2></div></div>{wasteRows.length ? <div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={wasteRows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%" label={({ name, value }) => `${name}: ${Number(value).toFixed(1)} kg`}>{wasteRows.map((row, index) => <Cell key={row.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => `${Number(value).toLocaleString('id-ID')} kg`} /></PieChart></ResponsiveContainer></div> : <p className="chart-empty">Belum ada data jenis sampah.</p>}</article>
        <article className="monitoring-chart-card"><div className="subsection-heading"><div><span className="eyebrow">TREN BULANAN</span><h2>Total berat per bulan</h2></div></div>{monthRows.length ? <div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthRows} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="month" tick={{ fill: 'var(--ink-soft)', fontSize: 10 }} /><YAxis tick={{ fill: 'var(--ink-soft)', fontSize: 10 }} /><Tooltip formatter={(value) => `${Number(value).toLocaleString('id-ID')} kg`} /><Bar dataKey="value" name="Berat" fill={chartColors[0]} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="chart-empty">Belum ada data bulanan.</p>}</article>
      </div>
      <div className="monitoring-chart-grid grade-trend-grid">
        <article className="monitoring-chart-card"><div className="subsection-heading"><div><span className="eyebrow">PERBANDINGAN TINGKAT</span><h2>Total sampah terpilah</h2></div></div>{gradeRows.length ? <div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><BarChart data={gradeRows} margin={{ top: 10, right: 12, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="grade" tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} /><YAxis tick={{ fill: 'var(--ink-soft)', fontSize: 10 }} /><Tooltip formatter={(value) => `${Number(value).toLocaleString('id-ID')} kg`} /><Bar dataKey="totalKg" name="Sampah terpilah" fill={chartColors[0]} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="chart-empty">Belum ada data tingkat.</p>}</article>
        <article className="monitoring-chart-card"><div className="subsection-heading"><div><span className="eyebrow">TREN MINGGUAN</span><h2>Sampah terpilah per tingkat</h2></div></div>{weeklyRows.length ? <div className="chart-frame"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeklyRows} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="week" tick={{ fill: 'var(--ink-soft)', fontSize: 9 }} /><YAxis tick={{ fill: 'var(--ink-soft)', fontSize: 10 }} /><Tooltip formatter={(value) => `${Number(value).toLocaleString('id-ID')} kg`} /><Legend /><Line type="monotone" dataKey="X" stroke={chartColors[0]} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="XI" stroke={chartColors[1]} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="XII" stroke={chartColors[4]} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div> : <p className="chart-empty">Belum ada tren mingguan.</p>}</article>
      </div>
      <div className="monitoring-rank-grid">
        <article className="monitoring-table-wrap"><div className="subsection-heading"><div><span className="eyebrow">PERINGKAT SELURUH KELAS</span><h2>Sampah terpilah terbanyak</h2></div></div><div className="monitoring-table-scroll"><table className="monitoring-table"><thead><tr><th scope="col">Peringkat</th><th scope="col">Kelas</th><th scope="col">Total berat</th></tr></thead><tbody>{weightRanking.map((row, index) => <tr key={row.className}><td><span className={`rank-chip${index < 3 ? ' rank-highlight' : ''}`}>{String(index + 1).padStart(2, '0')}</span></td><th scope="row">{row.className}</th><td><strong>{row.totalKg.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg</strong></td></tr>)}</tbody></table></div></article>
        <article className="monitoring-table-wrap"><div className="subsection-heading"><div><span className="eyebrow">PERINGKAT SELURUH KELAS</span><h2>Kepatuhan wadah makan</h2></div></div>{complianceRanking.length ? <div className="monitoring-table-scroll"><table className="monitoring-table"><thead><tr><th scope="col">Peringkat</th><th scope="col">Kelas</th><th scope="col">Persentase patuh</th></tr></thead><tbody>{complianceRanking.map((row, index) => <tr key={row.className}><td><span className={`rank-chip${index < 3 ? ' rank-highlight' : ''}`}>{String(index + 1).padStart(2, '0')}</span></td><th scope="row">{row.className}</th><td><strong>{Math.round(row.compliancePercent)}%</strong></td></tr>)}</tbody></table></div> : <p className="chart-empty">Belum ada data kepatuhan.</p>}</article>
      </div>
      <section className="grade-ranking-section"><div className="subsection-heading"><div><span className="eyebrow">PERINGKAT TERPISAH</span><h2>Peringkat per tingkat</h2></div></div><div className="grade-ranking-grid">{['X', 'XI', 'XII'].map((grade) => {
        const rows = classRankRows.filter((item) => item.grade === grade).slice().sort((a, b) => b.totalKg - a.totalKg || a.className.localeCompare(b.className))
        return <article className="grade-ranking-card" key={grade}><h3>Tingkat {grade}</h3><div className="monitoring-table-scroll"><table className="monitoring-table"><thead><tr><th scope="col">#</th><th scope="col">Kelas</th><th scope="col">Berat</th><th scope="col">Patuh</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.className}><td><span className={`rank-chip${index < 3 ? ' rank-highlight' : ''}`}>{String(index + 1).padStart(2, '0')}</span></td><th scope="row">{row.className}</th><td>{row.totalKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</td><td>{Math.round(row.compliancePercent)}%</td></tr>)}</tbody></table></div></article>
      })}</div></section>
      <p className="monitoring-footnote">Persentase kepatuhan dihitung dari laporan harian yang mencatat setidaknya satu siswa membawa tumbler atau lunch box. Rekap bersumber dari Google Sheets; akses Petugas dibatasi ke kelas yang ditugaskan.</p>
    </section>
  )
}
