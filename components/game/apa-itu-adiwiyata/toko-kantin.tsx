'use client'

// Toko Kantin — belanja makanan/minuman (Rp), gear dan kostum (Koin Daun),
// tanam pohon (Koin Daun), plus yang gratis: air keran dan bekal rumah.
// Semua pembelian divalidasi di dalam reducer (BELI / TANAM_POHON /
// PAKAI_BEKAL): dana kurang atau sudah dimiliki berarti tidak terjadi apa-apa.
import { useEffect, useRef, useState } from 'react'
import {
  Apple,
  ArrowLeft,
  Award,
  Banknote,
  Coins,
  CupSoda,
  Droplets,
  Footprints,
  Leaf,
  Sandwich,
  Shirt,
  Sun,
  TreePine,
  UtensilsCrossed,
} from 'lucide-react'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import {
  AIR_KERAN_HAUS,
  BEKAL_LAPAR,
  BEKAL_LAPAR_LUNCH_BOX,
  ECO_SHOP,
  GEAR,
  HARGA_POHON_KOIN_DAUN,
  hargaDiskonDuta,
  KOSTUM,
  MAKANAN,
  MINUMAN,
  SKOR_PANEL_SURYA,
  SKOR_POHON,
  sisaBekal,
} from '@/lib/apa-itu-adiwiyata/content/toko'
import { klik } from './suara'

function formatRp(nilai: number): string {
  return `Rp${nilai.toLocaleString('id-ID')}`
}

/** Tanggal lokal YYYY-MM-DD (sama aturan dengan streak: jangan pakai UTC). */
function hariIniLokal(): string {
  const d = new Date()
  const bulan = String(d.getMonth() + 1).padStart(2, '0')
  const tanggal = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${bulan}-${tanggal}`
}

function Bar({ label, nilai, warna }: { label: string; nilai: number; warna: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span>
        {label} {nilai}
      </span>
      <span
        style={{ display: 'inline-block', width: 56, height: 8, borderRadius: 4, background: '#e0e0e0', overflow: 'hidden' }}
        role="progressbar"
        aria-label={label}
        aria-valuenow={nilai}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ display: 'block', width: `${nilai}%`, height: '100%', background: warna }} />
      </span>
    </span>
  )
}

export function TokoKantin({
  onExit,
  fokusEco = false,
}: {
  /** Kembali ke dunia. */
  onExit: () => void
  /** Bila true (dibuka dari Booth Eco-Shop di Kebun): gulir langsung ke
   * seksi Eco-Shop saat layar terbuka. */
  fokusEco?: boolean
}) {
  const { save, dispatch } = useCampaign()
  const [pesan, setPesan] = useState<string | null>(null)
  const ecoRef = useRef<HTMLElement | null>(null)

  // Dibuka dari Booth Eco-Shop: gulir ke seksi Eco-Shop supaya itemnya
  // langsung terlihat (tanpa mengubah urutan seksi toko).
  useEffect(() => {
    if (fokusEco) ecoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [fokusEco])

  const lapar = save.lapar ?? 100
  const haus = save.haus ?? 100
  const uang = save.uang ?? 0
  const koinDaun = save.koinDaun ?? 0
  const koinHijau = save.coins ?? 0
  const skorAdiwiyata = save.skorAdiwiyata ?? 0
  const inventaris = save.inventaris ?? []
  const punya = (id: string) => inventaris.includes(id)
  const punyaPinDuta = save.pinDuta === true
  /** Harga kantin yang berlaku: diskon Duta 25% bila punya Pin Duta. */
  const hargaKantin = (harga: number) => (punyaPinDuta ? hargaDiskonDuta(harga) : harga)
  const punyaLunchBox = punya('lunch-box')
  const sisa = sisaBekal(save.bekalTanggal, save.bekalDipakai, hariIniLokal(), punyaLunchBox)
  const bekalPulih = punyaLunchBox ? BEKAL_LAPAR_LUNCH_BOX : BEKAL_LAPAR
  /** Item Eco-Shop yang sudah dimiliki (flag save, bukan inventaris). */
  const punyaEco = (id: string) =>
    (id === 'sepatu-eco' && save.sepatuEco === true) ||
    (id === 'pin-duta' && save.pinDuta === true) ||
    (id === 'panel-surya' && save.panelSurya === true)
  /** Ikon tiap item Eco-Shop (lucide, tanpa emoji). */
  const ikonEco = (id: string) =>
    id === 'sepatu-eco' ? <Footprints aria-hidden="true" /> : id === 'pin-duta' ? <Award aria-hidden="true" /> : <Sun aria-hidden="true" />

  const beli = (jenis: 'makanan' | 'minuman' | 'gear' | 'kostum', id: string, teks: string) => {
    klik()
    dispatch({ type: 'BELI', jenis, id })
    setPesan(teks)
  }

  const beliEco = (id: string, nama: string) => {
    klik()
    dispatch({ type: 'BELI_ECO', id })
    setPesan(
      id === 'panel-surya'
        ? `Kamu membeli ${nama}! Panel biru muncul di atap sekolah. Skor Adiwiyata +${SKOR_PANEL_SURYA}.`
        : `Kamu membeli ${nama}!`,
    )
  }

  return (
    <div className="aia-stack">
      <section className="aia-card" aria-label="Toko Kantin">
        <span className="aia-kicker">Kantin Sekolah</span>
        <h2 className="aia-section-title" style={{ marginTop: 0 }}>
          Toko Kantin
        </h2>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Beli makanan dan minuman pakai uang, gear dan kostum pakai Koin Daun, dan item Eco-Shop pakai Koin Hijau.
          Uang, Koin Daun, dan Koin Hijau didapat dari menyelesaikan misi.
          {punyaPinDuta && ' Kamu punya Pin Duta — harga kantin diskon 25%.'}
        </p>
        <div className="aia-progress-row">
          <Bar label="Lapar" nilai={lapar} warna="#e65100" />
          <Bar label="Haus" nilai={haus} warna="#1e88e5" />
        </div>
        <div className="aia-progress-row">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Banknote aria-hidden="true" /> {formatRp(uang)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Leaf aria-hidden="true" /> {koinDaun} Koin Daun
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Coins aria-hidden="true" /> {koinHijau} Koin Hijau
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Award aria-hidden="true" /> Skor Adiwiyata: {skorAdiwiyata}
          </span>
        </div>
        {pesan && (
          <p className="aia-muted" role="status" style={{ marginBottom: 0 }}>
            {pesan}
          </p>
        )}
      </section>

      <section className="aia-card" aria-label="Makanan">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          <UtensilsCrossed aria-hidden="true" /> Makanan
        </h3>
        <div className="aia-stack">
          {MAKANAN.map((item) => {
            const hargaBayar = hargaKantin(item.harga)
            return (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <strong>{item.nama}</strong> — Lapar +{item.lapar}
                  {punyaPinDuta && (
                    <span className="aia-chip done"> Diskon Duta 25%</span>
                  )}
                  <p className="aia-muted" style={{ margin: 0 }}>
                    {item.deskripsi}
                  </p>
                </div>
                <button
                  type="button"
                  className="aia-btn"
                  style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                  disabled={uang < hargaBayar}
                  onClick={() => beli('makanan', item.id, `Kamu makan ${item.nama}. Lapar +${item.lapar}.`)}
                >
                  Beli{' '}
                  {punyaPinDuta ? (
                    <>
                      <s>{formatRp(item.harga)}</s> {formatRp(hargaBayar)}
                    </>
                  ) : (
                    formatRp(item.harga)
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="aia-card" aria-label="Minuman">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          <CupSoda aria-hidden="true" /> Minuman
        </h3>
        <div className="aia-stack">
          {MINUMAN.map((item) => {
            const hargaBayar = hargaKantin(item.harga)
            return (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <strong>{item.nama}</strong> — Haus +{item.haus}
                  {punyaPinDuta && (
                    <span className="aia-chip done"> Diskon Duta 25%</span>
                  )}
                  <p className="aia-muted" style={{ margin: 0 }}>
                    {item.deskripsi}
                  </p>
                </div>
                <button
                  type="button"
                  className="aia-btn"
                  style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                  disabled={uang < hargaBayar}
                  onClick={() => beli('minuman', item.id, `Kamu minum ${item.nama}. Haus +${item.haus}.`)}
                >
                  Beli{' '}
                  {punyaPinDuta ? (
                    <>
                      <s>{formatRp(item.harga)}</s> {formatRp(hargaBayar)}
                    </>
                  ) : (
                    formatRp(item.harga)
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="aia-card" aria-label="Gratis">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          <Apple aria-hidden="true" /> Gratis
        </h3>
        <div className="aia-stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>Air Keran</strong> — Haus +{AIR_KERAN_HAUS}
              <p className="aia-muted" style={{ margin: 0 }}>
                Minum dari keran sekolah. Gratis, tanpa batas.
              </p>
            </div>
            <button
              type="button"
              className="aia-btn"
              style={{ minHeight: 44, whiteSpace: 'nowrap' }}
              onClick={() => {
                klik()
                dispatch({ type: 'PULIHKAN', haus: AIR_KERAN_HAUS })
                setPesan(`Kamu minum air keran. Haus +${AIR_KERAN_HAUS}.`)
              }}
            >
              <Droplets aria-hidden="true" /> Minum
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>Bekal Rumah</strong> — Lapar +{bekalPulih}
              <p className="aia-muted" style={{ margin: 0 }}>
                Bekal dari rumah, gratis {sisa > 0 ? `${sisa}x lagi hari ini` : '— jatah hari ini habis'}
                {punyaLunchBox ? ' (Lunch Box: 2x sehari).' : '.'}
              </p>
            </div>
            <button
              type="button"
              className="aia-btn"
              style={{ minHeight: 44, whiteSpace: 'nowrap' }}
              disabled={sisa <= 0}
              onClick={() => {
                klik()
                dispatch({ type: 'PAKAI_BEKAL' })
                setPesan(`Kamu makan bekal rumah. Lapar +${bekalPulih}.`)
              }}
            >
              Makan bekal
            </button>
          </div>
        </div>
      </section>

      <section className="aia-card" aria-label="Gear">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          Gear — sekali beli, efeknya permanen
        </h3>
        <div className="aia-stack">
          {GEAR.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>{item.nama}</strong> — {item.efek}
                <p className="aia-muted" style={{ margin: 0 }}>
                  {item.deskripsi}
                </p>
              </div>
              {punya(item.id) ? (
                <span className="aia-chip done">Dimiliki</span>
              ) : (
                <button
                  type="button"
                  className="aia-btn"
                  style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                  disabled={koinDaun < item.hargaKoinDaun}
                  onClick={() =>
                    beli('gear', item.id, `Kamu membeli ${item.nama}! ${item.efek}`)
                  }
                >
                  <Leaf aria-hidden="true" /> Beli {item.hargaKoinDaun}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="aia-card" aria-label="Eco-Shop (Koin Hijau)" ref={ecoRef}>
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          <Coins aria-hidden="true" /> Eco-Shop (Koin Hijau) — sekali beli, efeknya permanen
        </h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Bayar pakai Koin Hijau. Bisa juga dibuka dari Booth Eco-Shop di antara bedeng kebun.
        </p>
        <div className="aia-stack">
          {ECO_SHOP.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>{item.nama}</strong> — {item.efek}
                <p className="aia-muted" style={{ margin: 0 }}>
                  {item.deskripsi}
                </p>
              </div>
              {punyaEco(item.id) ? (
                <span className="aia-chip done">Dimiliki</span>
              ) : (
                <button
                  type="button"
                  className="aia-btn"
                  style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                  disabled={koinHijau < item.hargaKoinHijau}
                  onClick={() => beliEco(item.id, item.nama)}
                >
                  {ikonEco(item.id)} Beli {item.hargaKoinHijau} KH
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="aia-card" aria-label="Pohon">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          <TreePine aria-hidden="true" /> Tanam Pohon
        </h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Kamu sudah menanam {save.pohonDitanam ?? 0} pohon. Setiap pohon menaikkan rapor hijau sekolah +5 dan Skor
          Adiwiyata +{SKOR_POHON}.
        </p>
        <div className="aia-actions">
          <button
            type="button"
            className="aia-btn aia-btn-primary"
            style={{ minHeight: 44 }}
            disabled={koinDaun < HARGA_POHON_KOIN_DAUN}
            onClick={() => {
              klik()
              dispatch({ type: 'TANAM_POHON' })
              setPesan(`Kamu menanam 1 pohon di kebun sekolah! Rapor hijau +5, Skor Adiwiyata +${SKOR_POHON}.`)
            }}
          >
            <TreePine aria-hidden="true" /> Tanam 1 pohon — {HARGA_POHON_KOIN_DAUN} Koin Daun
          </button>
        </div>
      </section>

      <section className="aia-card" aria-label="Kostum">
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          <Shirt aria-hidden="true" /> Kostum — mengubah baju tokohmu di dunia
        </h3>
        <div className="aia-stack">
          {KOSTUM.map((item) => {
            const dimiliki = punya(item.id)
            const dipakai = save.kostumDipakai === item.id
            return (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <strong>{item.nama}</strong>
                  {dipakai && <span className="aia-chip done"> Dipakai</span>}
                  <p className="aia-muted" style={{ margin: 0 }}>
                    {item.deskripsi}
                  </p>
                </div>
                {dipakai ? (
                  <button
                    type="button"
                    className="aia-btn"
                    style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                    onClick={() => {
                      klik()
                      dispatch({ type: 'PAKAI_KOSTUM', id: null })
                      setPesan('Kostum dilepas, kembali ke seragam biasa.')
                    }}
                  >
                    Lepas
                  </button>
                ) : dimiliki ? (
                  <button
                    type="button"
                    className="aia-btn"
                    style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                    onClick={() => {
                      klik()
                      dispatch({ type: 'PAKAI_KOSTUM', id: item.id })
                      setPesan(`Kamu memakai ${item.nama}.`)
                    }}
                  >
                    Pakai
                  </button>
                ) : (
                  <button
                    type="button"
                    className="aia-btn"
                    style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                    disabled={koinDaun < item.hargaKoinDaun}
                    onClick={() =>
                      beli('kostum', item.id, `Kamu membeli ${item.nama}! Ketuk "Pakai" untuk memakainya.`)
                    }
                  >
                    <Leaf aria-hidden="true" /> Beli {item.hargaKoinDaun}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div className="aia-actions">
        <button type="button" className="aia-btn aia-btn-ghost" style={{ minHeight: 44 }} onClick={onExit}>
          <ArrowLeft aria-hidden="true" /> Kembali ke dunia
        </button>
      </div>
    </div>
  )
}
