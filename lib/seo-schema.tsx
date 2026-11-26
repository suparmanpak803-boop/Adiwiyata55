// JSON-LD (schema.org) bersama untuk halaman publik Adiwiyata.
// Semua URL absolut ke https://www.adiwiyata55jkt.my.id; tanpa placeholder,
// tanpa tipe yang sudah pensiun (HowTo, FAQPage, dsb.).
// Komponen JsonLd adalah Server Component: script dirender di server (SSR),
// bukan client-only.
import type { EducationVideo } from '@/lib/education-videos'

export const SITE_URL = 'https://www.adiwiyata55jkt.my.id'
export const SITE_LOGO_URL = `${SITE_URL}/adiwiyata-logo.png`
export const ORG_NAME = 'Adiwiyata SMAN 55 Jakarta'
export const AUTHOR_NAME = 'Tim Adiwiyata SMAN 55 Jakarta'

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export type BreadcrumbCrumb = { name: string; item: string }

export function breadcrumbJsonLd(crumbs: BreadcrumbCrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  }
}

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
}

// Ubah tanggal teks bebas (mis. "12 November 2026" atau "November 2026")
// menjadi ISO 8601. "November 2026" tidak punya tanggal pasti, jadi
// dikembalikan sebagai "2026-11" (format YYYY-MM yang sah di ISO 8601),
// bukan ditebak jadi tanggal 1. null bila tidak bisa dipahami.
export function parseIndonesianDate(text: string): string | null {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(cleaned)) return cleaned
  const full = cleaned.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/)
  if (full) {
    const month = INDONESIAN_MONTHS[full[2].toLowerCase()]
    if (!month) return null
    const day = Number(full[1])
    if (day < 1 || day > 31) return null
    const iso = `${full[3]}-${month}-${String(day).padStart(2, '0')}`
    return Number.isNaN(Date.parse(iso)) ? null : iso
  }
  const monthYear = cleaned.match(/^([A-Za-z]+) (\d{4})$/)
  if (monthYear) {
    const month = INDONESIAN_MONTHS[monthYear[1].toLowerCase()]
    return month ? `${monthYear[2]}-${month}` : null
  }
  return null
}

// "3:45" -> "PT3M45S", "1:02:30" -> "PT1H2M30S". null bila format lain.
export function toIsoDuration(text: string): string | null {
  const parts = text.trim().split(':').map((part) => Number(part))
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null
  if (parts.length === 2) return `PT${parts[0]}M${parts[1]}S`
  if (parts.length === 3) return `PT${parts[0]}H${parts[1]}M${parts[2]}S`
  return null
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

// VideoObject untuk satu video edukasi YouTube. Thumbnail memakai pola
// i.ytimg.com yang sama dengan yang dipakai komponen halaman; embedUrl
// menunjuk pemutar YouTube. uploadDate hanya diisi bila publishedAt dari
// DB ada (kolom date -> teks YYYY-MM-DD); bila kosong, field dilepas agar
// tidak mengarang tanggal. null bila videoId tidak valid (tanpa ID,
// thumbnail/embed tidak bisa diturunkan).
export function videoObjectJsonLd(video: EducationVideo) {
  if (!YOUTUBE_ID.test(video.videoId) || !video.title.trim()) return null
  const uploadDate = video.publishedAt && /^\d{4}-\d{2}-\d{2}$/.test(video.publishedAt) ? video.publishedAt : null
  const duration = video.duration ? toIsoDuration(video.duration) : null
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    ...(video.description.trim() ? { description: video.description } : {}),
    thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
    ...(uploadDate ? { uploadDate } : {}),
    embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
    ...(duration ? { duration } : {}),
    inLanguage: 'id',
  }
}

export type SiteArticle = {
  title: string
  category: string
  date: string
  description: string
  source: string
}

// Article per artikel publikasi. datePublished dan dateModified memakai
// satu-satunya tanggal artikel yang ada (bila hanya "Bulan Tahun", dipakai
// apa adanya sebagai YYYY-MM); bila tanggal tidak bisa dipahami, kedua
// field dilepas. Author memakai nama tim sesuai permintaan, bukan
// `source` apa adanya (source di data berisi nama tim yang sama).
export function articleJsonLd(article: SiteArticle) {
  const date = parseIndonesianDate(article.date)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    articleSection: article.category,
    inLanguage: 'id',
    ...(date ? { datePublished: date, dateModified: date } : {}),
    author: { '@type': 'Organization', name: AUTHOR_NAME },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: { '@type': 'ImageObject', url: SITE_LOGO_URL },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/adiwiyata/publikasi` },
  }
}
