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
  buffAktif,
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
  teksSisaBuff,
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
        style={{ display: 'inline-block', width: 56, height: 8, borderRadius: 4, background: 'var(--muted)', overflow: 'hidden' }}
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
  // Hitung ulang tampilan tiap 30 detik supaya "tersisa N mnt" pada buff
  // gear tidak basi selama toko dibiarkan terbuka.
  const [, setDetik] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setDetik((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

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
  /** Pin Duta memberi diskon hanya bila buff 10 menitnya masih aktif
   * (sama syaratnya dengan reducer BELI, supaya tampil = tagih). */
  const punyaPinDuta = save.pinDuta === true && buffAktif(save, 'pin-duta')
  /** Buff Pin Duta habis tapi pin sudah pernah dibeli (info di intro). */
  const pinDutaKedaluwarsa = save.pinDuta === true && !punyaPinDuta
  /** Lemas (lapar atau haus 0): diskon Duta tidak berlaku — kelemahan lunak
   * karena mencapai 0; jalan keluar darurat (air keran + bekal) tetap ada. */
  const lemas = lapar <= 0 || haus <= 0
  /** Harga kantin yang berlaku: diskon Duta 25% bila buff Pin Duta aktif
   * dan tidak lemas; saat lemas harga penuh. */
  const hargaKantin = (harga: number) => (punyaPinDuta && !lemas ? hargaDiskonDuta(harga) : harga)
  /** Lunch Box memberi jatah bekal 2x hanya bila buff-nya masih aktif. */
  const punyaLunchBox = punya('lunch-box') && buffAktif(save, 'lunch-box')
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

  // F14: guard klik ganda — tombol menjadi disabled / item menjadi
  // "Dimiliki" hanya sesudah re-render, jadi klik kedua yang mendarat
  // sebelum itu menjalankan dispatch kedua. Reducer menolaknya (dana
  // kurang / sudah dimiliki -> return save tanpa perubahan), tapi pesan
  // sukses tetap tampil bila tidak dijaga. Guard ini mencatat pembelian
  // terakhir beserta referensi save saat itu: klik ulang dengan kunci
  // yang sama dan save yang sama (belum re-render) ditolak; sesudah
  // re-render save berupa objek baru sehingga pembelian sah berikutnya
  // tetap bisa jalan. Reducer mengembalikan referensi save yang sama
  // bila menolak, jadi guard tidak pernah "macet" pada pembelian sah —
  // pembelian yang ditolak pun akan ditolak lagi selama save tak berubah.
  const pembelianTerakhirRef = useRef<{ kunci: string; save: typeof save } | null>(null)
  const pembelianBaru = (kunci: string): boolean => {
    const terakhir = pembelianTerakhirRef.current
    if (terakhir !== null && terakhir.kunci === kunci && terakhir.save === save) return false
    pembelianTerakhirRef.current = { kunci, save }
    return true
  }

  /** Validasi yang sama dengan reducer BELI di context.tsx (dana dan
   * status dimiliki, dari save render ini). Mengembalikan pesan gagal
   * bila pembelian akan ditolak reducer, atau null bila diterima. */
  const alasanGagalBeli = (jenis: 'makanan' | 'minuman' | 'gear' | 'kostum', id: string): string | null => {
    if (jenis === 'makanan') {
      const item = MAKANAN.find((m) => m.id === id)
      if (!item) return 'Item tidak ditemukan.'
      return uang < hargaKantin(item.harga) ? 'Uang tidak cukup untuk membeli ini.' : null
    }
    if (jenis === 'minuman') {
      const item = MINUMAN.find((m) => m.id === id)
      if (!item) return 'Item tidak ditemukan.'
      return uang < hargaKantin(item.harga) ? 'Uang tidak cukup untuk membeli ini.' : null
    }
    if (jenis === 'gear') {
      const item = GEAR.find((g) => g.id === id)
      if (!item) return 'Item tidak ditemukan.'
      // Gear bisa dibeli ulang (memperpanjang buff 10 menit), jadi
      // "sudah dimiliki" bukan penolakan — hanya dana yang diperiksa.
      return koinDaun < item.hargaKoinDaun ? 'Koin Daun tidak cukup untuk membeli ini.' : null
    }
    const item = KOSTUM.find((k) => k.id === id)
    if (!item) return 'Item tidak ditemukan.'
    if (punya(item.id)) return 'Kamu sudah memiliki item ini.'
    return koinDaun < item.hargaKoinDaun ? 'Koin Daun tidak cukup untuk membeli ini.' : null
  }

  /** Validasi yang sama dengan reducer BELI_ECO di context.tsx.
   * Sepatu Eco-Runner dan Pin Duta bisa dibeli ulang (memperpanjang buff);
   * Panel Surya tetap sekali beli. */
  const alasanGagalEco = (id: string): string | null => {
    const item = ECO_SHOP.find((e) => e.id === id)
    if (!item) return 'Item tidak ditemukan.'
    if (id === 'panel-surya' && punyaEco(id)) return 'Kamu sudah memiliki item ini.'
    return koinHijau < item.hargaKoinHijau ? 'Koin Hijau tidak cukup untuk membeli ini.' : null
  }

  const beli = (jenis: 'makanan' | 'minuman' | 'gear' | 'kostum', id: string, teks: string) => {
    klik()
    if (!pembelianBaru(`BELI:${jenis}:${id}`)) return
    const gagal = alasanGagalBeli(jenis, id)
    if (gagal) {
      setPesan(gagal)
      return
    }
    dispatch({ type: 'BELI', jenis, id })
    setPesan(teks)
  }

  const beliEco = (id: string, nama: string) => {
    klik()
    if (!pembelianBaru(`BELI_ECO:${id}`)) return
    const gagal = alasanGagalEco(id)
    if (gagal) {
      setPesan(gagal)
      return
    }
    dispatch({ type: 'BELI_ECO', id })
    setPesan(
      id === 'panel-surya'
        ? `Kamu membeli ${nama}! Panel biru muncul di atap sekolah. Skor Adiwiyata +${SKOR_PANEL_SURYA}.`
        : `Kamu membeli ${nama}! Efeknya aktif 10 menit sejak sekarang.`,
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
          {punyaPinDuta && !lemas && ' Kamu punya Pin Duta — harga kantin diskon 25%.'}
          {punyaPinDuta && lemas && ' Kamu lemas — diskon Duta tidak berlaku sampai lapar dan hausmu pulih.'}
          {pinDutaKedaluwarsa && ' Pin Dutamu sudah kedaluwarsa — beli lagi di Eco-Shop supaya diskon 25% aktif 10 menit.'}
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
              <div key={item.id} className="aia-toko-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <strong>{item.nama}</strong> — Lapar +{item.lapar}
                  {punyaPinDuta && !lemas && (
                    <span className="aia-chip done"> Diskon Duta 25%</span>
                  )}
                  {punyaPinDuta && lemas && (
                    <span className="aia-chip"> Diskon Duta tidak berlaku saat lemas</span>
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
                  {punyaPinDuta && !lemas ? (
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
              <div key={item.id} className="aia-toko-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <strong>{item.nama}</strong> — Haus +{item.haus}
                  {punyaPinDuta && !lemas && (
                    <span className="aia-chip done"> Diskon Duta 25%</span>
                  )}
                  {punyaPinDuta && lemas && (
                    <span className="aia-chip"> Diskon Duta tidak berlaku saat lemas</span>
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
                  {punyaPinDuta && !lemas ? (
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
          <div className="aia-toko-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
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
          <div className="aia-toko-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>Bekal Rumah</strong> — Lapar +{bekalPulih}
              <p className="aia-muted" style={{ margin: 0 }}>
                Bekal dari rumah, gratis {sisa > 0 ? `${sisa}x lagi hari ini` : '— jatah hari ini habis'}
                {punyaLunchBox
                  ? ' (Lunch Box: 2x sehari).'
                  : punya('lunch-box')
                    ? ' (Lunch Box kedaluwarsa — beli lagi untuk 2x sehari).'
                    : '.'}
              </p>
            </div>
            <button
              type="button"
              className="aia-btn"
              style={{ minHeight: 44, whiteSpace: 'nowrap' }}
              disabled={sisa <= 0}
              onClick={() => {
                klik()
                if (!pembelianBaru('PAKAI_BEKAL')) return
                if (sisa <= 0) {
                  setPesan('Jatah bekal hari ini sudah habis.')
                  return
                }
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
          Gear — efeknya 10 menit sejak dibeli, beli lagi untuk memperpanjang
        </h3>
        <div className="aia-stack">
          {GEAR.map((item) => {
            const dimiliki = punya(item.id)
            return (
            <div key={item.id} className="aia-toko-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>{item.nama}</strong> — {item.efek}
                {dimiliki && (
                  <span className="aia-chip done"> Dimiliki — buff {teksSisaBuff(save, item.id)}</span>
                )}
                <p className="aia-muted" style={{ margin: 0 }}>
                  {item.deskripsi}
                </p>
              </div>
              {dimiliki ? (
                <button
                  type="button"
                  className="aia-btn"
                  style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                  disabled={koinDaun < item.hargaKoinDaun}
                  onClick={() =>
                    beli('gear', item.id, `Kamu membeli ${item.nama} lagi! Efeknya aktif 10 menit sejak sekarang.`)
                  }
                >
                  <Leaf aria-hidden="true" /> Beli lagi {item.hargaKoinDaun}
                </button>
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
            )
          })}
        </div>
      </section>

      <section className="aia-card" aria-label="Eco-Shop (Koin Hijau)" ref={ecoRef}>
        <h3 className="aia-section-title" style={{ marginTop: 0 }}>
          <Coins aria-hidden="true" /> Eco-Shop (Koin Hijau) — Sepatu &amp; Pin berlaku 10 menit sejak dibeli, Panel Surya sekali beli
        </h3>
        <p className="aia-muted" style={{ marginTop: 0 }}>
          Bayar pakai Koin Hijau. Bisa juga dibuka dari Booth Eco-Shop di antara bedeng kebun.
        </p>
        <div className="aia-stack">
          {ECO_SHOP.map((item) => {
            const dimiliki = punyaEco(item.id)
            const bisaBeliLagi = item.id === 'sepatu-eco' || item.id === 'pin-duta'
            return (
            <div key={item.id} className="aia-toko-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>{item.nama}</strong> — {item.efek}
                {dimiliki && bisaBeliLagi && (
                  <span className="aia-chip done"> Dimiliki — buff {teksSisaBuff(save, item.id)}</span>
                )}
                <p className="aia-muted" style={{ margin: 0 }}>
                  {item.deskripsi}
                </p>
              </div>
              {dimiliki ? (
                bisaBeliLagi ? (
                  <button
                    type="button"
                    className="aia-btn"
                    style={{ minHeight: 44, whiteSpace: 'nowrap' }}
                    disabled={koinHijau < item.hargaKoinHijau}
                    onClick={() => beliEco(item.id, item.nama)}
                  >
                    {ikonEco(item.id)} Beli lagi {item.hargaKoinHijau} KH
                  </button>
                ) : (
                  <span className="aia-chip done">Dimiliki</span>
                )
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
            )
          })}
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
              if (!pembelianBaru('TANAM_POHON')) return
              if (koinDaun < HARGA_POHON_KOIN_DAUN) {
                setPesan('Koin Daun tidak cukup untuk menanam pohon.')
                return
              }
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
              <div key={item.id} className="aia-toko-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
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
