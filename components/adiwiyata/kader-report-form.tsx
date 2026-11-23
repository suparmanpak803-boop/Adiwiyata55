'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Check, ClipboardCheck, FileImage, Leaf, Moon, Sun } from 'lucide-react'
import { KADER_REPORT_TASKS } from '@/lib/kader-report-tasks'
import { getKaderReportFormUrl, hasKaderReportFormConfig, KADER_REPORT_GFORM } from '@/lib/kader-report-gform'

type KaderReportFormProps = { staffName: string; className: string }

type ReportValues = {
  reportedAt: string
  category: string
  tasks: string[]
  notes: string
  evidenceUrl: string
}

function currentLocalDateTime() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function reportDateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('id-ID')
}

export function KaderReportForm({ staffName, className }: KaderReportFormProps) {
  const [values, setValues] = useState<ReportValues>({ reportedAt: '', category: '', tasks: [], notes: '', evidenceUrl: '' })
  const [dark, setDark] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const selectedKader = useMemo(() => KADER_REPORT_TASKS.find((kader) => kader.name === values.category), [values.category])
  const formConfigured = hasKaderReportFormConfig()
  const googleFormUrl = getKaderReportFormUrl()

  useEffect(() => {
    setValues((current) => ({ ...current, reportedAt: currentLocalDateTime() }))
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDark(document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && prefersDark))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  const toggleTask = (task: string) => {
    setValues((current) => ({
      ...current,
      tasks: current.tasks.includes(task) ? current.tasks.filter((item) => item !== task) : [...current.tasks, task],
    }))
  }

  const buildPrefilledUrl = () => {
    if (!formConfigured || !googleFormUrl || !selectedKader) return ''
    const params = new URLSearchParams({ usp: 'pp_url' })
    const entries = KADER_REPORT_GFORM.entries
    params.set(entries.date, reportDateLabel(values.reportedAt))
    params.set(entries.staffName, staffName)
    params.set(entries.className, className)
    params.set(entries.category, selectedKader.name)
    params.set(entries.notes, values.notes)
    params.set(entries.evidenceUrl, values.evidenceUrl)
    values.tasks.forEach((task) => params.append(entries.tasks, task))
    return `${googleFormUrl}?${params.toString()}`
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formConfigured || !selectedKader || submitting) return
    setSubmitting(true)
    setFeedback('')

    const entries = KADER_REPORT_GFORM.entries
    const body = new URLSearchParams()
    body.set(entries.date, reportDateLabel(values.reportedAt))
    body.set(entries.staffName, staffName)
    body.set(entries.className, className)
    body.set(entries.category, selectedKader.name)
    values.tasks.forEach((task) => body.append(entries.tasks, task))
    body.set(entries.notes, values.notes)
    body.set(entries.evidenceUrl, values.evidenceUrl)

    try {
      await fetch(`https://docs.google.com/forms/d/e/${KADER_REPORT_GFORM.formId}/formResponse`, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body,
      })
      setFeedback('Permintaan pengiriman sudah dikirim. Karena Google Form memakai no-cors, status penerimaan akhir tidak dapat diverifikasi dari aplikasi.')
      setValues({ reportedAt: currentLocalDateTime(), category: '', tasks: [], notes: '', evidenceUrl: '' })
    } catch {
      setFeedback('Laporan belum berhasil dikirim. Periksa koneksi internet, lalu coba lagi atau gunakan Google Form langsung.')
    } finally {
      setSubmitting(false)
    }
  }

  const prefilledUrl = buildPrefilledUrl()

  return (
    <main className="kader-report-shell">
      <header className="kader-report-topbar">
        <Link className="kader-report-back" href="/"><ArrowLeft aria-hidden="true" /> Kembali ke Adiwiyata 55</Link>
        <button className="kader-report-theme" type="button" aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'} onClick={() => setDark((current) => !current)}>{dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
      </header>

      <div className="kader-report-page">
        <section className="kader-report-heading">
          <div className="kader-report-heading-copy"><span className="kader-report-eyebrow"><Leaf aria-hidden="true" /> ADIWIYATA 55 <span>/</span> KINERJA KADER</span><h1>Laporan Kinerja<br /><em>Kader Adiwiyata.</em></h1><p>Catat aksi nyata kader hari ini. Pilih kelompok untuk melihat uraian tugas yang perlu dilaporkan.</p></div>
          <div className="kader-report-number" aria-hidden="true"><strong>{KADER_REPORT_TASKS.length}</strong><span>JENIS KADER<br />ADIWIYATA 2026</span></div>
        </section>

        {!formConfigured && <aside className="kader-report-config-note" role="status"><strong>Google Form belum dikonfigurasi.</strong><span>Isi formId dan seluruh ID entry pada <code>lib/kader-report-gform.ts</code> agar pengiriman dan tautan pre-filled aktif.</span></aside>}

        <form className="kader-report-grid" onSubmit={submitReport}>
          <section className="kader-report-card kader-report-identity" aria-labelledby="identity-title">
            <div className="kader-report-card-head"><span className="kader-report-step">01 / IDENTITAS</span><span className="kader-report-card-icon"><ClipboardCheck aria-hidden="true" /></span></div>
            <h2 id="identity-title">Detail laporan</h2>
            <div className="kader-report-fields">
              <label className="kader-report-field kader-report-field-wide"><span>Tanggal &amp; waktu laporan</span><input type="datetime-local" required value={values.reportedAt} onChange={(event) => setValues((current) => ({ ...current, reportedAt: event.target.value }))} /></label>
              <label className="kader-report-field"><span>Nama petugas pelapor</span><input type="text" value={staffName} readOnly /></label>
              <label className="kader-report-field"><span>Kelas</span><input type="text" value={className || 'Belum ditautkan'} readOnly /></label>
              <label className="kader-report-field kader-report-field-wide"><span>Kategori kader <i>*</i></span><select required value={values.category} onChange={(event) => setValues((current) => ({ ...current, category: event.target.value, tasks: [] }))}><option value="">Pilih jenis kader</option>{KADER_REPORT_TASKS.map((kader, index) => <option key={kader.name} value={kader.name}>{String(index + 1).padStart(2, '0')} · {kader.name}{kader.sementara ? ' (sementara)' : ''}</option>)}</select></label>
            </div>
          </section>

          <section className="kader-report-card kader-report-checklist" aria-labelledby="checklist-title">
            <div className="kader-report-card-head"><span className="kader-report-step">02 / PELAKSANAAN</span><span className="kader-report-progress">{values.tasks.length} dipilih</span></div>
            <div className="kader-report-checklist-heading"><div><h2 id="checklist-title">Checklist uraian tugas</h2><p>{selectedKader ? `Pilih kegiatan ${selectedKader.name} yang terlaksana.${selectedKader.sementara ? ' Daftar tugas ini sementara, menunggu daftar resmi.' : ''}` : 'Pilih kategori kader untuk memuat uraian tugas.'}</p></div>{selectedKader && <span className="kader-report-task-count">{selectedKader.tasks.length} tugas</span>}</div>
            {selectedKader ? <fieldset className="kader-report-task-list"><legend className="sr-only">Uraian tugas untuk {selectedKader.name}</legend>{selectedKader.tasks.map((task, index) => <label className={`kader-report-task${values.tasks.includes(task) ? ' is-checked' : ''}`} key={task}><input type="checkbox" checked={values.tasks.includes(task)} onChange={() => toggleTask(task)} /><span className="kader-report-checkbox"><Check aria-hidden="true" /></span><span className="kader-report-task-number">{String(index + 1).padStart(2, '0')}</span><span>{task}</span></label>)}</fieldset> : <div className="kader-report-empty"><span><ClipboardCheck aria-hidden="true" /></span><strong>Checklist akan muncul di sini</strong><p>Pilih satu dari {KADER_REPORT_TASKS.length} kategori kader pada bagian detail laporan.</p></div>}
          </section>

          <section className="kader-report-card kader-report-notes" aria-labelledby="notes-title">
            <div className="kader-report-card-head"><span className="kader-report-step">03 / CATATAN &amp; BUKTI</span><span className="kader-report-card-icon"><FileImage aria-hidden="true" /></span></div>
            <h2 id="notes-title">Kondisi lapangan</h2>
            <label className="kader-report-field"><span>Catatan / kendala <small>OPSIONAL</small></span><textarea rows={4} placeholder="Ceritakan hasil kegiatan atau kendala yang ditemui..." value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} /></label>
            <label className="kader-report-field"><span>Link bukti kolase dokumentasi</span><input type="url" placeholder="https://drive.google.com/..." value={values.evidenceUrl} onChange={(event) => setValues((current) => ({ ...current, evidenceUrl: event.target.value }))} /><small className="kader-report-hint">Pastikan akses tautan dapat dibuka oleh pembina.</small></label>
          </section>

          <section className="kader-report-submit-card">
            <div><span className="kader-report-step">SIAP DILAPORKAN?</span><h2>Aksi kecil, dampak nyata.</h2><p>{values.tasks.length ? `${values.tasks.length} uraian tugas ditandai terlaksana.` : 'Pilih tugas yang terlaksana sebelum mengirim laporan.'}</p></div>
            <div className="kader-report-actions"><a className={`kader-report-secondary${!prefilledUrl ? ' is-disabled' : ''}`} href={prefilledUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!prefilledUrl} onClick={(event) => { if (!prefilledUrl) event.preventDefault() }}>Buka &amp; Isi Langsung via Google Form (Pre-filled) <ArrowUpRight aria-hidden="true" /></a><button className="kader-report-primary" type="submit" disabled={!formConfigured || !selectedKader || submitting}>{submitting ? 'Mengirim laporan…' : 'Kirim laporan'} <ArrowUpRight aria-hidden="true" /></button></div>
          </section>
        </form>
        <p className="kader-report-feedback" role="status" aria-live="polite">{feedback}</p>
        <footer className="kader-report-footer"><span>ADIWIYATA 55 · JAKARTA</span><span>MERAWAT BUMI DIMULAI DARI AKSI KITA</span></footer>
      </div>
    </main>
  )
}
