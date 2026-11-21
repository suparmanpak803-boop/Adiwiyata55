'use client'

import useSWR from 'swr'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetcher } from '../shared'

type Point = { name: string; label?: string; jumlah: number }

function Chart({ title, data, horizontal = false }: { title: string; data: Point[]; horizontal?: boolean }) {
  const rows = data.map((d) => ({ ...d, nama: d.label ?? d.name }))
  const total = rows.reduce((sum, row) => sum + row.jumlah, 0)
  return (
    <figure className="lap-chart">
      <figcaption>{title}</figcaption>
      {total === 0 ? <p className="lap-empty">Belum ada data.</p> : (
        <div role="img" aria-label={`${title}: ${rows.map((r) => `${r.nama} ${r.jumlah}`).join(', ')}`} style={{ height: horizontal ? Math.max(180, rows.length * 34) : 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 24 : 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              {horizontal ? <><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="nama" width={110} tick={{ fontSize: 11 }} /></> : <><XAxis dataKey="nama" tick={{ fontSize: 10 }} interval={0} angle={rows.length > 6 ? -35 : 0} textAnchor={rows.length > 6 ? 'end' : 'middle'} height={rows.length > 6 ? 60 : 30} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} /></>}
              <Tooltip cursor={{ fill: 'color-mix(in srgb, var(--sage) 50%, transparent)' }} />
              <Bar dataKey="jumlah" name="Laporan" fill="var(--green)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  )
}

export function AdminLaporanStats() {
  const { data, error, isLoading } = useSWR<{ kategori: Point[]; bulan: Point[]; tingkat: Point[]; lokasi: Point[] }>('/api/admin/laporan/stats', fetcher)
  if (isLoading) return <p className="lap-empty">Memuat statistik…</p>
  if (error) return <p className="lap-error" role="alert">{error.message}</p>
  if (!data) return null
  return (
    <div className="lap-stats">
      <Chart title="Laporan per kategori" data={data.kategori} horizontal />
      <Chart title="Laporan per bulan (12 bulan terakhir)" data={data.bulan} />
      <Chart title="Laporan per tingkat" data={data.tingkat.map((t) => ({ ...t, label: `Kelas ${t.name}` }))} />
      <Chart title="Kelas/lokasi dengan laporan terbanyak" data={data.lokasi} horizontal />
    </div>
  )
}
