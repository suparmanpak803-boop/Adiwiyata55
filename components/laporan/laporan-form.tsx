'use client'

import { useState } from 'react'
import { readJsonResponse } from '@/lib/api-client'
import { KATEGORI, LOKASI_KELAS, LOKASI_UMUM, MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES, URGENSI } from '@/lib/laporan'
import '@/components/leaderboard/leaderboard.css'
import '@/components/game/game.css'
import './laporan.css'

type Photo = { file: File; preview: string }

async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  if (!blob) return file
  return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
}

export function LaporanForm({ defaultName }: { defaultName: string }) {
  const [kategori, setKategori] = useState('')
  const [lokasi, setLokasi] = useState('')
  const [judul, setJudul] = useState('')
  const [isi, setIsi] = useState('')
  const [urgensi, setUrgensi] = useState('rendah')
  const [anonim, setAnonim] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ id: string; nomorTiket: string } | null>(null)

  const needsLocation = KATEGORI.find((k) => k.id === kategori)?.needsLocation ?? false

  function addFiles(list: FileList | null) {
    if (!list) return
    setError('')
    const next = [...photos]
    for (const file of Array.from(list)) {
      if (next.length >= MAX_PHOTOS) { setError(`Maksimal ${MAX_PHOTOS} foto.`); break }
      if (!PHOTO_TYPES.includes(file.type)) { setError('Format foto harus JPG, PNG, atau WebP.'); continue }
      next.push({ file, preview: URL.createObjectURL(file) })
    }
    setPhotos(next)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!kategori) return setError('Pilih kategori laporan.')
    if (needsLocation && !lokasi) return setError('Pilih kelas atau lokasi.')
    if (judul.trim().length === 0) return setError('Judul wajib diisi.')
    if (isi.trim().length < 20) return setError('Isi laporan minimal 20 karakter.')
    setBusy(true)
    try {
      const paths: string[] = []
      for (const photo of photos) {
        const file = await compress(photo.file)
        if (file.size > MAX_PHOTO_BYTES) throw new Error('Ukuran foto maksimal 3 MB.')
        const data = new FormData()
        data.append('file', file)
        const upload = await fetch('/api/laporan/upload', { method: 'POST', body: data })
        const result = await readJsonResponse<{ pathname: string }>(upload)
        paths.push(result.pathname)
      }
      const response = await fetch('/api/laporan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kategori, lokasi, judul, isi, urgensi, anonim, foto: paths }) })
      const result = await readJsonResponse<{ id: string; nomorTiket: string }>(response)
      setDone(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laporan belum dapat dikirim.')
    } finally {
      setBusy(false)
    }
  }

  if (done) return (
    <main className="leaderboard-page"><section className="game-stage" aria-live="polite">
      <h2>Laporan terkirim</h2><p>Nomor tiket Anda</p><p className="game-big" style={{ fontSize: 28 }}>{done.nomorTiket}</p>
      <div className="game-actions"><a className="game-play" href={`/laporan/${done.id}`}>Lihat status</a><a className="game-ghost" href="/laporan">Semua laporan</a></div>
    </section></main>
  )

  return (
    <main className="leaderboard-page">
      <form className="lap-form" onSubmit={submit} noValidate>
        <a href="/laporan" className="leaderboard-back">← Laporan saya</a>
        <h1>Kirim Laporan</h1>
        <label>Kategori
          <select value={kategori} onChange={(e) => setKategori(e.target.value)} required>
            <option value="">Pilih kategori</option>
            {KATEGORI.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        {(needsLocation || kategori) && (
          <label>Kelas / Lokasi{needsLocation ? '' : ' (opsional)'}
            <select value={lokasi} onChange={(e) => setLokasi(e.target.value)}>
              <option value="">Pilih lokasi</option>
              <optgroup label="Kelas">{LOKASI_KELAS.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
              <optgroup label="Lokasi Umum">{LOKASI_UMUM.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
            </select>
          </label>
        )}
        <label>Judul <small>{judul.length}/80</small>
          <input value={judul} maxLength={80} onChange={(e) => setJudul(e.target.value)} />
        </label>
        <label>Isi laporan <small>{isi.length}/1000 (minimal 20)</small>
          <textarea value={isi} maxLength={1000} rows={6} onChange={(e) => setIsi(e.target.value)} />
        </label>
        <fieldset><legend>Tingkat urgensi</legend>
          <div className="lap-radios">{URGENSI.map((u) => <label key={u.id}><input type="radio" name="urgensi" checked={urgensi === u.id} onChange={() => setUrgensi(u.id)} /> {u.label}</label>)}</div>
        </fieldset>
        <label>Foto bukti (opsional, maksimal 3, JPG/PNG/WebP)
          <input type="file" accept={PHOTO_TYPES.join(',')} multiple disabled={photos.length >= MAX_PHOTOS} onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
        {photos.length > 0 && <div className="lap-photos">{photos.map((p, i) => (
          <div key={p.preview} className="lap-thumb"><img src={p.preview} alt={`Pratinjau foto ${i + 1}`} /><button type="button" className="game-ghost" onClick={() => setPhotos(photos.filter((_, n) => n !== i))}>Hapus</button></div>
        ))}</div>}
        <label className="lap-check"><input type="checkbox" checked={anonim} onChange={(e) => setAnonim(e.target.checked)} /> Kirim sebagai anonim
          <small>{anonim ? 'Nama Anda disembunyikan dari semua tampilan.' : `Dikirim atas nama ${defaultName}.`}</small>
        </label>
        {error && <p role="alert" className="lap-error">{error}</p>}
        <button className="game-play" type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim laporan'}</button>
      </form>
    </main>
  )
}
