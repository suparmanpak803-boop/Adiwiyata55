'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, KeyRound, Save, ShieldCheck } from 'lucide-react'
import { saveSheetsConfig } from '@/app/actions/sheets-config'

export function SheetsSettingsPanel({ initialUrl, initiallyConfigured }: { initialUrl: string; initiallyConfigured: boolean }) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl)
  const [token, setToken] = useState('')
  const [configured, setConfigured] = useState(initiallyConfigured)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    startTransition(async () => {
      try {
        const result = await saveSheetsConfig({ url, token })
        setUrl(result.url)
        setConfigured(result.configured)
        setToken('')
        setMessage('Pengaturan berhasil disimpan. Integrasi Spreadsheet siap digunakan.')
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Pengaturan tidak dapat disimpan.')
      }
    })
  }

  return (
    <section className="directory-page sheets-settings-page" aria-labelledby="sheets-settings-title">
      <div className="directory-heading">
        <div><span className="eyebrow">KONEKSI DATA · ADMIN</span><h1 id="sheets-settings-title">Pengaturan Google Sheets</h1><p>Isi alamat Web App Apps Script dan token rahasia untuk sinkronisasi setoran, dashboard, dan video edukasi.</p></div>
      </div>
      <div className="sheets-settings-card">
        <div className="sheets-settings-intro">
          <span className="settings-icon"><ShieldCheck aria-hidden="true" /></span>
          <div><h2>Kredensial integrasi</h2><p>Nilai rahasia dikirim langsung ke server dan disimpan terenkripsi. Token tidak pernah ditampilkan kembali.</p></div>
          <span className={`settings-status${configured ? ' is-ready' : ''}`}><i aria-hidden="true" />{configured ? 'Terkonfigurasi' : 'Belum diatur'}</span>
        </div>
        <form className="sheets-settings-form" onSubmit={submit}>
          <label className="deposit-field"><span>URL Web App Apps Script</span><input type="url" inputMode="url" autoComplete="url" placeholder="https://script.google.com/macros/s/.../exec" value={url} onChange={(event) => setUrl(event.target.value)} required maxLength={500} aria-describedby="apps-script-url-help" /><small id="apps-script-url-help">Salin URL dari Deploy → Manage deployments pada Apps Script.</small></label>
          <label className="deposit-field"><span><KeyRound aria-hidden="true" /> Token rahasia</span><input type="password" autoComplete="new-password" placeholder={configured ? 'Token tersimpan, kosongkan untuk mempertahankan' : 'Masukkan token yang sama dengan Script Properties'} value={token} onChange={(event) => setToken(event.target.value)} maxLength={5000} aria-describedby="sheets-token-help" /><small id="sheets-token-help">Token harus sama dengan nilai <code>SHEETS_SECRET_TOKEN</code> di Script Properties Apps Script. Kosongkan jika tidak ingin menggantinya.</small></label>
          {error && <p className="sheets-settings-message is-error" role="alert">{error}</p>}
          {message && <p className="sheets-settings-message is-success" role="status"><CheckCircle2 aria-hidden="true" />{message}</p>}
          <div className="sheets-settings-footer"><p>Gunakan URL deployment Web App yang berakhiran <code>/exec</code>. Akses Petugas dibatasi berdasarkan kelasnya.</p><button className="primary-button" type="submit" disabled={pending}><Save aria-hidden="true" />{pending ? 'Menyimpan…' : 'Simpan pengaturan'}</button></div>
        </form>
      </div>
      <aside className="sheets-setup-note"><span className="eyebrow">SEBELUM MENYIMPAN</span><ol><li>Deploy versi terbaru Apps Script sebagai Web App dengan akses yang sesuai.</li><li>Pastikan Script Properties berisi <code>SHEETS_SECRET_TOKEN</code>.</li><li>Masukkan URL deployment dan token yang sama di formulir ini.</li></ol><p>Apps Script menyiapkan tab <code>Master_Kelas</code> berisi X-A sampai X-H, XI-A sampai XI-H, dan XII-A sampai XII-H, <code>Rekap</code>, <code>Video_Edukasi</code>, dan <code>Statistik_Video</code>. Admin dapat menambah atau menonaktifkan kelas di <code>Master_Kelas</code>; dropdown portal mengikuti kelas aktif dan diperbarui dalam waktu maksimal 5 menit. Pertahankan format kode seperti <code>XI-C</code>, isi <code>Aktif</code> dengan <code>Ya</code> atau <code>Tidak</code>, dan atur wali kelas di kolomnya. Tab <code>Rekap</code> menghitung berat dan kepatuhan per kelas. Untuk video, lengkapi tautan YouTube dan set <code>Tampil</code> ke <code>Ya</code>; status tayang website serta urutannya diatur lewat menu <strong>Atur Video Edukasi</strong>.</p></aside>
    </section>
  )
}
