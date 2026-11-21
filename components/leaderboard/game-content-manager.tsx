'use client'

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import useSWR from 'swr'
import { fetchJson } from '@/lib/api-client'
import './leaderboard.css'

type ContentKind = 'kuis' | 'sampah' | 'misi' | 'video'
type Row = Record<string, string | number | boolean | null> & { id: string }
type ApiResult<T> = { galat: boolean; data: T }

const tabs: { id: ContentKind; label: string }[] = [
  { id: 'kuis', label: 'Soal kuis' }, { id: 'sampah', label: 'Item sampah' }, { id: 'misi', label: 'Misi mingguan' }, { id: 'video', label: 'Video edukasi' },
]
const labels: Record<string, string> = {
  pertanyaan: 'Pertanyaan', opsi_a: 'Opsi A', opsi_b: 'Opsi B', opsi_c: 'Opsi C', opsi_d: 'Opsi D', jawaban: 'Kunci jawaban',
  penjelasan: 'Penjelasan', kategori: 'Kategori', tingkat_kesulitan: 'Tingkat kesulitan', link_video: 'Tautan video', aktif: 'Aktif',
  nama: 'Nama item', emoji: 'Emoji', gambar_url: 'URL gambar', jenis: 'Jenis sampah', judul: 'Judul', deskripsi: 'Deskripsi',
  poin: 'Poin', mulai: 'Mulai', selesai: 'Selesai', youtube_url: 'Tautan YouTube', durasi: 'Durasi', tampil: 'Tampilkan', urutan: 'Urutan',
}
const fields: Record<ContentKind, string[]> = {
  kuis: ['pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'jawaban', 'penjelasan', 'kategori', 'tingkat_kesulitan', 'link_video', 'aktif'],
  sampah: ['nama', 'emoji', 'gambar_url', 'jenis', 'penjelasan', 'tingkat_kesulitan', 'aktif'],
  misi: ['judul', 'deskripsi', 'poin', 'mulai', 'selesai', 'aktif'],
  video: ['judul', 'youtube_url', 'kategori', 'deskripsi', 'durasi', 'urutan', 'tampil'],
}
const selectOptions: Record<string, { value: string; label: string }[]> = {
  jawaban: ['a', 'b', 'c', 'd'].map((value) => ({ value, label: value.toUpperCase() })),
  tingkat_kesulitan: ['mudah', 'sedang', 'sulit'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
  jenis: [
    { value: 'organik', label: 'Organik' }, { value: 'anorganik', label: 'Anorganik' }, { value: 'kertas', label: 'Kertas' },
    { value: 'residu', label: 'Residu' }, { value: 'b3', label: 'B3' },
  ],
}
const fetcher = (url: string) => fetchJson<ApiResult<Row[]>>(url)

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function parseCsv(source: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted && char === '"' && source[i + 1] === '"') { cell += '"'; i += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(cell.trim()); cell = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else cell += char
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row) }
  return rows
}

function initialValue(kind: ContentKind): Record<string, string | boolean> {
  const values: Record<ContentKind, Record<string, string | boolean>> = {
    kuis: { pertanyaan: '', opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', jawaban: 'a', penjelasan: '', kategori: 'Umum', tingkat_kesulitan: 'mudah', link_video: '', aktif: true },
    sampah: { nama: '', emoji: '', gambar_url: '', jenis: 'organik', penjelasan: '', tingkat_kesulitan: 'mudah', aktif: true },
    misi: { judul: '', deskripsi: '', poin: '10', mulai: '', selesai: '', aktif: true },
    video: { judul: '', youtube_url: '', kategori: 'Adiwiyata', deskripsi: '', durasi: '', urutan: '0', tampil: true },
  }
  return values[kind]
}

function toInputValue(key: string, value: unknown) {
  if (typeof value === 'boolean') return value
  if (['mulai', 'selesai'].includes(key) && typeof value === 'string') return new Date(value).toISOString().slice(0, 16)
  return value == null ? '' : String(value)
}

export function GameContentManager() {
  const [kind, setKind] = useState<ContentKind>('kuis')
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/game/content?jenis=${kind}`, fetcher)
  const { data: gameSettings } = useSWR<{ games?: { game_key: string; konfigurasi?: Record<string, unknown> }[] }>('/api/admin/game', (url: string) => fetchJson<{ games?: { game_key: string; konfigurasi?: Record<string, unknown> }[] }>(url, { cache: 'no-store' }))
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<Record<string, string | boolean>>(() => initialValue('kuis'))
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [csvRows, setCsvRows] = useState<{ rows: Record<string, unknown>[]; errors: string[] } | null>(null)

  const rows = data?.data ?? []
  const filtered = useMemo(() => rows.filter((row) => {
    const text = [row.pertanyaan, row.nama, row.judul, row.kategori, row.jenis].filter(Boolean).join(' ').toLocaleLowerCase('id')
    const active = row.aktif === true || row.tampil === true
    return text.includes(search.toLocaleLowerCase('id')) && (!category || row.kategori === category) && (!difficulty || row.tingkat_kesulitan === difficulty) && (statusFilter === 'semua' || active === (statusFilter === 'aktif'))
  }), [rows, search, category, difficulty, statusFilter])
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * 20, currentPage * 20)
  const categories = [...new Set(rows.map((row) => String(row.kategori ?? '')).filter(Boolean))].sort()
  const activeQuestions = kind === 'kuis' ? rows.filter((row) => row.aktif === true).length : 0
  const wasteCounts = ['organik', 'anorganik', 'kertas', 'residu', 'b3'].map((bin) => ({ bin, count: rows.filter((row) => row.aktif === true && row.jenis === bin).length }))
  const requiredQuestions = Math.max(5, Math.min(20, Number(gameSettings?.games?.find((game) => game.game_key === 'kuis_adiwiyata')?.konfigurasi?.jumlah_soal ?? 10)))

  function startNew() { setEditing(null); setForm(initialValue(kind)); setNotice('') }
  function startEdit(row: Row) {
    setEditing(row)
    setForm(Object.fromEntries(fields[kind].map((key) => [key, key === 'aktif' || key === 'tampil' ? row[key] === true : toInputValue(key, row[key])])) as Record<string, string | boolean>)
    setNotice('')
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice('')
    const payload = { ...form }
    for (const key of ['mulai', 'selesai']) if (typeof payload[key] === 'string' && payload[key]) payload[key] = new Date(payload[key] as string).toISOString()
    if (kind === 'kuis' && typeof payload.link_video === 'string' && !payload.link_video.trim()) payload.link_video = null as unknown as string
    if (kind === 'sampah' && typeof payload.gambar_url === 'string' && !payload.gambar_url.trim()) payload.gambar_url = null as unknown as string
    try {
      await fetchJson('/api/admin/game/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: kind, id: editing?.id, data: payload }) })
      setEditing(null)
      setForm(initialValue(kind))
      setNotice(editing ? 'Konten berhasil diperbarui.' : 'Konten berhasil ditambahkan.')
      await mutate()
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Konten gagal disimpan.') }
    finally { setBusy(false) }
  }

  async function remove(row: Row) {
    if (!window.confirm(`Hapus “${String(row.pertanyaan ?? row.nama ?? row.judul ?? 'konten')}”?`)) return
    setBusy(true); setNotice('')
    try {
      await fetchJson('/api/admin/game/content', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: kind, id: row.id }) })
      setNotice('Konten berhasil dihapus.')
      await mutate()
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Konten gagal dihapus.') }
    finally { setBusy(false) }
  }

  function exportCsv() {
    const columns = fields[kind]
    const content = [columns.join(','), ...rows.map((row) => columns.map((key) => csvEscape(row[key])).join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `adiwiyata-${kind}.csv`; anchor.click(); URL.revokeObjectURL(url)
  }

  async function toggleActive(row: Row) {
    const key = kind === 'video' ? 'tampil' : 'aktif'
    setBusy(true); setNotice('')
    try {
      await fetchJson('/api/admin/game/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: kind, id: row.id, data: { [key]: row[key] !== true } }) })
      setNotice('Status konten berhasil diperbarui.')
      await mutate()
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Status konten gagal diperbarui.') }
    finally { setBusy(false) }
  }

  function downloadTemplate() {
    const content = `${fields[kind].join(',')}\r\n`
    const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `adiwiyata-template-${kind}.csv`; anchor.click(); URL.revokeObjectURL(url)
  }

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 1_000_000) { setNotice('Ukuran CSV maksimal 1 MB.'); return }
    void file.text().then((text) => {
      const parsed = parseCsv(text.replace(/^\uFEFF/, ''))
      if (parsed.length < 2) { setCsvRows({ rows: [], errors: ['CSV harus memiliki header dan minimal satu baris.'] }); return }
      const headers = parsed[0].map((item) => item.toLowerCase())
      if (kind !== 'kuis' && kind !== 'sampah') { setCsvRows({ rows: [], errors: ['Impor CSV tersedia untuk soal kuis dan item sampah.'] }); return }
      const required = kind === 'kuis'
        ? fields.kuis.filter((field) => !['aktif', 'penjelasan', 'kategori', 'tingkat_kesulitan', 'link_video'].includes(field))
        : ['nama', 'jenis']
      const errors: string[] = []
      if (required.some((field) => !headers.includes(field))) errors.push(`Header wajib: ${required.join(', ')}`)
      const mapped = parsed.slice(1).map((values) => Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ''])))
      const validRows = mapped.filter((row, index) => {
        const missing = required.some((field) => !String(row[field] ?? '').trim())
        const validAnswer = kind !== 'kuis' || ['a', 'b', 'c', 'd'].includes(String(row.jawaban ?? '').toLowerCase())
        const validBin = kind !== 'sampah' || ['organik', 'anorganik', 'kertas', 'residu', 'b3'].includes(String(row.jenis ?? '').toLowerCase())
        if (missing || !validAnswer || !validBin) errors.push(`Baris ${index + 2}: ${missing ? 'data wajib kosong' : !validAnswer ? 'jawaban harus a/b/c/d' : 'jenis sampah tidak valid'}`)
        return !missing && validAnswer && validBin
      }).map((row) => kind === 'kuis'
        ? { ...row, jawaban: String(row.jawaban).toLowerCase(), aktif: String(row.aktif ?? 'true').toLowerCase() !== 'false', tingkat_kesulitan: row.tingkat_kesulitan || 'mudah', link_video: row.link_video || null }
        : { ...row, jenis: String(row.jenis).toLowerCase(), emoji: row.emoji || '', aktif: String(row.aktif ?? 'true').toLowerCase() !== 'false', tingkat_kesulitan: row.tingkat_kesulitan || 'mudah', gambar_url: row.gambar_url || null })
      setCsvRows({ rows: validRows, errors })
    }).catch(() => setNotice('File CSV tidak dapat dibaca.'))
  }

  async function submitImport() {
    if (!csvRows?.rows.length) return
    setBusy(true); setNotice('')
    try {
      const result = await fetchJson<ApiResult<{ imported: number; rejected: number }>>('/api/admin/game/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: kind, aksi: 'impor', baris: csvRows.rows }) })
      setNotice(`${result.data.imported} ${kind === 'kuis' ? 'soal' : 'item'} diimpor; ${result.data.rejected + csvRows.errors.length} baris ditolak atau duplikat.`)
      setCsvRows(null)
      await mutate()
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Impor belum berhasil.') }
    finally { setBusy(false) }
  }

  return (
    <main className="admin-game-page admin-content-page">
      <a className="leaderboard-back" href="/admin/game">← Kembali ke pengaturan game</a>
      <header className="admin-game-header"><span className="leaderboard-mark" aria-hidden="true">G</span><div><span className="eyebrow">PANEL ADMINISTRATOR</span><h1>Konten permainan</h1><p>Atur soal, item sampah, misi mingguan, dan video edukasi.</p></div></header>
      <nav className="leaderboard-tabs" aria-label="Jenis konten">{tabs.map((tab) => <button type="button" key={tab.id} className={kind === tab.id ? 'active' : ''} aria-current={kind === tab.id ? 'page' : undefined} onClick={() => { setKind(tab.id); setEditing(null); setForm(initialValue(tab.id)); setNotice(''); setCsvRows(null); setPage(1) }}>{tab.label}</button>)}</nav>
      <section className="leaderboard-content" aria-label={`Kelola ${tabs.find((tab) => tab.id === kind)?.label}`}>
        <div className="leaderboard-tools">
          <label>Cari<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Cari konten…" /></label>
          {(kind === 'kuis' || kind === 'video') && <label>Kategori<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }}><option value="">Semua kategori</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
          {(kind === 'kuis' || kind === 'sampah') && <label>Tingkat kesulitan<select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1) }}><option value="">Semua tingkat</option>{['mudah', 'sedang', 'sulit'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
          <label>Status<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}><option value="semua">Semua status</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></label>
          <button className="leaderboard-refresh" type="button" onClick={startNew}>Tambah konten</button>
          <button className="leaderboard-refresh" type="button" onClick={exportCsv}>Ekspor CSV</button>
          {(kind === 'kuis' || kind === 'sampah') && <><button className="leaderboard-refresh" type="button" onClick={downloadTemplate}>Unduh templat</button><label className="csv-file-label">Impor CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} /></label></>}
        </div>
        {kind === 'kuis' && <p className={`admin-content-warning ${activeQuestions < requiredQuestions ? 'is-warning' : ''}`} role="status">Soal aktif: {activeQuestions}. Game menggunakan {requiredQuestions} soal per sesi{activeQuestions < requiredQuestions ? ' — tambahkan soal aktif agar sesi penuh.' : '.'}</p>}
        {kind === 'sampah' && <p className={`admin-content-warning ${wasteCounts.some((item) => item.count < 3) ? 'is-warning' : ''}`} role="status">Item aktif per jenis: {wasteCounts.map((item) => `${item.bin} ${item.count}`).join(' · ')}{wasteCounts.some((item) => item.count < 3) ? ' — setiap jenis sebaiknya memiliki minimal 3 item.' : '.'}</p>}
        {notice && <p className="admin-content-notice" role="status">{notice}</p>}
        {csvRows && <div className="admin-setting-card csv-preview"><h2>Pratinjau impor</h2><p>{csvRows.rows.length} baris valid siap diperiksa. Baris valid saja yang akan disimpan.</p>{csvRows.errors.length > 0 && <ul>{csvRows.errors.slice(0, 12).map((item) => <li key={item}>{item}</li>)}</ul>}<div className="admin-save-row"><button type="button" className="leaderboard-refresh" onClick={() => setCsvRows(null)}>Batal</button><button type="button" className="admin-save-button" disabled={busy || !csvRows.rows.length} onClick={() => void submitImport()}>{busy ? 'Mengimpor…' : 'Simpan baris valid'}</button></div></div>}
        {isLoading ? <div className="leaderboard-state">Memuat konten…</div> : error ? <div className="leaderboard-state is-error" role="alert">{error.message}<button type="button" onClick={() => void mutate()}>Coba lagi</button></div> : filtered.length ? <><div className="leaderboard-table-wrap admin-content-table-wrap"><table className="leaderboard-table"><thead><tr><th>Konten</th><th>Kategori / jenis</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{pageRows.map((row) => <tr key={row.id}><th>{String(row.pertanyaan ?? row.nama ?? row.judul ?? '—')}</th><td>{String(row.kategori ?? row.jenis ?? '—')}</td><td>{row.aktif === true || row.tampil === true ? 'Aktif' : 'Nonaktif'}</td><td><div className="admin-content-actions"><button type="button" onClick={() => startEdit(row)}>Ubah</button>{kind === 'kuis' && <button type="button" onClick={() => { setEditing(null); setForm(Object.fromEntries(fields.kuis.map((key) => [key, key === 'aktif' ? true : toInputValue(key, row[key])])) as Record<string, string | boolean>); setNotice('Salinan soal siap disimpan sebagai soal baru.') }}>Duplikat</button>}<button type="button" disabled={busy} onClick={() => void toggleActive(row)}>{(kind === 'video' ? row.tampil : row.aktif) === true ? 'Nonaktifkan' : 'Aktifkan'}</button><button type="button" className="danger" disabled={busy} onClick={() => void remove(row)}>Hapus</button></div></td></tr>)}</tbody></table></div><div className="admin-save-row" aria-label="Paginasi konten"><button type="button" className="leaderboard-refresh" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Sebelumnya</button><span>Halaman {currentPage} dari {pageCount}</span><button type="button" className="leaderboard-refresh" disabled={currentPage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Berikutnya</button></div></> : <div className="leaderboard-state">Belum ada konten pada kategori ini. Tambahkan konten baru untuk memulai.</div>}
        <form className="admin-setting-card admin-content-form" onSubmit={(event) => void save(event)}>
          <div className="admin-setting-heading"><div><span className="eyebrow">{editing ? 'UBAH KONTEN' : 'KONTEN BARU'}</span><h2>{editing ? 'Perbarui konten' : 'Tambah konten'}</h2></div></div>
          <div className="admin-form-grid">{fields[kind].map((key) => {
            const value = form[key]
            if (key === 'aktif' || key === 'tampil') return <label className="admin-content-toggle" key={key}><input type="checkbox" checked={value === true} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))} /> {labels[key]}</label>
            if (selectOptions[key]) return <label key={key}>{labels[key]}<select required={['jawaban', 'jenis', 'tingkat_kesulitan'].includes(key)} value={String(value ?? '')} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}>{selectOptions[key].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            const type = key === 'mulai' || key === 'selesai' ? 'datetime-local' : ['poin', 'urutan'].includes(key) ? 'number' : 'text'
            const isLong = ['pertanyaan', 'deskripsi', 'penjelasan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d'].includes(key)
            return <label className={isLong ? 'span-all' : ''} key={key}>{labels[key]}{isLong ? <textarea required={['pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d'].includes(key)} rows={key === 'pertanyaan' || key === 'deskripsi' ? 3 : 2} value={String(value ?? '')} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /> : <input type={type} required={['nama', 'judul', 'youtube_url', 'mulai', 'selesai'].includes(key)} min={['poin', 'urutan'].includes(key) ? 0 : undefined} value={String(value ?? '')} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />}</label>
          })}</div>
          <div className="admin-save-row"><p role="status">{notice}</p><button type="submit" className="admin-save-button" disabled={busy}>{busy ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Tambah konten'}</button></div>
        </form>
        {kind === 'kuis' && editing && <aside className="admin-setting-card admin-question-preview"><span className="eyebrow">PRATINJAU SOAL</span><h2>{String(editing.pertanyaan)}</h2><ol type="a">{['opsi_a', 'opsi_b', 'opsi_c', 'opsi_d'].map((key) => <li key={key}>{String(editing[key] ?? '')}{editing.jawaban === key.slice(-1) && <strong> · Jawaban benar</strong>}</li>)}</ol><p>{String(editing.penjelasan ?? '')}</p></aside>}
      </section>
    </main>
  )
}
