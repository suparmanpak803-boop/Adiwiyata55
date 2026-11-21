'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchJson } from '@/lib/api-client'
import useSWR, { mutate as globalMutate } from 'swr'
import { KATEGORI, STATUS_LABEL, URGENSI } from '@/lib/laporan'
import { StatusBadge, fetcher, formatDate } from '../shared'

type Detail = {
  laporan: {
    id: string; nomorTiket: string; kategori: string; lokasi: string | null; judul: string; isi: string; urgensi: string; status: string
    pelapor: string | null; anonim: boolean; penanggungJawabId: string | null; penanggungJawab: string | null; saranTerbaik: boolean
    tanggapan: string | null; catatanInternal: string | null; rating: number | null; dibuatPada: string; terlambat: boolean
    statusSinkron: string; sinkronError: string | null
  }
  foto: string[]
  komentar: { dariAdmin: boolean; isi: string; dibuatPada: string }[]
  riwayat: { status: string; catatan: string | null; dibuatPada: string }[]
}
type Staff = { id: string; name: string; role: string }
type Settings = { waAktif: boolean; waNomor: string | null }

export function AdminLaporanDetail({ id, role, waNumber, onClose, onChanged }: { id: string; role: 'admin' | 'petugas'; waNumber: string | null; onClose: () => void; onChanged: () => void }) {
  const key = `/api/admin/laporan/${id}`
  const { data, error, mutate } = useSWR<Detail>(key, fetcher)
  const { data: staff } = useSWR<{ staff: Staff[] }>(role === 'admin' ? '/api/admin/laporan/staff' : null, fetcher)
  const [form, setForm] = useState({ status: '', alasan: '', tanggapan: '', catatan: '', pj: '', terbaik: false })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!data) return
    const l = data.laporan
    setForm({ status: l.status, alasan: '', tanggapan: l.tanggapan ?? '', catatan: l.catatanInternal ?? '', pj: l.penanggungJawabId ?? '', terbaik: l.saranTerbaik })
  }, [data])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!data) return
    setBusy(true)
    setMessage(null)
    const l = data.laporan
    const payload: Record<string, unknown> = { tanggapan: form.tanggapan, catatanInternal: form.catatan }
    if (form.status !== l.status) { payload.status = form.status; payload.alasan = form.alasan }
    if (role === 'admin') { payload.penanggungJawab = form.pj || null; payload.saranTerbaik = form.terbaik }
    try {
      await fetchJson(key, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setMessage({ ok: true, text: 'Perubahan tersimpan. Pelapor mendapat notifikasi.' })
      await mutate()
      onChanged()
      void globalMutate('/api/notifikasi')
    } catch (cause) {
      setMessage({ ok: false, text: cause instanceof Error ? cause.message : 'Perubahan belum tersimpan.' })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Hapus laporan ini beserta fotonya dari daftar? Tindakan ini tidak dapat dibatalkan.')) return
    try {
      await fetchJson(key, { method: 'DELETE' })
      onChanged()
      onClose()
    } catch (cause) {
      setMessage({ ok: false, text: cause instanceof Error ? cause.message : 'Laporan belum terhapus.' })
    }
  }

  const l = data?.laporan
  const waLink = l && waNumber && l.urgensi === 'tinggi' ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Laporan mendesak ${l.nomorTiket}: ${l.judul}`)}` : null

  return (
    <div className="lap-overlay" onClick={onClose}>
      <div className="lap-dialog" role="dialog" aria-modal="true" aria-label="Detail laporan" onClick={(event) => event.stopPropagation()}>
        <button ref={closeRef} type="button" className="game-ghost lap-close" onClick={onClose}>Tutup</button>
        {error && <p className="lap-error" role="alert">{error.message}</p>}
        {!data && !error && <p className="lap-empty">Memuat…</p>}
        {data && l && (
          <>
            <div className="lap-meta"><StatusBadge status={l.status} />{l.terlambat && <span className="lap-badge lap-late">Terlambat</span>}{l.saranTerbaik && <span className="lap-badge lap-best">Saran Terbaik</span>}</div>
            <h2>{l.judul}</h2>
            <p className="lap-meta-line">{l.nomorTiket} · {KATEGORI.find((k) => k.id === l.kategori)?.label} · {l.lokasi ?? 'Tanpa lokasi'} · Urgensi {URGENSI.find((u) => u.id === l.urgensi)?.label}</p>
            <p className="lap-meta-line">Pelapor: <b>{l.pelapor ?? 'Anonim'}</b> · {formatDate(l.dibuatPada)}{l.rating ? ` · Rating ${l.rating}/5` : ''}</p>
            <p className="lap-body">{l.isi}</p>
            {data.foto.length > 0 && (
              <div className="lap-photos">{data.foto.map((p) => <a key={p} href={`/api/laporan/file?pathname=${encodeURIComponent(p)}`} target="_blank" rel="noreferrer"><img src={`/api/laporan/file?pathname=${encodeURIComponent(p)}`} alt={`Foto bukti laporan ${l.nomorTiket}`} loading="lazy" /></a>)}</div>
            )}
            {waLink && <a className="game-ghost" href={waLink} target="_blank" rel="noreferrer">Hubungi via WhatsApp</a>}

            <form className="lap-form lap-admin-form" onSubmit={save}>
              <label>Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {form.status !== l.status && (
                <label>Alasan / catatan perubahan {form.status === 'ditolak' ? '(wajib)' : '(opsional)'}
                  <input value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} maxLength={500} required={form.status === 'ditolak'} />
                </label>
              )}
              <label>Tanggapan (terlihat oleh pelapor)
                <textarea rows={3} maxLength={1000} value={form.tanggapan} onChange={(e) => setForm({ ...form, tanggapan: e.target.value })} />
              </label>
              <label>Catatan internal (tidak terlihat pelapor)
                <textarea rows={2} maxLength={1000} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
              </label>
              {role === 'admin' ? (
                <>
                  <label>Penanggung jawab
                    <select value={form.pj} onChange={(e) => setForm({ ...form, pj: e.target.value })}>
                      <option value="">Belum ditugaskan</option>
                      {staff?.staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role === 'admin' ? 'Admin' : 'Petugas'})</option>)}
                    </select>
                  </label>
                  <label className="lap-check"><input type="checkbox" checked={form.terbaik} onChange={(e) => setForm({ ...form, terbaik: e.target.checked })} /> Tandai sebagai Saran Terbaik</label>
                </>
              ) : <p className="lap-empty">Penanggung jawab: {l.penanggungJawab ?? '-'}</p>}
              {message && <p className={message.ok ? 'lap-ok' : 'lap-error'} role="status">{message.text}</p>}
              <div className="game-actions" style={{ justifyContent: 'flex-start' }}>
                <button className="game-play" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
                {role === 'admin' && <button type="button" className="game-ghost lap-danger" onClick={remove}>Hapus laporan</button>}
              </div>
            </form>

            {role === 'admin' && <p className="lap-empty">Sinkron Spreadsheet: {l.statusSinkron === 'tersinkron' ? 'sudah tersinkron' : `tertunda${l.sinkronError ? ` (${l.sinkronError})` : ''}`}</p>}
            <h3>Riwayat status</h3>
            <ul className="lap-timeline">{data.riwayat.map((r, i) => <li key={i}><b>{STATUS_LABEL[r.status] ?? r.status}</b>{r.catatan && <span>{r.catatan}</span>}<small>{formatDate(r.dibuatPada)}</small></li>)}{!data.riwayat.length && <li className="lap-empty">Belum ada perubahan status.</li>}</ul>
            {data.komentar.length > 0 && <><h3>Komentar</h3>{data.komentar.map((k, i) => <div key={i} className={k.dariAdmin ? 'lap-comment admin' : 'lap-comment'}><small>{k.dariAdmin ? 'Admin' : 'Pelapor'} · {formatDate(k.dibuatPada)}</small><p>{k.isi}</p></div>)}</>}
          </>
        )}
      </div>
    </div>
  )
}

export type { Settings }
