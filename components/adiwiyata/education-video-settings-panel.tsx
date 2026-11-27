'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Film, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { deleteEducationVideo, saveEducationVideo, saveEducationVideoSettings } from '@/app/actions/education-videos'
import type { EducationVideo } from '@/lib/education-videos'
import { allowedVideoCategories } from '@/lib/education-video-categories'

type VideoAdminData = { videos: EducationVideo[]; error: string | null }
type VideoForm = { originalVideoId?: string; youtubeUrl: string; title: string; category: string; description: string; displayOrder: number; enabled: boolean }
const emptyForm: VideoForm = { youtubeUrl: '', title: '', category: allowedVideoCategories[0], description: '', displayOrder: 0, enabled: true }

export function EducationVideoSettingsPanel({ data }: { data: VideoAdminData }) {
  const router = useRouter()
  const [videos, setVideos] = useState(data.videos)
  const [form, setForm] = useState<VideoForm>(emptyForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => setVideos(data.videos), [data.videos])

  function updateVideo(videoId: string, changes: Partial<EducationVideo>) {
    setVideos((current) => current.map((video) => video.videoId === videoId ? { ...video, ...changes } : video))
  }

  function resetForm() {
    setForm(emptyForm)
    setError('')
  }

  function submitVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    startTransition(async () => {
      try {
        await saveEducationVideo(form)
        setMessage(form.originalVideoId ? 'Video berhasil diperbarui.' : 'Video berhasil ditambahkan.')
        resetForm()
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Video belum berhasil disimpan. Periksa koneksi, lalu coba lagi.')
      }
    })
  }

  function saveSettings() {
    setMessage('')
    setError('')
    startTransition(async () => {
      try {
        await saveEducationVideoSettings(videos.map((video) => ({
          videoId: video.videoId,
          enabled: video.enabled !== false,
          displayOrder: Number(video.displayOrder ?? video.order),
        })))
        setMessage('Urutan dan status tayang berhasil disimpan.')
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Pengaturan video belum berhasil disimpan. Periksa koneksi, lalu coba lagi.')
      }
    })
  }

  function editVideo(video: EducationVideo) {
    setError('')
    setMessage('')
    setForm({ originalVideoId: video.videoId, youtubeUrl: video.youtubeUrl, title: video.title, category: video.category, description: video.description, displayOrder: video.displayOrder ?? video.order, enabled: video.enabled !== false })
    document.getElementById('video-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function removeVideo(video: EducationVideo) {
    if (!window.confirm(`Hapus video “${video.title}”? Video yang dihapus tidak bisa dikembalikan.`)) return
    setMessage('')
    setError('')
    startTransition(async () => {
      try {
        await deleteEducationVideo(video.videoId)
        if (form.originalVideoId === video.videoId) resetForm()
        setMessage('Video berhasil dihapus.')
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Video belum berhasil dihapus. Periksa koneksi, lalu coba lagi.')
      }
    })
  }

  return (
    <section className="directory-page video-admin-page" aria-labelledby="video-admin-title">
      <div className="directory-heading"><div><span className="eyebrow">KONTEN · ADMIN</span><h1 id="video-admin-title">Atur Video Edukasi</h1><p>Tambah video YouTube, ubah detailnya, dan atur video yang ditayangkan.</p></div><span className="directory-total"><strong>{videos.filter((video) => video.enabled !== false).length}</strong> ditayangkan</span></div>
      <aside className="video-admin-note"><Film aria-hidden="true" /><p>Perubahan tersimpan langsung. Gunakan tautan YouTube publik atau tautan Shorts yang valid.</p></aside>
      {data.error && <p className="auth-error" role="alert">{data.error}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-success" role="status">{message}</p>}

      <form id="video-editor" className="video-editor-form" onSubmit={submitVideo}>
        <div className="video-editor-heading"><div><span className="eyebrow">{form.originalVideoId ? 'UBAH MATERI' : 'MATERI BARU'}</span><h2>{form.originalVideoId ? 'Edit video edukasi' : 'Tambah video edukasi'}</h2></div>{form.originalVideoId && <button className="video-editor-cancel" type="button" onClick={resetForm}><X aria-hidden="true" />Batal edit</button>}</div>
        <label className="video-editor-field"><span>Tautan YouTube <strong aria-hidden="true">*</strong></span><input type="url" required maxLength={500} placeholder="https://www.youtube.com/watch?v=…" value={form.youtubeUrl} onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))} /></label>
        <label className="video-editor-field"><span>Judul video <strong aria-hidden="true">*</strong></span><input type="text" required maxLength={160} placeholder="Contoh: Cara memilah sampah organik" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
        <label className="video-editor-field"><span>Kategori</span><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{allowedVideoCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label className="video-editor-field"><span>Deskripsi <small>(opsional)</small></span><textarea maxLength={500} rows={3} placeholder="Ringkasan singkat isi video" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
        <div className="video-editor-options"><label className="video-order-field"><span>Urutan tayang</span><input type="number" min="0" max="1000" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))} /></label><label className="video-editor-checkbox"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} /><span>Tampilkan di halaman edukasi</span></label></div>
        <button className="primary-button" type="submit" disabled={pending}><Save aria-hidden="true" />{pending ? 'Menyimpan…' : form.originalVideoId ? 'Simpan perubahan' : <><Plus aria-hidden="true" />Tambah video</>}</button>
      </form>

      <div className="video-admin-list-heading"><h2>Daftar video</h2><span>{videos.length} video</span></div>
      {videos.length ? <div className="video-admin-list">{videos.map((video, index) => <article className={`video-admin-row${video.enabled === false ? ' is-hidden' : ''}`} key={video.videoId || `${video.title}-${index}`}>
        <div className="video-admin-thumb">{video.videoId ? <img src={`https://i.ytimg.com/vi/${video.videoId}/default.jpg`} alt="" loading="lazy" /> : <Film aria-hidden="true" />}</div>
        <div className="video-admin-info"><span className="eyebrow">{video.category}</span><strong>{video.title}</strong><small>{video.youtubeUrl}</small></div>
        <label className="video-order-field"><span>Urutan</span><input type="number" min="0" max="1000" value={video.displayOrder ?? video.order} onChange={(event) => updateVideo(video.videoId, { displayOrder: Number(event.target.value) })} /></label>
        <div className="video-admin-actions"><button className="video-visibility-button" type="button" aria-pressed={video.enabled !== false} aria-label={`${video.enabled === false ? 'Tampilkan' : 'Sembunyikan'} ${video.title}`} onClick={() => updateVideo(video.videoId, { enabled: video.enabled === false })}>{video.enabled === false ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}<span>{video.enabled === false ? 'Tersembunyi' : 'Tampil'}</span></button><button className="video-icon-button" type="button" aria-label={`Edit ${video.title}`} onClick={() => editVideo(video)}><Pencil aria-hidden="true" /></button><button className="video-icon-button is-danger" type="button" aria-label={`Hapus ${video.title}`} onClick={() => removeVideo(video)}><Trash2 aria-hidden="true" /></button></div>
      </article>)}</div> : !data.error ? <div className="empty-search"><Film aria-hidden="true" /><strong>Belum ada video</strong><span>Tambahkan video edukasi menggunakan formulir di atas.</span></div> : null}
      <div className="video-admin-footer"><p>Perubahan urutan dan status pada daftar di atas belum disimpan.</p><button className="primary-button" type="button" onClick={saveSettings} disabled={pending || videos.length === 0}><Save aria-hidden="true" />{pending ? 'Menyimpan…' : 'Simpan urutan dan status'}</button></div>
    </section>
  )
}
