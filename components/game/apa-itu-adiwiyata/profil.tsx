'use client'

// Profil pemain: nama panggilan, Koin Hijau, streak,
// dan pengaturan suara (slider Musik/Efek + Mute semua).
// Pengaturan suara tersimpan di save kampanye; provider sudah memanggil
// syncSettings otomatis setiap pengaturan berubah.
import { useEffect, useState } from 'react'
import { Award, Banknote, BookOpen, Coins, Flame, Footprints, Leaf, Store, Sun, TreePine, Volume2, VolumeX } from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { CHAPTER_ORDER } from '@/lib/apa-itu-adiwiyata/chapters'
import { ECO_SHOP, GEAR, KOSTUM, SKOR_MISI_PERTAMA, SKOR_PANEL_SURYA, SKOR_POHON, teksSisaBuff } from '@/lib/apa-itu-adiwiyata/content/toko'
import { HadiahHarian } from './hadiah-harian'
import { KoleksiSpesies } from './koleksi-spesies'
import { Lencana } from './lencana'
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
  const [pesanKarakter, setPesanKarakter] = useState<string | null>(null)
  const [pesanKoleksi, setPesanKoleksi] = useState<string | null>(null)
  // Hitung ulang tampilan tiap 30 detik supaya "tersisa N mnt" pada buff
  // gear tidak basi selama Profil dibiarkan terbuka.
  const [, setDetik] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setDetik((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const inventaris = save.inventaris ?? []
  const gearDimiliki = GEAR.filter((g) => inventaris.includes(g.id))
  const kostumDimiliki = KOSTUM.filter((k) => inventaris.includes(k.id))
  /** Rincian Skor Adiwiyata (bisa dihitung dari save): pohon ×5, panel +20,
   * misi utama yang sudah selesai pertama kali ×5. */
  const skorPohon = (save.pohonDitanam ?? 0) * SKOR_POHON
  const skorPanel = save.panelSurya ? SKOR_PANEL_SURYA : 0
  const misiUtamaSelesai = CHAPTER_ORDER.filter((id) => save.chapters[id]?.done).length
  const skorMisi = misiUtamaSelesai * SKOR_MISI_PERTAMA
  const ecoDimiliki = ECO_SHOP.filter(
    (e) =>
      (e.id === 'sepatu-eco' && save.sepatuEco) ||
      (e.id === 'pin-duta' && save.pinDuta) ||
      (e.id === 'panel-surya' && save.panelSurya),
  )
  const ikonEco = (id: string) =>
    id === 'sepatu-eco' ? <Footprints aria-hidden="true" style={{ width: 16, height: 16, verticalAlign: -3 }} /> : id === 'pin-duta' ? <Award aria-hidden="true" style={{ width: 16, height: 16, verticalAlign: -3 }} /> : <Sun aria-hidden="true" style={{ width: 16, height: 16, verticalAlign: -3 }} />

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
          Skor Adiwiyata
        </h3>
        <div className="aia-stats">
          <span className="aia-stat">
            <Award aria-hidden="true" /> Skor Adiwiyata: {save.skorAdiwiyata ?? 0}
          </span>
        </div>
        <p className="aia-muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Pohon ditanam: {save.pohonDitanam ?? 0} × {SKOR_POHON} = {skorPohon} · Panel Surya:{' '}
          {save.panelSurya ? `+${SKOR_PANEL_SURYA}` : 'belum dibeli'} · Misi utama selesai pertama kali:{' '}
          {misiUtamaSelesai} × {SKOR_MISI_PERTAMA} = {skorMisi}. Skor naik dari pohon, Panel Surya, dan misi utama
          yang pertama kali selesai — ulangan misi tidak menambah skor.
        </p>
      </section>

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
        {(save.pohonDitanam ?? 0) > 0 && (
          <p className="aia-muted" style={{ marginTop: 8, marginBottom: 0 }}>
            Pohonmu tumbuh di zona Pohon, Taman.
            {(save.pohonDitanam ?? 0) > 8 ? ' Di peta terlihat 8 pohon pertama.' : ''}
          </p>
        )}
        <p className="aia-muted" style={{ marginTop: 8 }}>
          Item Eco-Shop yang dimiliki
        </p>
        {ecoDimiliki.length === 0 ? (
          <p className="aia-muted">Belum punya item Eco-Shop. Beli di Booth Eco-Shop di Kebun pakai Koin Hijau.</p>
        ) : (
          <div className="aia-stack">
            {ecoDimiliki.map((item) => (
              <p key={item.id} className="aia-muted" style={{ margin: 0 }}>
                {ikonEco(item.id)} <strong>{item.nama}</strong> — {item.efek}
                {item.id !== 'panel-surya' && <> (buff {teksSisaBuff(save, item.id)})</>}
              </p>
            ))}
          </div>
        )}
        <p className="aia-muted" style={{ marginTop: 8 }}>
          Gear yang dimiliki
        </p>
        {gearDimiliki.length === 0 ? (
          <p className="aia-muted">Belum punya gear. Beli di Toko Kantin pakai Koin Daun.</p>
        ) : (
          <div className="aia-stack">
            {gearDimiliki.map((gear) => (
              <p key={gear.id} className="aia-muted" style={{ margin: 0 }}>
                <strong>{gear.nama}</strong> — {gear.efek} (buff {teksSisaBuff(save, gear.id)})
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
                  className="aia-toko-item"
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

      <HadiahHarian />

      {/* B-1: galeri Lencana + Koleksi Spesies dulunya kode mati (tidak
          diimpor di mana pun) — kini tersambung di Profil supaya pemain
          yang sudah punya lencana/spesies bisa melihatnya. */}
      <section className="aia-card">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          Lencana
        </h3>
        <Lencana />
      </section>

      <section className="aia-card">
        <KoleksiSpesies />
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
              // C-19: simpan tanpa spasi di ujung (seperti gerbang-nama).
              dispatch({ type: 'SET_NICKNAME', nickname: nama.trim() })
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
          Ganti Karakter
        </h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Karakter yang kamu mainkan di dunia sekolah. Bisa diganti kapan saja, tanpa kehilangan progres.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
          {(
            [
              { id: 'siswa' as const, nama: 'Siswa', deskripsi: 'Celana panjang abu-abu.' },
              { id: 'siswi' as const, nama: 'Siswi', deskripsi: 'Rok abu-abu, rambut lebih panjang.' },
            ] as const
          ).map((pilihan) => {
            const dipakai = (save.jenisKelamin ?? 'siswa') === pilihan.id
            return (
              <button
                key={pilihan.id}
                type="button"
                className="aia-btn"
                aria-pressed={dipakai}
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4,
                  minHeight: 44,
                  textAlign: 'left',
                  borderWidth: 2,
                  borderColor: dipakai ? 'var(--aia-leaf)' : undefined,
                  background: dipakai ? 'color-mix(in srgb, var(--aia-leaf) 10%, transparent)' : undefined,
                }}
                onClick={() => {
                  klik()
                  dispatch({ type: 'PILIH_KARAKTER', jenisKelamin: pilihan.id })
                  setPesanKarakter(`Karakter diganti jadi ${pilihan.nama}.`)
                }}
              >
                <strong>
                  {pilihan.nama}
                  {dipakai && <span className="aia-chip done"> Dipakai</span>}
                </strong>
                <span className="aia-muted" style={{ fontWeight: 400 }}>
                  {pilihan.deskripsi}
                </span>
              </button>
            )
          })}
        </div>
        {pesanKarakter && (
          <p className="aia-muted" role="status" style={{ marginTop: 8 }}>
            {pesanKarakter}
          </p>
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
