'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDeposit, saveDeposit, type DepositInput } from '@/app/actions/deposits'
import { ClassLocationPicker } from '@/components/adiwiyata/class-location-picker'
import { fetchJson } from '@/lib/api-client'

type DepositPageData = Awaited<ReturnType<typeof import('@/app/actions/deposits').getDepositPageData>>

type SheetRecord = { date: string; className: string; wasteType: string; weight: number; compliance: string; note: string }
type PendingSubmission = { records: SheetRecord[]; className: string; date: string; input: DepositInput }
type OfflineQueueItem = { records: SheetRecord[]; createdAt: number }
const OFFLINE_QUEUE_KEY = 'adiwiyata-sheets-queue-v1'

function readOfflineQueue(): OfflineQueueItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]')
    return Array.isArray(value) ? value as OfflineQueueItem[] : []
  } catch {
    return []
  }
}

function clearQueuedSubmission(submission: PendingSubmission) {
  const queue = readOfflineQueue().filter((item) => item.records[0]?.date !== submission.date || item.records[0]?.className !== submission.className)
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

const weightFields = [
  ['organic', 'Organik'],
  ['inorganic', 'Anorganik'],
  ['residual', 'Residu'],
  ['hazardous', 'B3'],
  ['paper', 'Kertas'],
] as const

export function DepositWorkspace({ data }: { data: DepositPageData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<PendingSubmission | null>(null)
  const [pendingSync, setPendingSync] = useState<PendingSubmission | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // D-F08: id laporan yang sedang dihapus — guard klik ganda supaya
  // panggilan hapus kedua tidak melempar "tidak ditemukan" setelah
  // pesan sukses (pola guard `busy` seperti di file admin lain).
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function sendToSpreadsheet(records: SheetRecord[]) {
    const result = await fetchJson<{ success?: boolean; error?: string }>('/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ records, replace: true }),
    })
    if (!result.success) throw new Error(result.error || 'Pengiriman ke Spreadsheet gagal.')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const value = (key: string) => Number(form.get(key) || 0)
    const date = String(form.get('date') || '')
    const className = String(form.get('className') || '').trim()
    const input: DepositInput = {
      date,
      className,
      organic: value('organic'),
      inorganic: value('inorganic'),
      residual: value('residual'),
      hazardous: value('hazardous'),
      paper: value('paper'),
      tumbler: value('tumbler'),
      lunchbox: value('lunchbox'),
    }
    const validation: Record<string, string> = {}
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
    if (!date) validation.date = 'Tanggal wajib diisi.'
    else if (date > today) validation.date = 'Tanggal tidak boleh melewati hari ini.'
    if (!className) validation.className = 'Kelas wajib dipilih.'
    for (const [name, label] of weightFields) {
      const weight = input[name]
      if (!String(form.get(name) ?? '').trim()) validation[name] = `Berat ${label} wajib diisi.`
      else if (!Number.isFinite(weight) || weight < 0 || weight > 500 || Math.round(weight * 100) !== weight * 100) validation[name] = `Berat ${label} harus 0–500 kg, maksimal dua desimal.`
    }
    for (const [name, label] of [['tumbler', 'Tumbler'], ['lunchbox', 'Lunch box']] as const) {
      const count = input[name]
      if (!String(form.get(name) ?? '').trim()) validation[name] = `Jumlah ${label} wajib diisi.`
      else if (!Number.isInteger(count) || count < 0 || count > 100) validation[name] = `Jumlah ${label} harus bilangan bulat 0–100.`
    }
    if (!weightFields.some(([name]) => input[name] > 0)) validation.organic = 'Isi berat lebih dari 0 kg pada sedikitnya satu jenis sampah.'
    const note = String(form.get('note') || '').trim().replace(/\s+/g, ' ')
    if (!note) validation.note = 'Catatan wajib diisi.'
    setFieldErrors(validation)
    if (Object.keys(validation).length) return
    const studentCount = data.classes.find((item) => item.name === className)?.student_count ?? 0
    const status = input.tumbler > 0 || input.lunchbox > 0 ? 'Patuh' : 'Tidak patuh'
    const compliance = studentCount
      ? `${status} | Tumbler ${input.tumbler}/${studentCount} | Lunch box ${input.lunchbox}/${studentCount}`
      : `${status} | Tumbler ${input.tumbler} | Lunch box ${input.lunchbox}`
    const records = weightFields.flatMap(([name, wasteType]) => input[name] > 0 ? [{ date, className, wasteType, weight: input[name], compliance, note }] : [])
    setPreview({ input, records, date, className })
  }

  function confirmSubmission() {
    if (!preview) return
    setError('')
    setMessage('')
    startTransition(async () => {
      try {
        const saved = await saveDeposit(preview.input)
        if (saved.needsConfirmation) {
          if (!window.confirm(`Setoran ${preview.className} tanggal ${preview.date} sudah tersimpan. Timpa data tersebut?`)) return
          const overwritten = await saveDeposit({ ...preview.input, overwrite: true })
          if (overwritten.needsConfirmation) throw new Error('Data belum dapat ditimpa. Muat ulang halaman lalu coba lagi.')
        }
        setPendingSync(preview)
        try {
          await sendToSpreadsheet(preview.records)
          clearQueuedSubmission(preview)
          setMessage('Data berhasil tersimpan ke Spreadsheet.')
          setPendingSync(null)
          setPreview(null)
          router.refresh()
        } catch (syncError) {
          if (!navigator.onLine) {
            const queue = readOfflineQueue().filter((item) => item.records[0]?.date !== preview.date || item.records[0]?.className !== preview.className)
            queue.push({ records: preview.records, createdAt: Date.now() })
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-20)))
            setMessage('Koneksi offline. Data tersimpan di perangkat dan akan dikirim otomatis saat online.')
            setPendingSync(null)
            setPreview(null)
            router.refresh()
          } else {
            throw syncError
          }
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Setoran belum berhasil disimpan.')
      }
    })
  }

  function retrySpreadsheetSubmission() {
    if (!pendingSync) return
    setError('')
    startTransition(async () => {
      try {
        await sendToSpreadsheet(pendingSync.records)
        clearQueuedSubmission(pendingSync)
        setMessage('Data berhasil tersimpan ke Spreadsheet.')
        setPendingSync(null)
        setPreview(null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Pengiriman ke Spreadsheet gagal.')
      }
    })
  }

  useEffect(() => {
    const retryQueue = async () => {
      if (!navigator.onLine) return
      const queued = readOfflineQueue()
      if (!queued.length) return
      const remaining: OfflineQueueItem[] = []
      for (const item of queued) {
        try { await sendToSpreadsheet(item.records) } catch { remaining.push(item) }
      }
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining))
      if (queued.length > remaining.length) setMessage('Data antrean offline berhasil dikirim ke Spreadsheet.')
    }
    window.addEventListener('online', retryQueue)
    void retryQueue()
    return () => window.removeEventListener('online', retryQueue)
  }, [])

  function removeDeposit(id: string) {
    if (deletingId) return
    if (!window.confirm('Hapus laporan ini? Tindakan ini tidak dapat dibatalkan.')) return
    setDeletingId(id)
    setError('')
    startTransition(async () => {
      try {
        await deleteDeposit(id)
        setMessage('Laporan berhasil dihapus.')
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Setoran belum berhasil dihapus.')
      } finally {
        setDeletingId(null)
      }
    })
  }

  // Petugas boleh menginput untuk semua kelas — daftar tidak lagi
  // disaring ke kelas penugasan.
  const classes = data.classes

  return (
    <section className="directory-page" aria-labelledby="deposit-title">
      <div className="directory-heading">
        <div><span className="eyebrow">DATA LINGKUNGAN</span><h1 id="deposit-title">Input Laporan</h1><p>Catat sampah terpilah serta jumlah siswa yang membawa wadah pakai ulang.</p></div>
        <span className="directory-total"><strong>{data.deposits.length}</strong> terbaru</span>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-success" role="status">{message}</p>}
      {pendingSync && <button className="text-button" type="button" disabled={pending} onClick={retrySpreadsheetSubmission}>Coba lagi mengirim ke Spreadsheet</button>}
      {preview ? <section className="deposit-preview" aria-labelledby="preview-title">
        <span className="eyebrow">KONFIRMASI PENGIRIMAN</span><h2 id="preview-title">Pratinjau &amp; Konfirmasi</h2>
        <p>{preview.className} · {new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${preview.date}T12:00:00+07:00`))}</p>
        <div className="monitoring-table-scroll"><table className="monitoring-table"><thead><tr><th scope="col">Jenis sampah</th><th scope="col">Berat</th><th scope="col">Catatan</th></tr></thead><tbody>{preview.records.map((record) => <tr key={record.wasteType}><th scope="row">{record.wasteType}</th><td>{record.weight} kg</td><td>{record.note}</td></tr>)}</tbody></table></div>
        <div className="preview-actions"><button className="text-button" type="button" disabled={pending} onClick={() => setPreview(null)}>Edit Kembali</button><button className="primary-button" type="button" disabled={pending} onClick={confirmSubmission}>{pending ? 'Mengirim…' : 'Kirim ke Spreadsheet'}</button></div>
      </section> : <form className="deposit-form" onSubmit={submit} noValidate>
        <div className="deposit-form-grid">
          <label className="deposit-field"><span>Tanggal</span><input name="date" type="date" max={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())} defaultValue={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())} required />{fieldErrors.date && <small className="field-error">{fieldErrors.date}</small>}</label>
          <div className="deposit-field class-location-field"><ClassLocationPicker classes={classes} invalid={Boolean(fieldErrors.className)} errorId="class-name-error" />{fieldErrors.className && <small id="class-name-error" className="field-error">{fieldErrors.className}</small>}</div>
          {weightFields.map(([name, label]) => <label className="deposit-field" key={name}><span>{label} (kg)</span><input name={name} type="number" min="0" max="500" step="0.01" defaultValue="0" required />{fieldErrors[name] && <small className="field-error">{fieldErrors[name]}</small>}</label>)}
          <div className="deposit-field-group"><strong>Pembiasaan membawa wadah pakai ulang</strong><span>Isi jumlah siswa yang membawa tumbler dan lunch box, setelah data pilah sampah.</span></div>
          <label className="deposit-field"><span>Siswa membawa tumbler</span><input name="tumbler" type="number" min="0" max="100" step="1" defaultValue="0" required />{fieldErrors.tumbler && <small className="field-error">{fieldErrors.tumbler}</small>}</label>
          <label className="deposit-field"><span>Siswa membawa lunch box</span><input name="lunchbox" type="number" min="0" max="100" step="1" defaultValue="0" required />{fieldErrors.lunchbox && <small className="field-error">{fieldErrors.lunchbox}</small>}</label>
          <label className="deposit-field deposit-note-field"><span>Catatan</span><textarea name="note" maxLength={500} required placeholder="Tuliskan catatan singkat" />{fieldErrors.note && <small className="field-error">{fieldErrors.note}</small>}</label>
        </div>
        <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Memproses…' : 'Pratinjau & Konfirmasi'}</button>
      </form>}

      <div className="deposit-history">
        <div className="subsection-heading"><div><span className="eyebrow">RIWAYAT</span><h2>Laporan terbaru</h2></div></div>
        {data.deposits.length === 0 ? <div className="empty-search"><strong>Belum ada laporan</strong><span>Laporan yang berhasil disimpan akan muncul di sini.</span></div> : (
          <div className="deposit-list">{data.deposits.map((row) => <article className="deposit-row" key={row.id}>
            <div><strong>{row.class_name}</strong><span>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(`${row.date}T12:00:00+07:00`))}</span></div>
            <p>{Number(row.organic) + Number(row.inorganic) + Number(row.residual) + Number(row.hazardous) + Number(row.paper)} kg total · {row.tumbler} tumbler · {row.lunchbox} lunch box</p>
            <small>Dicatat oleh {row.submitter_name}</small>
            {(data.role === 'admin' || row.user_id === data.userId) && <button className="text-button" type="button" disabled={pending || deletingId !== null} onClick={() => removeDeposit(row.id)}>{deletingId === row.id ? 'Menghapus…' : 'Hapus'}</button>}
          </article>)}</div>
        )}
      </div>
    </section>
  )
}
