'use client'

// Koleksi spesies Bab 6 — terbuka saat Bab 6 (Biodiversitas) selesai.
// Spesies yang belum terbuka tampil sebagai "???" supaya tetap penasaran.
// R9: kartu koleksi gaya stiker (grid 2 kolom di HP) + progres besar +
// tombol bagikan per kartu yang sudah terbuka.
import { useState } from 'react'
import { Bird, Bug, Flower2, Leaf, Lock, Share2, X } from 'lucide-react'
import { SPESIES } from '@/lib/apa-itu-adiwiyata/content/spesies'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { KartuBagikan } from './kartu-bagikan'
import { klik } from './suara'

const IKON_JENIS = {
  burung: Bird,
  'kupu-kupu': Bug,
  serangga: Bug,
  tanaman: Flower2,
} as const

export function KoleksiSpesies() {
  const { save } = useCampaign()
  const [bagikanId, setBagikanId] = useState<string | null>(null)
  const terbuka = save.species.length
  const spesiesBagikan = SPESIES.find((sp) => sp.id === bagikanId)
  return (
    <section aria-label="Koleksi spesies">
      <h3 className="aia-section-title">Koleksi Spesies</h3>
      <p className="aia-muted">
        <strong style={{ fontSize: 17 }}>
          {terbuka}/{SPESIES.length} spesies
        </strong>
        {terbuka === 0
          ? ' — selesaikan Misi 6 untuk membuka koleksi spesies halaman sekolah.'
          : ' sudah datang ke halaman sekolah.'}
      </p>
      <div className="aia-koleksi-grid">
        {SPESIES.map((sp) => {
          const sudah = save.species.includes(sp.id)
          const Ikon = IKON_JENIS[sp.jenis] ?? Leaf
          return (
            <article
              key={sp.id}
              className="aia-card aia-stiker aia-koleksi-kartu"
              aria-label={`${sudah ? sp.nama : 'Spesies terkunci'}${sudah ? ' (ditemukan)' : ''}`}
            >
              <span className="aia-bab-icon" aria-hidden="true">
                {sudah ? <Ikon /> : <Lock />}
              </span>
              <strong>{sudah ? sp.nama : '???'}</strong>
              <p>
                {sudah
                  ? sp.deskripsi
                  : 'Spesies ini belum datang. Selesaikan Misi 6 untuk mengundangnya.'}
              </p>
              {sudah && (
                <button
                  type="button"
                  className="aia-btn"
                  style={{ minHeight: 44, width: '100%' }}
                  onClick={() => {
                    klik()
                    setBagikanId(sp.id)
                  }}
                >
                  <Share2 aria-hidden="true" /> Bagikan
                </button>
              )}
            </article>
          )
        })}
      </div>
      {spesiesBagikan && (
        <div style={{ marginTop: 12 }}>
          <div className="aia-actions" style={{ marginTop: 0, marginBottom: 12 }}>
            <button
              type="button"
              className="aia-btn aia-btn-ghost"
              style={{ minHeight: 44 }}
              onClick={() => setBagikanId(null)}
            >
              <X aria-hidden="true" /> Tutup kartu bagikan
            </button>
          </div>
          <KartuBagikan
            nickname={save.nickname}
            coins={save.coins}
            kalimat={`Aku menemukan ${spesiesBagikan.nama} di halaman sekolah!`}
          />
        </div>
      )}
    </section>
  )
}
