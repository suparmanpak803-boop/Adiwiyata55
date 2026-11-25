'use client'

// Kartu hasil yang bisa dibagikan: digambar ke canvas (hanya teks dan
// bentuk, tanpa gambar eksternal) lalu diunduh sebagai PNG atau dibagikan
// lewat navigator.share. Bekerja di HP Android; kegagalan ditangani
// dengan pesan ramah, tidak pernah throw.
import { useRef, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { klik } from './suara'

const LEBAR = 900
const TINGGI = 900

function bungkusTeks(ctx: CanvasRenderingContext2D, teks: string, maxLebar: number): string[] {
  const kata = teks.split(/\s+/)
  const baris: string[] = []
  let jalan = ''
  for (const k of kata) {
    const coba = jalan ? `${jalan} ${k}` : k
    if (ctx.measureText(coba).width > maxLebar && jalan) {
      baris.push(jalan)
      jalan = k
    } else {
      jalan = coba
    }
  }
  if (jalan) baris.push(jalan)
  return baris
}

function gambarKartu(nickname: string, coins: number, kalimat: string): HTMLCanvasElement | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = LEBAR
    canvas.height = TINGGI
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Latar hijau + hiasan lingkaran.
    ctx.fillStyle = '#236b4d'
    ctx.fillRect(0, 0, LEBAR, TINGGI)
    ctx.fillStyle = '#2f7d4f'
    ctx.beginPath()
    ctx.arc(820, 90, 180, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1d5c3d'
    ctx.beginPath()
    ctx.arc(80, 830, 200, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f7f8f3'
    ctx.textAlign = 'center'
    ctx.font = '700 44px Arial, sans-serif'
    ctx.fillText('ADIWIYATA 55', LEBAR / 2, 120)
    ctx.font = '400 30px Arial, sans-serif'
    ctx.fillStyle = '#cfe8d4'
    ctx.fillText('Sekolah Adiwiyata Mandiri', LEBAR / 2, 168)

    ctx.fillStyle = '#f7f8f3'
    ctx.font = '700 84px Arial, sans-serif'
    ctx.fillText(nickname || 'Kamu', LEBAR / 2, 330)

    ctx.fillStyle = '#ffd94d'
    ctx.font = '700 120px Arial, sans-serif'
    ctx.fillText(String(coins), LEBAR / 2, 480)
    ctx.fillStyle = '#f7f8f3'
    ctx.font = '700 36px Arial, sans-serif'
    ctx.fillText('Koin Hijau', LEBAR / 2, 530)

    ctx.font = '400 38px Arial, sans-serif'
    ctx.fillStyle = '#eaf5ec'
    const baris = bungkusTeks(ctx, `“${kalimat}”`, LEBAR - 160)
    baris.forEach((b, i) => {
      ctx.fillText(b, LEBAR / 2, 640 + i * 52)
    })

    ctx.font = '400 26px Arial, sans-serif'
    ctx.fillStyle = '#cfe8d4'
    ctx.fillText('Tidak ada yang benar-benar sampah.', LEBAR / 2, 820)
    return canvas
  } catch {
    return null
  }
}

export function KartuBagikan({
  nickname,
  coins,
  kalimat,
}: {
  nickname: string
  coins: number
  kalimat: string
}) {
  const pratinjauRef = useRef<HTMLDivElement | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const unduh = async () => {
    klik()
    setSibuk(true)
    setPesan(null)
    try {
      const canvas = gambarKartu(nickname, coins, kalimat)
      if (!canvas) {
        setPesan('Maaf, kartu belum bisa dibuat di perangkat ini. Coba lagi nanti.')
        return
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) {
        setPesan('Maaf, gambar kartu gagal dibuat. Coba lagi nanti.')
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'kartu-adiwiyata.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setPesan('Kartu berhasil diunduh sebagai gambar.')
    } catch {
      setPesan('Maaf, kartu belum bisa diunduh. Coba lagi nanti.')
    } finally {
      setSibuk(false)
    }
  }

  const bagikan = async () => {
    klik()
    setSibuk(true)
    setPesan(null)
    try {
      const canvas = gambarKartu(nickname, coins, kalimat)
      if (!canvas) {
        setPesan('Maaf, kartu belum bisa dibuat di perangkat ini. Coba lagi nanti.')
        return
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) {
        setPesan('Maaf, gambar kartu gagal dibuat. Coba lagi nanti.')
        return
      }
      const file = new File([blob], 'kartu-adiwiyata.png', { type: 'image/png' })
      const bisaBagikanFile =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      if (bisaBagikanFile) {
        await navigator.share({
          files: [file],
          title: 'Adiwiyata 55',
          text: kalimat,
        })
        setPesan('Kartu dibagikan. Terima kasih sudah menyebarkan semangat Adiwiyata!')
      } else if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Adiwiyata 55', text: `${nickname}: ${kalimat}` })
        setPesan('Teks dibagikan. Gambar kartu bisa diunduh dulu bila ingin dikirim sebagai gambar.')
      } else {
        await unduh()
      }
    } catch (error) {
      // Pengguna membatalkan berbagi: bukan kesalahan, diam saja.
      if (error instanceof DOMException && error.name === 'AbortError') return
      setPesan('Maaf, berbagi belum bisa di perangkat ini. Coba unduh gambarnya saja.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="aia-stack">
      <div
        ref={pratinjauRef}
        style={{
          padding: 24,
          borderRadius: 20,
          background: '#236b4d',
          color: '#f7f8f3',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em' }}>
          ADIWIYATA 55
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#cfe8d4' }}>Sekolah Adiwiyata Mandiri</p>
        <p style={{ margin: '18px 0 0', fontSize: 28, fontWeight: 800 }}>{nickname || 'Kamu'}</p>
        <p style={{ margin: '8px 0 0', fontSize: 40, fontWeight: 800, color: '#ffd94d' }}>{coins}</p>
        <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700 }}>Koin Hijau</p>
        <p style={{ margin: '18px 0 0', fontSize: 15, lineHeight: 1.6 }}>“{kalimat}”</p>
        <p style={{ margin: '16px 0 0', fontSize: 12, color: '#cfe8d4' }}>
          Tidak ada yang benar-benar sampah.
        </p>
      </div>

      {pesan && (
        <p className="aia-card" role="status">
          {pesan}
        </p>
      )}

      <div className="aia-actions">
        <button type="button" className="aia-btn aia-btn-primary" disabled={sibuk} onClick={unduh}>
          <Download aria-hidden="true" /> Unduh gambar
        </button>
        <button type="button" className="aia-btn aia-btn-aksi" disabled={sibuk} onClick={bagikan}>
          <Share2 aria-hidden="true" /> Bagikan
        </button>
      </div>
    </div>
  )
}
