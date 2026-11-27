import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdiwiyataPublicHub } from '@/components/adiwiyata/public-hub'
import { getAdiwiyataDocuments } from '@/lib/documents'
import { getAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content.server'
import { getPortalUser } from '@/lib/auth/access'
import { getStrukturPetugas } from '@/lib/struktur-petugas-data'
import { JsonLd, SITE_URL, articleJsonLd, breadcrumbJsonLd } from '@/lib/seo-schema'
import '../adiwiyata.css'

export const dynamic = 'force-dynamic'

const sections = ['tentang', 'profil', 'program', 'dokumentasi', 'struktur', 'publikasi', 'dokumen'] as const

export function generateStaticParams() {
  return sections.map((section) => ({ section }))
}

// Deskripsi meta per section (120–160 karakter, unik; intro halaman tetap
// dipakai sebagai paragraf pembuka yang terlihat, bukan sebagai meta).
const sectionDescriptions: Record<string, string> = {
  tentang:
    'Adiwiyata 55 adalah platform digital SMAN 55 Jakarta untuk memantau pemilahan sampah lima kategori, menggantikan catatan kertas dengan data yang transparan.',
  profil:
    'Perjalanan Adiwiyata SMAN 55 Jakarta: dari kebiasaan memilah sampah di kelas dan membawa tumbler hingga program yang melibatkan seluruh warga sekolah.',
  program:
    'Lima belas kader menjalankan sepuluh kegiatan lingkungan di SMAN 55 Jakarta: pembibitan TOGA, hidroponik, bank sampah, dan kerja bakti membersihkan sekolah.',
  dokumentasi:
    'Kenali 15 kader Adiwiyata SMAN 55 Jakarta beserta uraian tugasnya, dan lihat foto dokumentasi kegiatan lingkungan warga sekolah sejak 2024.',
  publikasi:
    'Artikel dan kabar terbaru seputar gerakan Adiwiyata SMAN 55 Jakarta: pemilahan sampah, bank sampah, kebun sekolah, dan kegiatan warga sekolah.',
  dokumen:
    'Arsip dokumen resmi program Adiwiyata SMAN 55 Jakarta yang diunggah admin: rujukan kegiatan, laporan, dan bukti pendukung program sekolah.',
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  const content = await getAdiwiyataSiteContent()
  const page = Object.hasOwn(content.pages, section) ? content.pages[section as keyof typeof content.pages] : null
  const title = section === 'tentang' ? 'Tentang Kami' : page?.title ?? 'Informasi Adiwiyata'
  const description = sectionDescriptions[section] ?? 'Pusat Informasi Adiwiyata SMAN 55 Jakarta.'
  // Judul lengkap (dengan nama sekolah) dirakit template title di root
  // layout; di sini cukup nama section-nya saja.
  const url = `https://www.adiwiyata55jkt.my.id/adiwiyata/${section}`
  // Struktur petugas hanya tampil lengkap bila sudah login: jangan
  // sampai terindeks.
  if (section === 'struktur') {
    return { title, description, robots: { index: false, follow: false } }
  }
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | Adiwiyata SMAN 55 Jakarta`, description, url, type: 'website' },
    twitter: { card: 'summary_large_image', title: `${title} | Adiwiyata SMAN 55 Jakarta`, description },
  }
}

export default async function AdiwiyataSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!sections.some((item) => item === section)) notFound()
  const [documents, content, user] = await Promise.all([getAdiwiyataDocuments(), getAdiwiyataSiteContent(), getPortalUser().catch(() => null)])
  // Struktur organisasi hanya dibaca dari DB bila pengguna sudah
  // login (getStrukturPetugas memakai data default SK bila tabel
  // atau baris belum ada); pengunjung hanya melihat ajakan masuk.
  const structure = user ? await getStrukturPetugas() : null
  // BreadcrumbList hanya untuk section publik di sitemap; /struktur
  // noindex + wajib login, jadi tidak diberi schema.
  const isPublicSection = section !== 'struktur'
  const sectionTitle = section === 'tentang' ? 'Tentang Kami' : content.pages[section as keyof typeof content.pages].title
  const breadcrumbLd = isPublicSection
    ? breadcrumbJsonLd([
        { name: 'Beranda', item: `${SITE_URL}/adiwiyata` },
        { name: sectionTitle, item: `${SITE_URL}/adiwiyata/${section}` },
      ])
    : null
  // Satu blok Article per artikel yang ditampilkan di /publikasi.
  const articleLd =
    section === 'publikasi' && content.articles.length > 0
      ? { '@context': 'https://schema.org', '@graph': content.articles.map((article) => articleJsonLd(article)) }
      : null
  return (
    <>
      {breadcrumbLd ? <JsonLd data={breadcrumbLd} /> : null}
      {articleLd ? <JsonLd data={articleLd} /> : null}
      <AdiwiyataPublicHub section={section as (typeof sections)[number]} documents={documents} content={content} structure={structure} />
    </>
  )
}
