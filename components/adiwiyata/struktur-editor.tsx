'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Eye, Leaf, LoaderCircle, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { resetStruktur, saveStruktur } from '@/app/actions/struktur'
import { IKON_TIM, IKON_TIM_LABEL, WARNA_TIM, WARNA_TIM_LABEL } from '@/lib/struktur-petugas-label'
import {
  type IkonTim,
  type Petugas,
  type StrukturPetugas,
  type TimPetugas,
  type WarnaTim,
} from '@/lib/struktur-petugas-data'

type FieldPetugas = 'nama' | 'kelas' | 'jabatan' | 'tugas'

const petugasKosong = (): Petugas => ({ id: '', nama: '', kelas: '', jabatan: '', tugas: '' })

const timKosong = (): TimPetugas => ({
  id: '',
  nama: '',
  ikon: 'daun',
  warna: 'hijau',
  deskripsi: '',
  koordinator: { ...petugasKosong(), jabatan: 'Koordinator' },
  anggota: [],
})

function kunciUnik(item: { id: string }, index: number) {
  return `${item.id || 'baru'}-${index}`
}

// Empat field satu orang: nama, keterangan, jabatan, tugas. Field
// `kelas` dilabeli "Keterangan" karena isinya bisa berupa jabatan
// guru (mis. "Kepala Sekolah", "Guru") atau kelas siswa.
function PetugasFields({
  orang,
  disabled,
  onChange,
}: {
  orang: Petugas
  disabled: boolean
  onChange: (field: FieldPetugas, value: string) => void
}) {
  return (
    <div className="information-field-grid">
      <label className="information-field">
        <span>Nama</span>
        <input maxLength={100} disabled={disabled} value={orang.nama} onChange={(event) => onChange('nama', event.target.value)} placeholder="Nama lengkap" />
      </label>
      <label className="information-field">
        <span>Keterangan</span>
        <input maxLength={100} disabled={disabled} value={orang.kelas} onChange={(event) => onChange('kelas', event.target.value)} placeholder="Kepala Sekolah, Guru, atau kelas" />
      </label>
      <label className="information-field">
        <span>Jabatan</span>
        <input maxLength={100} disabled={disabled} value={orang.jabatan} onChange={(event) => onChange('jabatan', event.target.value)} placeholder="Ketua, Koordinator, Anggota" />
      </label>
      <label className="information-field is-wide">
        <span>Tugas</span>
        <textarea rows={2} maxLength={500} disabled={disabled} value={orang.tugas} onChange={(event) => onChange('tugas', event.target.value)} placeholder="Tugas dan tanggung jawab" />
      </label>
    </div>
  )
}

export function StrukturEditor({ data }: { data: StrukturPetugas }) {
  const router = useRouter()
  const [struktur, setStruktur] = useState<StrukturPetugas>(data)
  const [timTerbuka, setTimTerbuka] = useState<number | null>(data.tim.length > 0 ? 0 : null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Setelah simpan/reset + router.refresh(), data terbaru dari
  // server masuk lewat prop dan menggantikan draf lokal.
  useEffect(() => {
    setStruktur(data)
  }, [data])

  function ubahStruktur(perbarui: (current: StrukturPetugas) => StrukturPetugas) {
    setStruktur((current) => perbarui(current))
    setError('')
    setMessage('')
  }

  function ubahPengurus(index: number, field: FieldPetugas, value: string) {
    ubahStruktur((current) => ({
      ...current,
      pengurusInti: current.pengurusInti.map((orang, i) => (i === index ? { ...orang, [field]: value } : orang)),
    }))
  }

  function pindahPengurus(index: number, arah: -1 | 1) {
    ubahStruktur((current) => {
      const target = index + arah
      if (target < 0 || target >= current.pengurusInti.length) return current
      const pengurusInti = [...current.pengurusInti]
      const [item] = pengurusInti.splice(index, 1)
      pengurusInti.splice(target, 0, item)
      return { ...current, pengurusInti }
    })
  }

  function tambahPengurus() {
    ubahStruktur((current) => ({ ...current, pengurusInti: [...current.pengurusInti, petugasKosong()] }))
  }

  function hapusPengurus(index: number) {
    ubahStruktur((current) => ({ ...current, pengurusInti: current.pengurusInti.filter((_, i) => i !== index) }))
  }

  function ubahTim(index: number, field: 'nama' | 'deskripsi' | 'ikon' | 'warna', value: string) {
    ubahStruktur((current) => ({
      ...current,
      tim: current.tim.map((tim, i) => {
        if (i !== index) return tim
        if (field === 'ikon') return { ...tim, ikon: value as IkonTim }
        if (field === 'warna') return { ...tim, warna: value as WarnaTim }
        return { ...tim, [field]: value }
      }),
    }))
  }

  function pindahTim(index: number, arah: -1 | 1) {
    ubahStruktur((current) => {
      const target = index + arah
      if (target < 0 || target >= current.tim.length) return current
      const tim = [...current.tim]
      const [item] = tim.splice(index, 1)
      tim.splice(target, 0, item)
      return { ...current, tim }
    })
    setTimTerbuka(null)
  }

  function tambahTim() {
    ubahStruktur((current) => ({ ...current, tim: [...current.tim, timKosong()] }))
    setTimTerbuka(struktur.tim.length)
  }

  function hapusTim(index: number) {
    ubahStruktur((current) => ({ ...current, tim: current.tim.filter((_, i) => i !== index) }))
    setTimTerbuka(null)
  }

  function ubahKoordinator(timIndex: number, field: FieldPetugas, value: string) {
    ubahStruktur((current) => ({
      ...current,
      tim: current.tim.map((tim, i) => (i === timIndex ? { ...tim, koordinator: { ...tim.koordinator, [field]: value } } : tim)),
    }))
  }

  function ubahAnggota(timIndex: number, anggotaIndex: number, field: FieldPetugas, value: string) {
    ubahStruktur((current) => ({
      ...current,
      tim: current.tim.map((tim, i) =>
        i === timIndex
          ? { ...tim, anggota: tim.anggota.map((orang, j) => (j === anggotaIndex ? { ...orang, [field]: value } : orang)) }
          : tim,
      ),
    }))
  }

  function tambahAnggota(timIndex: number) {
    ubahStruktur((current) => ({
      ...current,
      tim: current.tim.map((tim, i) => (i === timIndex ? { ...tim, anggota: [...tim.anggota, { ...petugasKosong(), jabatan: 'Anggota' }] } : tim)),
    }))
  }

  function hapusAnggota(timIndex: number, anggotaIndex: number) {
    ubahStruktur((current) => ({
      ...current,
      tim: current.tim.map((tim, i) => (i === timIndex ? { ...tim, anggota: tim.anggota.filter((_, j) => j !== anggotaIndex) } : tim)),
    }))
  }

  async function simpan() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await saveStruktur(struktur)
      if (!result.ok) throw new Error(result.error)
      setMessage('Struktur berhasil disimpan dan tampil di halaman Struktur.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Struktur belum berhasil disimpan. Periksa koneksi, lalu coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function kembalikanKeSk() {
    // Konfirmasi sederhana: ketukan pertama hanya meminta
    // konfirmasi, ketukan kedua menjalankan reset.
    if (!confirmReset) {
      setConfirmReset(true)
      setError('')
      setMessage('Ketuk sekali lagi untuk mengonfirmasi: seluruh perubahan akan dihapus dan struktur kembali ke daftar SK.')
      return
    }
    setResetting(true)
    setError('')
    setMessage('')
    try {
      const result = await resetStruktur()
      if (!result.ok) throw new Error(result.error)
      setConfirmReset(false)
      setMessage('Struktur dikembalikan ke daftar SK.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Struktur belum berhasil dikembalikan. Periksa koneksi, lalu coba lagi.')
    } finally {
      setResetting(false)
    }
  }

  const sibuk = saving || resetting

  return (
    <main className="information-admin-page struktur-admin-page" aria-labelledby="struktur-admin-title">
      <header className="information-admin-heading">
        <Link className="information-back-link" href="/"><ArrowLeft aria-hidden="true" /> Kembali ke portal</Link>
        <span className="information-admin-mark"><Leaf aria-hidden="true" /></span>
        <span className="eyebrow">PENGELOLAAN KONTEN · ADMIN</span>
        <h1 id="struktur-admin-title">Struktur Adiwiyata</h1>
        <p>Atur pengurus inti dan tim kader yang tampil di halaman Struktur.</p>
        <Link className="information-public-link" href="/adiwiyata/struktur" target="_blank" rel="noreferrer"><Eye aria-hidden="true" /> Lihat halaman Struktur</Link>
      </header>

      <div className="information-admin-groups">
        <section className="information-admin-group" aria-labelledby="struktur-pengurus-title">
          <div className="information-group-heading"><span className="information-group-number">01</span><div><h2 id="struktur-pengurus-title">Pengurus Inti</h2><p>Pembina dan pengurus Adiwiyata. Urutan di sini sama dengan urutan tampil di halaman.</p></div></div>
          <div className="information-entry-list">
            {struktur.pengurusInti.map((orang, index) => (
              <article className="information-entry-card" key={kunciUnik(orang, index)}>
                <div className="information-entry-heading">
                  <strong>{index + 1}. {orang.nama || 'Pengurus baru'}</strong>
                  <span className="struktur-admin-card-actions">
                    <button type="button" aria-label={`Pindahkan ${orang.nama || 'pengurus'} ke atas`} disabled={sibuk || index === 0} onClick={() => pindahPengurus(index, -1)}><ArrowUp aria-hidden="true" /></button>
                    <button type="button" aria-label={`Pindahkan ${orang.nama || 'pengurus'} ke bawah`} disabled={sibuk || index === struktur.pengurusInti.length - 1} onClick={() => pindahPengurus(index, 1)}><ArrowDown aria-hidden="true" /></button>
                    <button type="button" className="struktur-admin-hapus" aria-label={`Hapus ${orang.nama || 'pengurus'}`} disabled={sibuk} onClick={() => hapusPengurus(index)}><Trash2 aria-hidden="true" /></button>
                  </span>
                </div>
                <PetugasFields orang={orang} disabled={sibuk} onChange={(field, value) => ubahPengurus(index, field, value)} />
              </article>
            ))}
          </div>
          {struktur.pengurusInti.length === 0 && <p className="struktur-admin-empty">Belum ada pengurus inti. Ketuk Tambah pengurus di bawah untuk menambah.</p>}
          <button className="information-reset-button information-add-button" type="button" disabled={sibuk} onClick={tambahPengurus}><Plus aria-hidden="true" /> Tambah pengurus</button>
        </section>

        <section className="information-admin-group" aria-labelledby="struktur-tim-title">
          <div className="information-group-heading"><span className="information-group-number">02</span><div><h2 id="struktur-tim-title">Tim Kader</h2><p>Setiap tim dipimpin satu koordinator dan dapat memiliki anggota. Ketuk nama tim untuk membuka atau menutup detailnya.</p></div></div>
          <div className="information-entry-list">
            {struktur.tim.map((tim, timIndex) => {
              const terbuka = timTerbuka === timIndex
              return (
                <article className="information-entry-card" key={kunciUnik(tim, timIndex)}>
                  <div className="struktur-admin-tim-header">
                    <button
                      type="button"
                      className="struktur-admin-tim-toggle"
                      aria-expanded={terbuka}
                      aria-controls={`struktur-tim-${timIndex}`}
                      onClick={() => setTimTerbuka(terbuka ? null : timIndex)}
                    >
                      <strong>{timIndex + 1}. {tim.nama || 'Tim baru'}</strong>
                      <span>{1 + tim.anggota.length} orang</span>
                      <ChevronDown aria-hidden="true" className={terbuka ? 'is-terbuka' : ''} />
                    </button>
                    <span className="struktur-admin-card-actions">
                      <button type="button" aria-label={`Pindahkan ${tim.nama || 'tim'} ke atas`} disabled={sibuk || timIndex === 0} onClick={() => pindahTim(timIndex, -1)}><ArrowUp aria-hidden="true" /></button>
                      <button type="button" aria-label={`Pindahkan ${tim.nama || 'tim'} ke bawah`} disabled={sibuk || timIndex === struktur.tim.length - 1} onClick={() => pindahTim(timIndex, 1)}><ArrowDown aria-hidden="true" /></button>
                      <button type="button" className="struktur-admin-hapus" aria-label={`Hapus ${tim.nama || 'tim'}`} disabled={sibuk} onClick={() => hapusTim(timIndex)}><Trash2 aria-hidden="true" /></button>
                    </span>
                  </div>
                  {terbuka && (
                    <div id={`struktur-tim-${timIndex}`} className="struktur-admin-tim-panel">
                      <div className="information-field-grid">
                        <label className="information-field">
                          <span>Nama tim</span>
                          <input maxLength={100} disabled={sibuk} value={tim.nama} onChange={(event) => ubahTim(timIndex, 'nama', event.target.value)} placeholder="Nama tim kader" />
                        </label>
                        <label className="information-field">
                          <span>Deskripsi</span>
                          <input maxLength={300} disabled={sibuk} value={tim.deskripsi} onChange={(event) => ubahTim(timIndex, 'deskripsi', event.target.value)} placeholder="Tugas utama tim" />
                        </label>
                        <label className="information-field">
                          <span>Ikon</span>
                          <select disabled={sibuk} value={tim.ikon} onChange={(event) => ubahTim(timIndex, 'ikon', event.target.value as IkonTim)}>
                            {IKON_TIM.map((ikon) => (
                              <option key={ikon} value={ikon}>{IKON_TIM_LABEL[ikon]}</option>
                            ))}
                          </select>
                        </label>
                        <label className="information-field">
                          <span>Warna</span>
                          <select disabled={sibuk} value={tim.warna} onChange={(event) => ubahTim(timIndex, 'warna', event.target.value as WarnaTim)}>
                            {WARNA_TIM.map((warna) => (
                              <option key={warna} value={warna}>{WARNA_TIM_LABEL[warna]}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <h3 className="struktur-admin-subjudul">Koordinator</h3>
                      <PetugasFields orang={tim.koordinator} disabled={sibuk} onChange={(field, value) => ubahKoordinator(timIndex, field, value)} />
                      <h3 className="struktur-admin-subjudul">Anggota ({tim.anggota.length})</h3>
                      {tim.anggota.map((anggota, anggotaIndex) => (
                        <article className="information-entry-card struktur-admin-anggota" key={kunciUnik(anggota, anggotaIndex)}>
                          <div className="information-entry-heading">
                            <strong>{anggotaIndex + 1}. {anggota.nama || 'Anggota baru'}</strong>
                            <button type="button" aria-label={`Hapus ${anggota.nama || 'anggota'}`} disabled={sibuk} onClick={() => hapusAnggota(timIndex, anggotaIndex)}><Trash2 aria-hidden="true" /></button>
                          </div>
                          <PetugasFields orang={anggota} disabled={sibuk} onChange={(field, value) => ubahAnggota(timIndex, anggotaIndex, field, value)} />
                        </article>
                      ))}
                      <button className="information-reset-button information-add-button" type="button" disabled={sibuk} onClick={() => tambahAnggota(timIndex)}><Plus aria-hidden="true" /> Tambah anggota</button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
          {struktur.tim.length === 0 && <p className="struktur-admin-empty">Belum ada tim kader. Ketuk Tambah tim di bawah untuk menambah.</p>}
          <button className="information-reset-button information-add-button" type="button" disabled={sibuk} onClick={tambahTim}><Plus aria-hidden="true" /> Tambah tim</button>
        </section>
      </div>

      <p className="struktur-admin-note">Perubahan tampil di halaman Struktur setelah disimpan. Halaman tetap hanya bisa dilihat setelah login.</p>
      {(error || message) && <p className={`information-feedback ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>{error || message}</p>}
      <div className="information-admin-actions">
        <button className="information-reset-button" type="button" disabled={sibuk} onClick={() => { void kembalikanKeSk() }}>{resetting ? <LoaderCircle aria-hidden="true" className="is-spinning" /> : <RotateCcw aria-hidden="true" />}{confirmReset ? 'Ketuk lagi untuk mengonfirmasi' : 'Kembalikan ke data SK'}</button>
        <button className="primary-button information-save-button" type="button" disabled={sibuk} onClick={() => { void simpan() }}>{saving ? <LoaderCircle aria-hidden="true" className="is-spinning" /> : <Save aria-hidden="true" />}{saving ? 'Menyimpan…' : 'Simpan perubahan'}</button>
      </div>
    </main>
  )
}
