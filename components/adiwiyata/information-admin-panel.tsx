'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, FileText, ImagePlus, Leaf, LoaderCircle, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { DEFAULT_ADIWIYATA_SITE_CONTENT, type AdiwiyataSiteContent } from '@/lib/adiwiyata-site-content'

const fieldGroups: { title: string; description: string; fields: { path: string; label: string; multiline?: boolean }[] }[] = [
  {
    title: 'Beranda',
    description: 'Atur banner, ajakan, ringkasan kegiatan, dan teks profil pada halaman utama Informasi Adiwiyata.',
    fields: [
      { path: 'home.eyebrow', label: 'Label program' },
      { path: 'home.title', label: 'Judul utama — baris pertama' },
      { path: 'home.emphasis', label: 'Judul utama — baris penekanan' },
      { path: 'home.description', label: 'Pengantar beranda', multiline: true },
      { path: 'home.primaryAction', label: 'Tombol kegiatan' },
      { path: 'home.secondaryAction', label: 'Tombol arsip' },
      { path: 'home.caption', label: 'Keterangan singkat' },
      { path: 'home.visualLabel', label: 'Label visual' },
      { path: 'home.visualTitle', label: 'Judul visual' },
      { path: 'home.visualSchool', label: 'Nama sekolah pada visual' },
      { path: 'home.activitiesEyebrow', label: 'Label bagian kegiatan' },
      { path: 'home.activitiesTitle', label: 'Judul bagian kegiatan' },
      { path: 'home.activitiesLink', label: 'Tautan semua kegiatan' },
      { path: 'home.profileEyebrow', label: 'Label bagian profil' },
      { path: 'home.profileTitle', label: 'Judul ringkasan profil' },
      { path: 'home.profileDescription', label: 'Ringkasan profil', multiline: true },
      { path: 'home.footerText', label: 'Teks footer' },
    ],
  },
  {
    title: 'Profil',
    description: 'Teks yang tampil pada halaman profil Adiwiyata.',
    fields: [
      { path: 'pages.profil.title', label: 'Nama bagian' },
      { path: 'pages.profil.intro', label: 'Pengantar halaman', multiline: true },
      { path: 'pages.profil.historyEyebrow', label: 'Label sejarah' },
      { path: 'pages.profil.historyTitle', label: 'Judul informasi sejarah' },
      { path: 'pages.profil.historyBody', label: 'Informasi sejarah', multiline: true },
      { path: 'pages.profil.programsEyebrow', label: 'Label praktik sekolah' },
      { path: 'pages.profil.programsTitle', label: 'Judul praktik sekolah' },
      { path: 'pages.profil.programsBody', label: 'Informasi praktik sekolah', multiline: true },
      { path: 'pages.profil.noteTitle', label: 'Judul catatan kelengkapan' },
      { path: 'pages.profil.noteBody', label: 'Catatan kelengkapan', multiline: true },
    ],
  },
  {
    title: 'Program & kegiatan',
    description: 'Atur judul dan pengantar halaman program.',
    fields: [
      { path: 'pages.program.title', label: 'Nama bagian' },
      { path: 'pages.program.intro', label: 'Pengantar halaman', multiline: true },
    ],
  },
  {
    title: 'Kader Adiwiyata',
    description: 'Atur judul dan pengantar halaman kader Adiwiyata.',
    fields: [
      { path: 'pages.dokumentasi.title', label: 'Nama bagian' },
      { path: 'pages.dokumentasi.intro', label: 'Pengantar halaman', multiline: true },
    ],
  },
  {
    title: 'Artikel & berita',
    description: 'Atur judul dan pengantar halaman publikasi.',
    fields: [
      { path: 'pages.publikasi.title', label: 'Nama bagian' },
      { path: 'pages.publikasi.intro', label: 'Pengantar halaman', multiline: true },
    ],
  },
  {
    title: 'Dokumen & arsip',
    description: 'Atur judul, pengantar, dan pemberitahuan pada halaman arsip.',
    fields: [
      { path: 'pages.dokumen.title', label: 'Nama bagian' },
      { path: 'pages.dokumen.intro', label: 'Pengantar halaman', multiline: true },
      { path: 'pages.dokumen.noteTitle', label: 'Judul pemberitahuan' },
      { path: 'pages.dokumen.noteBody', label: 'Isi pemberitahuan', multiline: true },
    ],
  },
]

type CollectionKey = 'activities' | 'divisions' | 'articles'
type StringRecord = Record<string, string>

const collectionGroups: { key: CollectionKey; title: string; description: string; addLabel: string; emptyRecord: StringRecord; fields: { key: string; label: string; multiline?: boolean }[] }[] = [
  { key: 'activities', title: 'Program & kegiatan', description: 'Daftar ini tampil pada halaman kegiatan dan sorotan beranda.', addLabel: 'Tambah kegiatan', emptyRecord: { title: '', category: '', date: '', description: '' }, fields: [{ key: 'title', label: 'Nama kegiatan' }, { key: 'category', label: 'Kategori' }, { key: 'date', label: 'Waktu kegiatan' }, { key: 'description', label: 'Keterangan', multiline: true }] },
  { key: 'divisions', title: 'Kader Adiwiyata', description: 'Atur nama kader, fokus, dan ringkasan tugas yang tampil untuk publik.', addLabel: 'Tambah kader', emptyRecord: { name: '', focus: '', duties: '' }, fields: [{ key: 'name', label: 'Nama kader' }, { key: 'focus', label: 'Fokus kerja' }, { key: 'duties', label: 'Ringkasan tugas', multiline: true }] },
  { key: 'articles', title: 'Artikel & berita', description: 'Kelola ringkasan publikasi beserta sumber informasinya.', addLabel: 'Tambah artikel', emptyRecord: { title: '', category: '', date: '', description: '', source: '' }, fields: [{ key: 'title', label: 'Judul artikel' }, { key: 'category', label: 'Kategori' }, { key: 'date', label: 'Tanggal' }, { key: 'description', label: 'Ringkasan', multiline: true }, { key: 'source', label: 'Sumber dokumen' }] },
]

function updateCollectionRow(source: AdiwiyataSiteContent, key: CollectionKey, index: number, field: string, value: string): AdiwiyataSiteContent {
  const rows = [...source[key]] as unknown as StringRecord[]
  rows[index] = { ...rows[index], [field]: value }
  return { ...source, [key]: rows } as unknown as AdiwiyataSiteContent
}

function changeCollection(source: AdiwiyataSiteContent, key: CollectionKey, action: 'add' | 'remove', index?: number): AdiwiyataSiteContent {
  const template = collectionGroups.find((item) => item.key === key)?.emptyRecord ?? {}
  const rows = [...source[key]] as unknown as StringRecord[]
  const updated = action === 'add' ? [...rows, { ...template }] : rows.filter((_, rowIndex) => rowIndex !== index)
  return { ...source, [key]: updated } as unknown as AdiwiyataSiteContent
}

function readPath(source: AdiwiyataSiteContent, path: string) {
  return path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], source) as string
}

function writePath(source: AdiwiyataSiteContent, path: string, value: string): AdiwiyataSiteContent {
  const next = structuredClone(source) as unknown as Record<string, unknown>
  const keys = path.split('.')
  let target = next
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>
  target[keys[keys.length - 1]] = value
  return next as unknown as AdiwiyataSiteContent
}

export function InformationAdminPanel({ initialContent }: { initialContent: AdiwiyataSiteContent }) {
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function saveContent() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/adiwiyata/informasi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const result = await response.json() as { content?: AdiwiyataSiteContent; error?: string }
      if (!response.ok || !result.content) throw new Error(result.error || 'Informasi belum berhasil disimpan.')
      setContent(result.content)
      setMessage('Informasi Adiwiyata berhasil diperbarui dan tampil di halaman publik.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Informasi belum berhasil disimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="information-admin-page" aria-labelledby="information-admin-title">
      <header className="information-admin-heading">
        <Link className="information-back-link" href="/"><ArrowLeft aria-hidden="true" /> Kembali ke portal</Link>
        <span className="information-admin-mark"><Leaf aria-hidden="true" /></span>
        <span className="eyebrow">PENGELOLAAN KONTEN · ADMIN</span>
        <h1 id="information-admin-title">Informasi Adiwiyata</h1>
        <p>Atur judul dan informasi di seluruh halaman publik. Perubahan tersimpan di database dan langsung digunakan oleh halaman Informasi Adiwiyata.</p>
        <Link className="information-public-link" href="/adiwiyata" target="_blank" rel="noreferrer"><Eye aria-hidden="true" /> Lihat halaman publik</Link>
      </header>

      <div className="information-admin-shortcuts" aria-label="Pengelolaan konten lainnya">
        <Link href="/admin/slider"><ImagePlus aria-hidden="true" /><span><strong>Visual beranda</strong><small>Kelola gambar dan sorotan utama.</small></span></Link>
        <Link href="/admin/dokumen"><FileText aria-hidden="true" /><span><strong>Dokumen & arsip</strong><small>Unggah dan atur arsip publik.</small></span></Link>
      </div>

      <div className="information-admin-groups">
        {fieldGroups.map((group, index) => (
          <section className="information-admin-group" key={group.title} aria-labelledby={`content-group-${index}`}>
            <div className="information-group-heading"><span className="information-group-number">0{index + 1}</span><div><h2 id={`content-group-${index}`}>{group.title}</h2><p>{group.description}</p></div></div>
            <div className="information-field-grid">
              {group.fields.map((field) => (
                <label className={field.multiline ? 'information-field is-wide' : 'information-field'} key={field.path}>
                  <span>{field.label}</span>
                  {field.multiline
                    ? <textarea rows={3} maxLength={3000} disabled={saving} value={readPath(content, field.path)} onChange={(event) => setContent((current) => writePath(current, field.path, event.target.value))} />
                    : <input maxLength={3000} disabled={saving} value={readPath(content, field.path)} onChange={(event) => setContent((current) => writePath(current, field.path, event.target.value))} />}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="information-admin-collections">
        {collectionGroups.map((group, index) => {
          const rows = content[group.key] as unknown as StringRecord[]
          return (
            <section className="information-admin-group" key={group.key} aria-labelledby={`collection-group-${index}`}>
              <div className="information-group-heading"><span className="information-group-number">0{index + 7}</span><div><h2 id={`collection-group-${index}`}>{group.title}</h2><p>{group.description}</p></div></div>
              <div className="information-entry-list">
                {rows.map((row, rowIndex) => (
                  <article className="information-entry-card" key={`${group.key}-${rowIndex}`}>
                    <div className="information-entry-heading"><strong>{rowIndex + 1}. {row.title || row.name || group.title}</strong><button type="button" aria-label={`Hapus ${group.title} ${rowIndex + 1}`} disabled={saving} onClick={() => setContent((current) => changeCollection(current, group.key, 'remove', rowIndex))}><Trash2 aria-hidden="true" /></button></div>
                    <div className="information-field-grid">
                      {group.fields.map((field) => (
                        <label className={field.multiline ? 'information-field is-wide' : 'information-field'} key={field.key}>
                          <span>{field.label}</span>
                          {field.multiline
                            ? <textarea rows={3} maxLength={3000} disabled={saving} value={row[field.key] ?? ''} onChange={(event) => setContent((current) => updateCollectionRow(current, group.key, rowIndex, field.key, event.target.value))} />
                            : <input maxLength={3000} disabled={saving} value={row[field.key] ?? ''} onChange={(event) => setContent((current) => updateCollectionRow(current, group.key, rowIndex, field.key, event.target.value))} />}
                        </label>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <button className="information-reset-button information-add-button" type="button" disabled={saving} onClick={() => setContent((current) => changeCollection(current, group.key, 'add'))}><Plus aria-hidden="true" /> {group.addLabel}</button>
            </section>
          )
        })}
      </div>

      {(error || message) && <p className={`information-feedback ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>{error || message}</p>}
      <div className="information-admin-actions">
        <button className="information-reset-button" type="button" disabled={saving} onClick={() => { setContent(DEFAULT_ADIWIYATA_SITE_CONTENT); setMessage('Konten bawaan dimuat ke formulir. Simpan untuk menerapkannya.'); setError('') }}><RotateCcw aria-hidden="true" /> Muat teks bawaan</button>
        <button className="primary-button information-save-button" type="button" disabled={saving} onClick={() => { void saveContent() }}>{saving ? <LoaderCircle aria-hidden="true" className="is-spinning" /> : <Save aria-hidden="true" />}{saving ? 'Menyimpan…' : 'Simpan perubahan'}</button>
      </div>
    </main>
  )
}
