'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { STRUKTUR_PETUGAS_CONTOH, type Petugas } from '@/lib/struktur-petugas-data'
import {
  CariIcon,
  ChevronBawahIcon,
  DaunIcon,
  MatahariIcon,
  OrangIcon,
  PohonIcon,
  TunasIcon,
  TutupIcon,
  WhatsAppIcon,
  ikonTim,
} from './pohon-icons'

const TEKS_WA = 'Halo, saya mau bertanya tentang Adiwiyata SMAN 55 Jakarta.'

// Huruf awal dari dua kata pertama nama (mis. "Ratna Wijaya, S.Pd" -> "RW").
function inisial(nama: string) {
  const kata = nama
    .replace(/[^A-Za-zÀ-ÿ ]/g, '')
    .split(' ')
    .filter(Boolean)
  return ((kata[0]?.[0] ?? '') + (kata[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Warna avatar berputar dari 5 warna lembut berdasarkan nama.
function indeksWarna(nama: string) {
  let jumlah = 0
  for (const ch of nama) jumlah += ch.charCodeAt(0)
  return jumlah % 5
}

function AvatarPetugas({ orang, ukuran = 'md' }: { orang: Petugas; ukuran?: 'sm' | 'md' | 'lg' }) {
  if (orang.foto) {
    return (
      <img
        className={`pohon-avatar pohon-avatar--${ukuran} pohon-avatar--foto`}
        src={orang.foto}
        alt={`Foto ${orang.nama}`}
        loading="lazy"
      />
    )
  }
  return (
    <span className={`pohon-avatar pohon-avatar--${ukuran} pohon-avatar--warna-${indeksWarna(orang.nama)}`} aria-hidden="true">
      {inisial(orang.nama)}
    </span>
  )
}

function cocok(p: Petugas, kata: string) {
  if (!kata.trim()) return true
  const hay = `${p.nama} ${p.kelas} ${p.jabatan} ${p.tugas}`.toLowerCase()
  return kata
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((bagian) => hay.includes(bagian))
}

export function StrukturPohon() {
  const data = STRUKTUR_PETUGAS_CONTOH
  const [kataKunci, setKataKunci] = useState('')
  const [filterTim, setFilterTim] = useState('Semua')
  const [timTerbuka, setTimTerbuka] = useState<string | null>(null)
  const [dialogOrang, setDialogOrang] = useState<Petugas | null>(null)
  const tombolTutupRef = useRef<HTMLButtonElement | null>(null)

  const totalPetugas = data.pengurusInti.length + data.tim.reduce((jumlah, tim) => jumlah + 1 + tim.anggota.length, 0)

  // Chip tim hanya memfilter tim; pengurus inti tampil bila filter "Semua".
  const pengurusTerlihat = useMemo(
    () => (filterTim === 'Semua' ? data.pengurusInti.filter((orang) => cocok(orang, kataKunci)) : []),
    [data, filterTim, kataKunci],
  )

  const timTerlihat = useMemo(
    () =>
      data.tim
        .filter((tim) => filterTim === 'Semua' || tim.id === filterTim)
        .map((tim) => ({ tim, orang: [tim.koordinator, ...tim.anggota].filter((orang) => cocok(orang, kataKunci)) }))
        .filter(({ orang }) => orang.length > 0),
    [data, filterTim, kataKunci],
  )

  const kosong = pengurusTerlihat.length === 0 && timTerlihat.length === 0

  useEffect(() => {
    if (!dialogOrang) return
    tombolTutupRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialogOrang(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dialogOrang])

  return (
    <div className="pohon">
      <div className="pohon-banner pohon-anim">
        <div className="pohon-banner-teks">
          <span className="pohon-eyebrow">Pohon Adiwiyata</span>
          <p className="pohon-tagline">Batang yang kokoh, cabang yang rindang, daun yang tumbuh bersama.</p>
          <span className="pohon-badge-contoh">Data contoh — nama di halaman ini bersifat contoh</span>
        </div>
        <svg className="pohon-banner-pohon" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <circle cx="90" cy="24" r="13" fill="#f2b705" />
          <circle cx="60" cy="44" r="25" fill="#2f8f5f" />
          <circle cx="36" cy="60" r="19" fill="#236b4d" />
          <circle cx="84" cy="60" r="19" fill="#2f8f5f" />
          <rect x="57" y="76" width="6" height="28" rx="3" fill="#8a5a3b" />
          <path d="M30 110h60" stroke="#8a5a3b" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <dl className="pohon-stat">
          <div>
            <dt>Total petugas</dt>
            <dd>{totalPetugas}</dd>
          </div>
          <div>
            <dt>Tim</dt>
            <dd>{data.tim.length}</dd>
          </div>
          <div>
            <dt>Pengurus inti</dt>
            <dd>{data.pengurusInti.length}</dd>
          </div>
        </dl>
      </div>

      <div className="pohon-cari">
        <label htmlFor="pohon-cari-input">Cari nama petugas</label>
        <div className="pohon-cari-kotak">
          <CariIcon />
          <input
            id="pohon-cari-input"
            type="search"
            value={kataKunci}
            onChange={(event) => setKataKunci(event.target.value)}
            placeholder="Ketik nama, kelas, atau tugas..."
            autoComplete="off"
          />
        </div>
      </div>

      <div className="pohon-chip-row" role="group" aria-label="Filter tim">
        <button
          type="button"
          className={filterTim === 'Semua' ? 'pohon-chip is-active' : 'pohon-chip'}
          aria-pressed={filterTim === 'Semua'}
          onClick={() => setFilterTim('Semua')}
        >
          Semua
        </button>
        {data.tim.map((tim) => (
          <button
            key={tim.id}
            type="button"
            className={filterTim === tim.id ? 'pohon-chip is-active' : 'pohon-chip'}
            aria-pressed={filterTim === tim.id}
            onClick={() => setFilterTim(tim.id)}
          >
            {tim.nama}
          </button>
        ))}
      </div>

      {pengurusTerlihat.length > 0 && (
        <section aria-labelledby="pohon-judul-inti">
          <h2 id="pohon-judul-inti" className="pohon-judul-seksi">
            <TunasIcon /> Batang — Pengurus Inti
          </h2>
          <p className="pohon-intro-seksi">Pembina dan pengurus yang menopang seluruh gerakan Adiwiyata.</p>
          <div className="pohon-grid-inti">
            {pengurusTerlihat.map((orang, index) => (
              <button
                key={orang.id}
                type="button"
                className={`pohon-orang-card pohon-anim${orang.jabatan === 'Pembina' ? ' pohon-orang-card--pembina' : ''}`}
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => setDialogOrang(orang)}
                aria-label={`Lihat detail ${orang.nama}, ${orang.jabatan}`}
              >
                <AvatarPetugas orang={orang} ukuran="md" />
                <span className="pohon-orang-nama">{orang.nama}</span>
                <span className="pohon-orang-kelas">{orang.kelas}</span>
                <span className="pohon-tag-jabatan">{orang.jabatan}</span>
                <span className="pohon-orang-tugas">{orang.tugas}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {timTerlihat.length > 0 && (
        <section aria-labelledby="pohon-judul-tim">
          <h2 id="pohon-judul-tim" className="pohon-judul-seksi">
            <PohonIcon /> Cabang — Tim Adiwiyata
          </h2>
          <p className="pohon-intro-seksi">Ketuk kartu tim untuk melihat koordinator dan anggotanya.</p>
          <div className="pohon-grid-tim">
            {timTerlihat.map(({ tim, orang }, index) => {
              const terbuka = timTerbuka === tim.id
              const koordinator = orang.find((p) => p.id === tim.koordinator.id)
              const anggota = orang.filter((p) => p.id !== tim.koordinator.id)
              const Ikon = ikonTim[tim.ikon]
              const jumlah = 1 + tim.anggota.length
              return (
                <article key={tim.id} className={`pohon-tim pohon-tim--${tim.warna} pohon-anim`} style={{ animationDelay: `${index * 60}ms` }}>
                  <button
                    type="button"
                    className="pohon-tim-kepala"
                    aria-expanded={terbuka}
                    aria-controls={`pohon-tim-panel-${tim.id}`}
                    onClick={() => setTimTerbuka(terbuka ? null : tim.id)}
                  >
                    <span className="pohon-tim-ikon">
                      <Ikon />
                    </span>
                    <span className="pohon-tim-judul">
                      <span className="pohon-tim-nama">{tim.nama}</span>
                      <span className="pohon-tim-deskripsi">{tim.deskripsi}</span>
                      <span className="pohon-tim-jumlah">
                        <OrangIcon /> {jumlah} orang
                      </span>
                    </span>
                    <ChevronBawahIcon className={terbuka ? 'pohon-chevron is-terbuka' : 'pohon-chevron'} />
                  </button>
                  {terbuka && (
                    <div className="pohon-tim-panel" id={`pohon-tim-panel-${tim.id}`}>
                      {koordinator && (
                        <button type="button" className="pohon-koordinator" onClick={() => setDialogOrang(koordinator)}>
                          <AvatarPetugas orang={koordinator} ukuran="md" />
                          <span className="pohon-koordinator-teks">
                            <span className="pohon-label-koordinator">Koordinator</span>
                            <span className="pohon-orang-nama">{koordinator.nama}</span>
                            <span className="pohon-orang-kelas">{koordinator.kelas}</span>
                            <span className="pohon-orang-tugas">{koordinator.tugas}</span>
                          </span>
                        </button>
                      )}
                      {anggota.length > 0 && (
                        <ul className="pohon-anggota-list">
                          {anggota.map((p) => (
                            <li key={p.id}>
                              <button type="button" className="pohon-anggota" onClick={() => setDialogOrang(p)} aria-label={`Lihat detail ${p.nama}, anggota ${tim.nama}`}>
                                <AvatarPetugas orang={p} ukuran="sm" />
                                <span className="pohon-anggota-nama">{p.nama}</span>
                                <span className="pohon-anggota-jabatan">Anggota</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {kosong && (
        <div className="pohon-kosong" role="status">
          <DaunIcon />
          <p>
            <strong>Tidak ada petugas yang cocok.</strong>
          </p>
          <p>Coba kata kunci lain atau pilih tim lain.</p>
        </div>
      )}

      {dialogOrang && (
        <div className="pohon-dialog-lapisan" onClick={() => setDialogOrang(null)}>
          <div
            className="pohon-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pohon-dialog-nama"
            onClick={(event) => event.stopPropagation()}
          >
            <button ref={tombolTutupRef} type="button" className="pohon-dialog-tutup" aria-label="Tutup kartu petugas" onClick={() => setDialogOrang(null)}>
              <TutupIcon />
            </button>
            <AvatarPetugas orang={dialogOrang} ukuran="lg" />
            <h3 id="pohon-dialog-nama">{dialogOrang.nama}</h3>
            <p className="pohon-dialog-kelas">{dialogOrang.kelas}</p>
            <span className="pohon-tag-jabatan">{dialogOrang.jabatan}</span>
            <p className="pohon-dialog-tugas">{dialogOrang.tugas}</p>
            {dialogOrang.whatsapp && (
              <a
                className="pohon-wa"
                href={`https://wa.me/${dialogOrang.whatsapp}?text=${encodeURIComponent(TEKS_WA)}`}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon /> Hubungi via WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      <p className="pohon-catatan-kaki">
        <MatahariIcon /> Halaman ini memakai data contoh. Pengelola web dapat mengganti nama dan jabatan di file data tanpa mengubah tampilan.
      </p>
    </div>
  )
}
