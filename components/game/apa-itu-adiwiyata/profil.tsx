'use client'

// Profil pemain: nama panggilan, Koin Hijau, streak, janji aktif,
// dan pengaturan suara (slider Musik/Efek + Mute semua).
// Pengaturan suara tersimpan di save kampanye; provider sudah memanggil
// syncSettings otomatis setiap pengaturan berubah.
import { useState } from 'react'
import { Banknote, BookOpen, CalendarCheck, Coins, Flame, Leaf, Store, TreePine, Volume2, VolumeX } from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { GEAR, KOSTUM } from '@/lib/apa-itu-adiwiyata/content/toko'
import { klik } from './suara'

export function Profil({
  onOpenPanduan,
  onOpenToko,
}: {
  /** Buka panduan Cara Bermain (overlay dari runner). */
  onOpenPanduan: () => void
  /** Buka Toko Kantin (bila diisi, tombol toko tampil). */
  onOpenToko?: () => void
}) {
  const { save, dispatch } = useCampaign()
  const [nama, setNama] = useState(save.nickname)
  const [pesan, setPesan] = useState<string | null>(null)
  const [pesanKoleksi, setPesanKoleksi] = useState<string | null>(null)

  const janjiAktif = save.promises.filter((p) => !p.done)
  const inventaris = save.inventaris ?? []
  const gearDimiliki = GEAR.filter((g) => inventaris.includes(g.id))
  const kostumDimiliki = KOSTUM.filter((k) => inventaris.includes(k.id))

  return (
    <div className="aia-stack">
      <div className="aia-stats">
        <span className="aia-stat">
          <Coins aria-hidden="true" /> {save.coins} Koin Hijau
        </span>
        <span className="aia-stat">
          <Flame aria-hidden="true" /> Streak {save.streak.count} hari
        </span>
        {save.streak.multiplierActive && <span className="aia-chip done">Pengali x2 aktif</span>}
      </div>

      <section className="aia-card">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          Kantong &amp; Koleksi
        </h3>
        <div className="aia-stats">
          <span className="aia-stat">
            <Banknote aria-hidden="true" /> Rp{(save.uang ?? 0).toLocaleString('id-ID')}
          </span>
          <span className="aia-stat">
            <Leaf aria-hidden="true" /> {save.koinDaun ?? 0} Koin Daun
          </span>
          <span className="aia-stat">
            <TreePine aria-hidden="true" /> {save.pohonDitanam ?? 0} pohon ditanam
          </span>
        </div>
        <p className="aia-muted" style={{ marginTop: 8 }}>
          Gear yang dimiliki
        </p>
        {gearDimiliki.length === 0 ? (
          <p className="aia-muted">Belum punya gear. Beli di Toko Kantin pakai Koin Daun.</p>
        ) : (
          <div className="aia-stack">
            {gearDimiliki.map((gear) => (
              <p key={gear.id} className="aia-muted" style={{ margin: 0 }}>
                <strong>{gear.nama}</strong> — {gear.efek}
              </p>
            ))}
          </div>
        )}
        <p className="aia-muted" style={{ marginTop: 12 }}>
          Kostum yang dimiliki
        </p>
        {kostumDimiliki.length === 0 ? (
          <p className="aia-muted">Belum punya kostum. Beli di Toko Kantin pakai Koin Daun.</p>
        ) : (
          <div className="aia-stack">
            {kostumDimiliki.map((kostum) => {
              const dipakai = save.kostumDipakai === kostum.id
              return (
                <div
                  key={kostum.id}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}
                >
                  <p className="aia-muted" style={{ margin: 0 }}>
                    <strong>{kostum.nama}</strong>
                    {dipakai && <span className="aia-chip done"> Dipakai</span>}
                  </p>
                  <button
                    type="button"
                    className="aia-btn"
                    style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                    onClick={() => {
                      klik()
                      dispatch({ type: 'PAKAI_KOSTUM', id: dipakai ? null : kostum.id })
                      setPesanKoleksi(dipakai ? 'Kostum dilepas, kembali ke seragam biasa.' : `Kamu memakai ${kostum.nama}.`)
                    }}
                  >
                    {dipakai ? 'Lepas' : 'Pakai'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {onOpenToko && (
          <div className="aia-actions">
            <button
              type="button"
              className="aia-btn"
              style={{ minHeight: 44 }}
              onClick={() => {
                klik()
                onOpenToko()
              }}
            >
              <Store aria-hidden="true" /> Buka Toko Kantin
            </button>
          </div>
        )}
        {pesanKoleksi && (
          <p className="aia-muted" role="status" style={{ marginTop: 8 }}>
            {pesanKoleksi}
          </p>
        )}
      </section>

      <section className="aia-card">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          Nama panggilan
        </h3>
        <label className="aia-label" htmlFor="aia-nama-panggilan">
          Nama yang tampil di leaderboard dan kartu bagikan
        </label>
        <input
          id="aia-nama-panggilan"
          className="aia-input"
          type="text"
          value={nama}
          maxLength={20}
          placeholder="Tulis nama panggilanmu"
          onChange={(e) => setNama(e.target.value)}
        />
        <div className="aia-actions">
          <button
            type="button"
            className="aia-btn aia-btn-primary"
            disabled={nama.trim() === '' || nama.trim() === save.nickname}
            onClick={() => {
              klik()
              dispatch({ type: 'SET_NICKNAME', nickname: nama })
              setPesan('Nama panggilan disimpan.')
            }}
          >
            Simpan nama
          </button>
        </div>
        {pesan && (
          <p className="aia-muted" role="status" style={{ marginTop: 8 }}>
            {pesan}
          </p>
        )}
      </section>

      <section className="aia-card">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          Janji aktif
        </h3>
        {janjiAktif.length === 0 ? (
          <p className="aia-muted">Belum ada janji aktif. Pilih janji di menu Janji Harian.</p>
        ) : (
          <div className="aia-stack">
            {janjiAktif.map((janji) => (
              <p key={janji.id} className="aia-muted" style={{ margin: 0 }}>
                <CalendarCheck aria-hidden="true" style={{ width: 16, height: 16, verticalAlign: -3 }} />{' '}
                {janji.text}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="aia-card">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          Pengaturan suara
        </h3>
        <label className="aia-label" htmlFor="aia-volume-musik">
          Volume musik: {Math.round(save.volumeMusik * 100)}%
        </label>
        <input
          id="aia-volume-musik"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(save.volumeMusik * 100)}
          onChange={(e) => dispatch({ type: 'SET_VOLUME_MUSIK', value: Number(e.target.value) / 100 })}
          style={{ width: '100%', minHeight: 44 }}
        />
        <label className="aia-label" htmlFor="aia-volume-efek" style={{ marginTop: 12 }}>
          Volume efek: {Math.round(save.volumeEfek * 100)}%
        </label>
        <input
          id="aia-volume-efek"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(save.volumeEfek * 100)}
          onChange={(e) => dispatch({ type: 'SET_VOLUME_EFEK', value: Number(e.target.value) / 100 })}
          style={{ width: '100%', minHeight: 44 }}
        />
        <div className="aia-actions">
          <button
            type="button"
            className="aia-btn"
            aria-pressed={save.muted}
            onClick={() => {
              klik()
              dispatch({ type: 'SET_MUTED', muted: !save.muted })
            }}
          >
            {save.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            {save.muted ? 'Suara dimatikan — ketuk untuk menyalakan' : 'Mute semua'}
          </button>
        </div>
        <p className="aia-muted" style={{ marginTop: 8 }}>
          Musik dijeda otomatis saat tab tidak aktif dan lanjut saat kamu kembali.
        </p>
      </section>

      <section className="aia-card">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          Cara Bermain
        </h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Bingung cara mainnya? Panduan ini menjelaskan cara bergerak, bicara dengan NPC, tiap misi, dunia hidup,
          dan cerita bercabang.
        </p>
        <div className="aia-actions">
          <button
            type="button"
            className="aia-btn"
            style={{ minHeight: 44 }}
            onClick={() => {
              klik()
              onOpenPanduan()
            }}
          >
            <BookOpen aria-hidden="true" /> Buka panduan Cara Bermain
          </button>
        </div>
      </section>

      <section className="aia-card">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          Aksesibilitas
        </h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Mode satu-ketukan mengganti gestur seret, putar, dan tahan di semua misi dengan ketukan tombol —
          untuk yang lebih nyaman bermain tanpa menyeret.
        </p>
        <div className="aia-actions">
          <button
            type="button"
            className="aia-btn"
            style={{ minHeight: 44 }}
            aria-pressed={save.modeSatuKetukan}
            onClick={() => {
              klik()
              dispatch({ type: 'SET_MODE_SATU_KETUKAN', value: !save.modeSatuKetukan })
            }}
          >
            {save.modeSatuKetukan ? 'Mode satu-ketukan aktif — ketuk untuk memakai gestur' : 'Aktifkan mode satu-ketukan'}
          </button>
        </div>
      </section>
    </div>
  )
}
