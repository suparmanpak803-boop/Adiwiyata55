'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, FileText, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { deleteAdiwiyataDocument } from '@/app/actions/documents'
import type { AdiwiyataDocument } from '@/lib/documents'

export function DocumentAdminPanel({ documents }: { documents: AdiwiyataDocument[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [documentCount, setDocumentCount] = useState(documents.length)

  useEffect(() => setDocumentCount(documents.length), [documents.length])

  async function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const form = event.currentTarget
    const formData = new FormData(form)
    setUploading(true)
    try {
      const response = await fetch('/api/admin/documents', { method: 'POST', body: formData })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Dokumen belum berhasil diunggah.')
      form.reset()
      if (fileRef.current) fileRef.current.value = ''
      setMessage('Dokumen berhasil ditambahkan ke arsip publik.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Dokumen belum berhasil diunggah.')
    } finally {
      setUploading(false)
    }
  }

  function removeDocument(document: AdiwiyataDocument) {
    if (!window.confirm(`Hapus “${document.title}” dari arsip? Tindakan ini tidak dapat dibatalkan.`)) return
    setError('')
    setMessage('')
    startTransition(async () => {
      try {
        await deleteAdiwiyataDocument(document.id)
        setMessage('Dokumen berhasil dihapus.')
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Dokumen belum berhasil dihapus.')
      }
    })
  }

  return (
    <main className="document-admin-page" aria-labelledby="document-admin-title">
      <header className="document-admin-heading">
        <div><span className="eyebrow">PENGELOLAAN KONTEN · ADMIN</span><h1 id="document-admin-title">Dokumen & arsip</h1><p>Tambahkan berkas kegiatan agar warga sekolah dapat membuka dan mengunduhnya dari halaman Adiwiyata.</p></div>
        <span className="document-admin-count"><strong>{documentCount}</strong> dokumen publik</span>
      </header>

      <form className="document-upload-card" onSubmit={(event) => { void submitDocument(event) }}>
        <div className="document-upload-intro"><span className="document-upload-icon"><Upload aria-hidden="true" /></span><div><h2>Tambahkan dokumen</h2><p>Berkas akan tersimpan di Blob dan tampil pada arsip publik.</p></div></div>
        <div className="document-upload-fields">
          <label><span>Judul dokumen <b aria-hidden="true">*</b></span><input name="title" required maxLength={160} placeholder="Contoh: Laporan kegiatan kebun sekolah" /></label>
          <label><span>Kategori</span><input name="category" maxLength={80} placeholder="Contoh: Kebersihan" /></label>
          <label className="document-description-field"><span>Keterangan</span><textarea name="description" maxLength={500} rows={3} placeholder="Tanggal kegiatan atau keterangan singkat" /></label>
          <label className="document-file-field"><span>Berkas <b aria-hidden="true">*</b></span><input ref={fileRef} name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx" /><small>PDF, gambar, Word, Excel, atau PowerPoint · maksimal 4 MB</small></label>
        </div>
        {error && <p className="document-feedback is-error" role="alert">{error}</p>}
        {message && <p className="document-feedback is-success" role="status">{message}</p>}
        <button className="primary-button document-submit" type="submit" disabled={pending || uploading}>{uploading ? <LoaderCircle aria-hidden="true" className="is-spinning" /> : <Upload aria-hidden="true" />}{uploading ? 'Mengunggah…' : 'Unggah dokumen'}</button>
      </form>

      <section className="document-admin-list" aria-labelledby="document-list-title">
        <div className="document-list-heading"><div><span className="eyebrow">ARSIP PUBLIK</span><h2 id="document-list-title">Dokumen tersimpan</h2></div><span>{documents.length} berkas</span></div>
        {documents.length ? <div className="document-admin-grid">{documents.map((document) => <article className="document-admin-row" key={document.id}>
          <span className="document-admin-file-icon"><FileText aria-hidden="true" /></span>
          <div className="document-admin-info"><span className="document-admin-category">{document.category}</span><strong>{document.title}</strong><p>{document.description || 'Tidak ada keterangan tambahan.'}</p><small>{document.pathname.startsWith('legacy/') ? 'Arsip sebelumnya' : `${(document.fileSize / (1024 * 1024)).toFixed(1)} MB`}</small></div>
          <div className="document-admin-actions"><a href={document.url} target="_blank" rel="noreferrer" aria-label={`Buka ${document.title}`}><ArrowUpRight aria-hidden="true" /></a><button type="button" aria-label={`Hapus ${document.title}`} disabled={pending} onClick={() => removeDocument(document)}><Trash2 aria-hidden="true" /></button></div>
        </article>)}</div> : <div className="document-admin-empty"><FileText aria-hidden="true" /><strong>Belum ada dokumen</strong><span>Unggah berkas pertama untuk mulai mengisi arsip publik.</span></div>}
      </section>
    </main>
  )
}
