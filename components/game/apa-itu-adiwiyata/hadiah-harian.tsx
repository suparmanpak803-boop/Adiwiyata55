'use client'

// Kartu "Hadiah Harian" — trek siklus 7 hari, klaim 1x sehari.
// Dipakai di Layar Awal (bila belum diklaim hari ini, dengan tombol Lewati)
// dan di Profil. Klaim bersifat opsional dan tidak pernah menghalangi masuk
// game. Satu aksi KLAIM_HADIAH_HARIAN yang atomik: klaim ganda di hari yang
// sama tidak memberi apa pun.

import { useState } from 'react'
import { Banknote, Check, Coins, Gift, Leaf, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { HADIAH_HARIAN, hadiahBerikutnya, hariIniLokal, teksHadiah, type HadiahHarian } from '@/lib/apa-itu-adiwiyata/content/hadiah-harian'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { klik, koin } from './suara'
import { RayakanMisi } from './rayakan-misi'

function ikonHadiah(hadiah: HadiahHarian): LucideIcon {
  if (hadiah.hari === 7) return Gift
  if (hadiah.pulihkan) return UtensilsCrossed
  if (hadiah.koinDaun) return Leaf
  if (hadiah.uang) return Banknote
  return Coins
}

export function HadiahHarian({
  onLewati,
  onKlaim,
}: {
  /** Bila diisi, tombol "Lewati" tampil (dipakai Layar Awal). */
  onLewati?: () => void
  /** Dipanggil setelah klaim berhasil (dipakai Layar Awal supaya kartu tetap
   * menampilkan hasil klaim sampai pemain melanjutkan). */
  onKlaim?: () => void
}) {
  const { save, dispatch } = useCampaign()
  const [pesan, setPesan] = useState<string | null>(null)
  const hariIni = hariIniLokal()
  const { siklus, bisaKlaim } = hadiahBerikutnya(save.hadiahTerakhir ?? null, save.hadiahSiklus ?? 1, hariIni)
  const hadiahHariIni = HADIAH_HARIAN[siklus - 1]
  // Hari yang sudah diklaim dalam siklus ini: bila hari ini bisa diklaim,
  // hari 1..siklus-1 sudah lewat; bila sudah diklaim hari ini, hari
  // 1..siklus sudah lewat (termasuk hari ini). Bila siklus kembali ke 1
  // karena sehari terlewat, tidak ada hari yang bertanda centang.
  const sudahDiklaim = (hari: number) => (bisaKlaim ? hari < siklus : hari <= siklus)

  const klaim = () => {
    if (!bisaKlaim || !hadiahHariIni) return
    const teks = teksHadiah(hadiahHariIni)
    dispatch({ type: 'KLAIM_HADIAH_HARIAN', hariIni })
    koin()
    setPesan(`Kamu mendapat ${teks}!`)
    onKlaim?.()
  }

  return (
    <section className="aia-card" aria-label="Hadiah Harian" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Tier besar (F1): ledakan kecil saat hadiah berhasil diklaim. */}
      {pesan && <RayakanMisi />}
      <span className="aia-kicker">Hadiah Harian</span>
      <h3 className="aia-section-title" style={{ marginTop: 0 }}>
        Hadiah Harian
      </h3>
      <p className="aia-muted" style={{ marginTop: 0 }}>
        Kembali setiap hari dan klaim hadiahmu. Hari ini: Hari {siklus} — {hadiahHariIni?.label ?? ''}.
      </p>
      <div
        className="aia-hadiah-grid"
        role="list"
        aria-label="Trek hadiah 7 hari"
      >
        {HADIAH_HARIAN.map((hadiah) => {
          const Ikon = ikonHadiah(hadiah)
          const diklaim = sudahDiklaim(hadiah.hari)
          const hariIniKotak = bisaKlaim && hadiah.hari === siklus
          return (
            <div
              key={hadiah.hari}
              role="listitem"
              aria-label={`Hari ${hadiah.hari}: ${hadiah.label}${diklaim ? ' (sudah diklaim)' : ''}${hariIniKotak ? ' (hari ini)' : ''}`}
              style={{
                // B-4: latar + border dari variabel tema, bukan warna hardcode —
                // di mode gelap teks terang di atas '#e6f4ea' kontrasnya ~1:1.
                // var(--sage)/var(--muted) + var(--foreground) aman di terang
                // maupun gelap (≥4,5:1).
                border: `2px solid ${hariIniKotak ? 'var(--green)' : 'var(--line)'}`,
                borderRadius: 10,
                padding: '8px 2px',
                textAlign: 'center',
                background: diklaim ? 'var(--sage)' : hariIniKotak ? 'var(--muted)' : 'transparent',
                opacity: diklaim ? 0.85 : 1,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>Hari {hadiah.hari}</div>
              {diklaim ? (
                <Check aria-hidden="true" style={{ width: 20, height: 20, marginTop: 4, color: 'var(--green)' }} />
              ) : (
                <Ikon aria-hidden="true" style={{ width: 20, height: 20, marginTop: 4 }} />
              )}
              {/* C-4: label hadiah disembunyikan di ≤480px (CSS) supaya sel
                  4 kolom tidak membungkus 3–4 baris; info lengkap tetap ada
                  di aria-label sel dan di teks "Hari ini" di atas. */}
              <div className="aia-hadiah-label" style={{ fontSize: 10, lineHeight: 1.3, marginTop: 4 }}>{hadiah.label}</div>
            </div>
          )
        })}
      </div>
      {pesan && (
        <p className="aia-muted" role="status" style={{ marginTop: 0 }}>
          {pesan}
        </p>
      )}
      <div className="aia-actions">
        <button
          type="button"
          className="aia-btn aia-btn-primary"
          style={{ minHeight: 44 }}
          disabled={!bisaKlaim}
          onClick={() => {
            klik()
            klaim()
          }}
        >
          {bisaKlaim ? `Klaim hadiah Hari ${siklus}` : 'Sudah diklaim — kembali besok'}
        </button>
        {onLewati && (
          <button
            type="button"
            className="aia-btn aia-btn-ghost"
            style={{ minHeight: 44 }}
            onClick={() => {
              klik()
              onLewati()
            }}
          >
            Lewati
          </button>
        )}
      </div>
      <p className="aia-muted" style={{ marginBottom: 0 }}>
        Klaim 1x sehari. Terlewat sehari? Siklus mengulang dari Hari 1 — tidak ada yang hilang.
      </p>
    </section>
  )
}
