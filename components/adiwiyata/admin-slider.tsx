'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent, type SetStateAction } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Eye, ImagePlus, Leaf, Move, Plus, Save, Trash2, X } from 'lucide-react'
import { deleteSliderSlide, duplicateSliderSlide, saveSliderOrder, saveSliderSettings, saveSliderSlide, toggleSliderSlide } from '@/app/actions/slider'
import { HomeSlider } from '@/components/adiwiyata/home-slider'
import type { SliderPageData, SliderSettings, SliderSlide } from '@/lib/slider/data'

type EditorDraft = {
  id: string
  judul: string
  deskripsi: string
  ctaTeks: string
  ctaUrl: string
  altText: string
  tanggalMulai: string
  tanggalSelesai: string
  aktif: boolean
  imageUrl: string
}

const blankDraft = (): EditorDraft => ({ id: '', judul: '', deskripsi: '', ctaTeks: '', ctaUrl: '', altText: '', tanggalMulai: '', tanggalSelesai: '', aktif: true, imageUrl: '' })

export function AdminSlider({ data }: { data: SliderPageData }) {
  const router = useRouter()
  const [slides, setSlides] = useState(data.slides)
  const [settingsDraft, setSettingsDraft] = useState(data.settings)
  const [draft, setDraft] = useState<EditorDraft | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedFile) {
      setLocalImageUrl(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setLocalImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  useEffect(() => {
    setSlides(data.slides)
    setSettingsDraft(data.settings)
  }, [data])

  useEffect(() => {
    if (!draft && !preview) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (preview) setPreview(false)
      else setDraft(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draft, preview])

  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>(preview ? '.slider-preview-dialog' : '.slider-editor-dialog')
    dialog?.querySelector<HTMLElement>('button, input:not([type="file"]), textarea, select')?.focus()
  }, [Boolean(draft), preview])

  function announce(text: string) {
    setError('')
    setMessage(text)
  }

  function report(errorValue: unknown) {
    setMessage('')
    setError(errorValue instanceof Error ? errorValue.message : 'Perubahan tidak dapat disimpan. Silakan coba lagi.')
  }

  function beginCreate() {
    setDraft(blankDraft())
    setSelectedFile(null)
    setMessage('')
    setError('')
  }

  function beginEdit(slide: SliderSlide) {
    setDraft({
      id: slide.id,
      judul: slide.judul ?? '',
      deskripsi: slide.deskripsi ?? '',
      ctaTeks: slide.ctaTeks ?? '',
      ctaUrl: slide.ctaUrl ?? '',
      altText: slide.altText,
      tanggalMulai: slide.tanggalMulai ?? '',
      tanggalSelesai: slide.tanggalSelesai ?? '',
      aktif: slide.aktif,
      imageUrl: slide.imageUrl,
    })
    setSelectedFile(null)
    setMessage('')
    setError('')
  }

  async function submitSlide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    const formData = new FormData()
    formData.set('id', draft.id)
    formData.set('judul', draft.judul)
    formData.set('deskripsi', draft.deskripsi)
    formData.set('cta_teks', draft.ctaTeks)
    formData.set('cta_url', draft.ctaUrl)
    formData.set('alt_text', draft.altText)
    formData.set('tanggal_mulai', draft.tanggalMulai)
    formData.set('tanggal_selesai', draft.tanggalSelesai)
    formData.set('aktif', String(draft.aktif))
    if (selectedFile) formData.set('gambar', selectedFile)
    setBusy(true)
    try {
      await saveSliderSlide(formData)
      setDraft(null)
      setSelectedFile(null)
      announce(draft.id ? 'Perubahan slide berhasil disimpan.' : 'Slide baru berhasil ditambahkan.')
      router.refresh()
    } catch (caught) {
      report(caught)
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await saveSliderSettings(settingsDraft)
      announce('Pengaturan slider berhasil disimpan.')
      router.refresh()
    } catch (caught) {
      report(caught)
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(slide: SliderSlide) {
    setBusy(true)
    try {
      await toggleSliderSlide(slide.id, !slide.aktif)
      setSlides((current) => current.map((item) => item.id === slide.id ? { ...item, aktif: !item.aktif } : item))
      announce(slide.aktif ? 'Slide dinonaktifkan.' : 'Slide diaktifkan.')
      router.refresh()
    } catch (caught) {
      report(caught)
    } finally {
      setBusy(false)
    }
  }

  async function duplicate(slide: SliderSlide) {
    setBusy(true)
    try {
      await duplicateSliderSlide(slide.id)
      announce('Slide berhasil diduplikat sebagai nonaktif.')
      router.refresh()
    } catch (caught) {
      report(caught)
    } finally {
      setBusy(false)
    }
  }

  async function remove(slide: SliderSlide) {
    if (!window.confirm(`Hapus slide “${slide.judul || 'tanpa judul'}”? Gambar unggahan akan ikut dihapus.`)) return
    setBusy(true)
    try {
      await deleteSliderSlide(slide.id)
      setSlides((current) => current.filter((item) => item.id !== slide.id))
      announce('Slide dan gambar unggahannya berhasil dihapus.')
      router.refresh()
    } catch (caught) {
      report(caught)
    } finally {
      setBusy(false)
    }
  }

  async function persistOrder(nextSlides: SliderSlide[]) {
    setSlides(nextSlides)
    setBusy(true)
    try {
      await saveSliderOrder(nextSlides.map((slide) => slide.id))
      announce('Urutan slide berhasil disimpan.')
      router.refresh()
    } catch (caught) {
      report(caught)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function reorder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const next = [...slides]
    const from = next.findIndex((slide) => slide.id === sourceId)
    const to = next.findIndex((slide) => slide.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    void persistOrder(next)
    setDraggedId(null)
  }

  function moveBy(slideId: string, offset: -1 | 1) {
    const from = slides.findIndex((slide) => slide.id === slideId)
    const to = from + offset
    if (from < 0 || to < 0 || to >= slides.length) return
    const next = [...slides]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    void persistOrder(next)
  }

  const previewSlides = (() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const isScheduled = (slide: SliderSlide) => slide.aktif && (!slide.tanggalMulai || slide.tanggalMulai <= today) && (!slide.tanggalSelesai || slide.tanggalSelesai >= today)
    const current = draft ? slides.map((slide) => slide.id === draft.id ? {
      ...slide,
      imageUrl: localImageUrl ?? draft.imageUrl,
      altText: draft.altText || slide.altText,
      judul: draft.judul || null,
      deskripsi: draft.deskripsi || null,
      ctaTeks: draft.ctaTeks || null,
      ctaUrl: draft.ctaUrl || null,
      aktif: draft.aktif,
      tanggalMulai: draft.tanggalMulai || null,
      tanggalSelesai: draft.tanggalSelesai || null,
    } : slide).filter(isScheduled) : slides.filter(isScheduled)
    if (draft && !draft.id && draft.aktif && localImageUrl && (!draft.tanggalMulai || draft.tanggalMulai <= today) && (!draft.tanggalSelesai || draft.tanggalSelesai >= today)) current.push({
      id: 'preview-draft',
      imageUrl: localImageUrl,
      altText: draft.altText || 'Pratinjau gambar slide baru',
      judul: draft.judul || null,
      deskripsi: draft.deskripsi || null,
      ctaTeks: draft.ctaTeks || null,
      ctaUrl: draft.ctaUrl || null,
      urutan: current.length,
      aktif: true,
      tanggalMulai: draft.tanggalMulai || null,
      tanggalSelesai: draft.tanggalSelesai || null,
    })
    return current
  })()

  return (
    <main className="slider-admin-page">
      <header className="slider-admin-header">
        <a className="slider-admin-back" href="/"><ArrowLeft aria-hidden="true" /> Kembali ke portal</a>
        <div className="slider-admin-title-row"><span className="slider-admin-mark"><Leaf aria-hidden="true" /></span><div><span className="eyebrow">PENGELOLAAN BERANDA</span><h1>Slider Beranda</h1></div></div>
        <p>Atur cerita visual, jadwal tayang, dan kontrol carousel Adiwiyata SMAN 55 Jakarta.</p>
        <div className="slider-admin-header-actions"><button type="button" className="secondary-button" onClick={() => setPreview(true)}><Eye aria-hidden="true" /> Pratinjau</button><button type="button" className="primary-button" onClick={beginCreate}><Plus aria-hidden="true" /> Tambah Slide</button></div>
      </header>

      {(message || error) && <div className={`slider-toast ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>{error || message}</div>}

      <form className="slider-settings-card" onSubmit={saveSettings}>
        <div className="slider-card-heading"><div><span className="eyebrow">KONTROL TAYANG</span><h2>Pengaturan Slider</h2></div><span className="slider-settings-mark"><Move aria-hidden="true" /> Pengaturan global</span></div>
        <div className="slider-settings-grid">
          <label className="slider-field"><span>Kecepatan autoplay <small>(2–15 detik)</small></span><input type="number" min={2} max={15} value={settingsDraft.intervalDetik} onChange={(event) => setSettingsDraft((current) => ({ ...current, intervalDetik: Number(event.target.value) }))} /></label>
          <label className="slider-field"><span>Jenis transisi</span><select value={settingsDraft.transisi} onChange={(event) => setSettingsDraft((current) => ({ ...current, transisi: event.target.value as SliderSettings['transisi'] }))}><option value="fade">Fade</option><option value="slide">Geser</option></select></label>
          <div className="slider-setting-toggles">
            <Toggle label="Autoplay" description="Ganti slide otomatis" checked={settingsDraft.autoplay} onChange={(checked) => setSettingsDraft((current) => ({ ...current, autoplay: checked }))} />
            <Toggle label="Panah navigasi" description="Tampilkan tombol sebelumnya/berikutnya" checked={settingsDraft.tampilPanah} onChange={(checked) => setSettingsDraft((current) => ({ ...current, tampilPanah: checked }))} />
            <Toggle label="Indikator titik" description="Tampilkan pilihan slide" checked={settingsDraft.tampilDots} onChange={(checked) => setSettingsDraft((current) => ({ ...current, tampilDots: checked }))} />
          </div>
        </div>
        <div className="slider-admin-footer"><p>Autoplay otomatis berhenti saat pointer berada di slider, tab tidak aktif, atau preferensi gerak dikurangi.</p><button className="primary-button" type="submit" disabled={busy}><Save aria-hidden="true" /> Simpan Pengaturan</button></div>
      </form>

      <section className="slider-admin-list" aria-labelledby="slider-list-heading">
        <div className="slider-card-heading"><div><span className="eyebrow">KONTEN BERANDA</span><h2 id="slider-list-heading">Daftar Slide <span className="slider-count">{slides.length}</span></h2></div><span className="slider-list-hint"><Move aria-hidden="true" /> Seret untuk mengurutkan</span></div>
        <div className="slider-slide-list">
          {slides.length ? slides.map((slide, index) => <article
            className={`slider-slide-card${slide.aktif ? '' : ' is-inactive'}${draggedId === slide.id ? ' is-dragging' : ''}`}
            key={slide.id}
            draggable={!busy}
            onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', slide.id); setDraggedId(slide.id) }}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); reorder(event.dataTransfer.getData('text/plain') || draggedId || '', slide.id) }}
          >
            <div className="slider-card-thumb"><Image src={slide.imageUrl} alt={slide.altText} fill sizes="112px" /></div>
            <div className="slider-card-info"><span className="eyebrow">URUTAN {String(index + 1).padStart(2, '0')}</span><strong>{slide.judul || 'Tanpa judul'}</strong><span className={`slider-status ${slide.aktif ? 'is-active' : 'is-inactive'}`}>{slide.aktif ? 'Aktif' : 'Nonaktif'}{(slide.tanggalMulai || slide.tanggalSelesai) && <small> · Terjadwal</small>}</span></div>
            <div className="slider-order-controls"><button type="button" aria-label={`Naikkan urutan ${slide.judul || `slide ${index + 1}`}`} disabled={busy || index === 0} onClick={() => moveBy(slide.id, -1)}><ArrowUp aria-hidden="true" /></button><button type="button" aria-label={`Turunkan urutan ${slide.judul || `slide ${index + 1}`}`} disabled={busy || index === slides.length - 1} onClick={() => moveBy(slide.id, 1)}><ArrowDown aria-hidden="true" /></button></div>
            <div className="slider-card-actions"><button className="slider-icon-button" type="button" aria-label={`Edit ${slide.judul || 'slide'}`} onClick={() => beginEdit(slide)}><Eye aria-hidden="true" /></button><button className="slider-icon-button" type="button" aria-label={`Duplikat ${slide.judul || 'slide'}`} disabled={busy} onClick={() => void duplicate(slide)}><Copy aria-hidden="true" /></button><button className="slider-icon-button is-danger" type="button" aria-label={`Hapus ${slide.judul || 'slide'}`} disabled={busy} onClick={() => void remove(slide)}><Trash2 aria-hidden="true" /></button><button className={`slider-status-button${slide.aktif ? ' is-on' : ''}`} type="button" aria-pressed={slide.aktif} disabled={busy} onClick={() => void changeStatus(slide)}>{slide.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button></div>
          </article>) : <div className="slider-empty-list"><ImagePlus aria-hidden="true" /><strong>Belum ada slide</strong><p>Tambahkan slide untuk menampilkan sorotan di halaman Beranda.</p><button type="button" className="primary-button" onClick={beginCreate}><Plus aria-hidden="true" /> Tambah Slide</button></div>}
        </div>
        <p className="slider-storage-note">Gambar unggahan dikompresi menjadi WebP dan disimpan di basis data Neon yang sudah terhubung. Ukuran berkas awal maksimal 2 MB; ukuran anjuran 1600 × 900 px.</p>
      </section>

      {draft && <SlideEditor
        draft={draft}
        setDraft={setDraft}
        file={selectedFile}
        setFile={setSelectedFile}
        imagePreview={localImageUrl ?? draft.imageUrl}
        busy={busy}
        onClose={() => { setDraft(null); setSelectedFile(null) }}
        onSubmit={submitSlide}
        onPreview={() => setPreview(true)}
        onUploadError={(text) => { setError(text); setMessage('') }}
      />}

      {preview && <div className="slider-modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(false) }}>
        <section className="slider-preview-dialog" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="slider-preview-title">
          <div className="slider-preview-heading"><div><span className="eyebrow">PRATINJAU</span><h2 id="slider-preview-title">Tampilan Beranda</h2></div><button className="slider-icon-button" type="button" aria-label="Tutup pratinjau" onClick={() => setPreview(false)}><X aria-hidden="true" /></button></div>
          <HomeSlider slides={previewSlides} settings={settingsDraft} preview />
          <p>Pratinjau menggunakan perubahan formulir yang belum disimpan.</p>
        </section>
      </div>}
    </main>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="slider-toggle"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="slider-toggle-track" aria-hidden="true"><i /></span></label>
}

function SlideEditor({ draft, setDraft, file, setFile, imagePreview, busy, onClose, onSubmit, onPreview, onUploadError }: {
  draft: EditorDraft
  setDraft: (action: SetStateAction<EditorDraft | null>) => void
  file: File | null
  setFile: (file: File | null) => void
  imagePreview: string
  busy: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onPreview: () => void
  onUploadError: (message: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const patch = (values: Partial<EditorDraft>) => setDraft((current) => current ? { ...current, ...values } : current)
  const acceptFile = async (candidate?: File) => {
    if (!candidate) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type)) {
      setFile(null)
      onUploadError('Format gambar harus JPG, PNG, atau WebP.')
      return
    }
    if (candidate.size > 2 * 1024 * 1024) {
      setFile(null)
      onUploadError('Ukuran gambar maksimal 2 MB.')
      return
    }
    try {
      const bitmap = await createImageBitmap(candidate)
      if (bitmap.width * bitmap.height > 40_000_000) {
        bitmap.close()
        throw new Error('Dimensi gambar terlalu besar untuk diproses.')
      }
      const scale = Math.min(1, 1600 / bitmap.width, 1200 / bitmap.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Gambar tidak dapat diproses di peramban ini.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const compressed = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Gambar gagal dikompresi.')), 'image/webp', 0.84))
      if (compressed.size > 2 * 1024 * 1024) throw new Error('Hasil kompresi masih melebihi 2 MB.')
      onUploadError('')
      setFile(new File([compressed], `${crypto.randomUUID()}.webp`, { type: 'image/webp' }))
    } catch (caught) {
      setFile(null)
      onUploadError(caught instanceof Error ? caught.message : 'Gambar gagal diproses. Silakan gunakan berkas lain.')
    }
  }

  return <div className="slider-modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="slider-editor-dialog" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="slider-editor-title">
      <div className="slider-editor-heading"><div><span className="eyebrow">KONTEN VISUAL</span><h2 id="slider-editor-title">{draft.id ? 'Edit Slide' : 'Tambah Slide'}</h2></div><button className="slider-icon-button" type="button" aria-label="Tutup formulir" onClick={onClose}><X aria-hidden="true" /></button></div>
      <form onSubmit={onSubmit}>
        <label className={`slider-upload-zone${dragOver ? ' is-dragover' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { event.preventDefault(); setDragOver(false); void acceptFile(event.dataTransfer.files[0]) }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Pilih gambar slide" onChange={(event) => { void acceptFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
          {imagePreview ? <div className="slider-upload-preview"><Image src={imagePreview} alt={draft.altText || 'Pratinjau gambar slide'} fill sizes="(max-width: 700px) 90vw, 620px" unoptimized /><span><ImagePlus aria-hidden="true" />{file ? file.name : 'Gambar saat ini'} · Klik atau seret gambar untuk mengganti</span></div> : <div className="slider-upload-empty"><ImagePlus aria-hidden="true" /><strong>Pilih gambar atau seret ke sini</strong><span>JPG, PNG, WebP · maksimal 2 MB</span><small>Ukuran anjuran 1600 × 900 px</small></div>}
        </label>
        <div className="slider-editor-grid">
          <label className="slider-field"><span>Judul <small>opsional</small></span><input maxLength={120} value={draft.judul} onChange={(event) => patch({ judul: event.target.value })} placeholder="Contoh: Mulai dari Pilah" /></label>
          <label className="slider-field"><span>Alt text gambar <b aria-hidden="true">*</b></span><input required maxLength={240} value={draft.altText} onChange={(event) => patch({ altText: event.target.value })} placeholder="Jelaskan isi gambar secara singkat" /></label>
          <label className="slider-field slider-field-full"><span>Deskripsi singkat <small>opsional · maks. 280 karakter</small></span><textarea maxLength={280} rows={3} value={draft.deskripsi} onChange={(event) => patch({ deskripsi: event.target.value })} /></label>
          <label className="slider-field"><span>Teks tombol <small>opsional</small></span><input maxLength={48} value={draft.ctaTeks} onChange={(event) => patch({ ctaTeks: event.target.value })} placeholder="Jelajahi program" /></label>
          <label className="slider-field"><span>Tautan tombol <small>jalur / atau http/https</small></span><input maxLength={500} value={draft.ctaUrl} onChange={(event) => patch({ ctaUrl: event.target.value })} placeholder="/edukasi atau https://..." /></label>
          <label className="slider-field"><span>Tanggal mulai <small>opsional</small></span><input type="date" value={draft.tanggalMulai} onChange={(event) => patch({ tanggalMulai: event.target.value })} /></label>
          <label className="slider-field"><span>Tanggal selesai <small>opsional</small></span><input type="date" value={draft.tanggalSelesai} onChange={(event) => patch({ tanggalSelesai: event.target.value })} /></label>
        </div>
        <Toggle label="Tampilkan slide" description="Slide aktif akan tampil sesuai jadwal tayang" checked={draft.aktif} onChange={(aktif) => patch({ aktif })} />
        <div className="slider-editor-footer"><button type="button" className="secondary-button" onClick={onPreview}><Eye aria-hidden="true" /> Pratinjau</button><button type="button" className="secondary-button" onClick={onClose}>Batal</button><button type="submit" className="primary-button" disabled={busy}><Check aria-hidden="true" /> {busy ? 'Menyimpan…' : 'Simpan Slide'}</button></div>
      </form>
    </section>
  </div>
}
