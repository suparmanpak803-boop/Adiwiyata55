import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdiwiyataPublicHub } from '@/components/adiwiyata/public-hub'
import { getAdiwiyataDocuments } from '@/lib/documents'
import { getAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content.server'
import { getPortalUser } from '@/lib/auth/access'
import { getStrukturPetugas } from '@/lib/struktur-petugas-data'
import '../adiwiyata.css'

export const dynamic = 'force-dynamic'

const sections = ['tentang', 'profil', 'program', 'dokumentasi', 'struktur', 'publikasi', 'dokumen'] as const

export function generateStaticParams() {
  return sections.map((section) => ({ section }))
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  const content = await getAdiwiyataSiteContent()
  const page = Object.hasOwn(content.pages, section) ? content.pages[section as keyof typeof content.pages] : null
  const title = section === 'tentang' ? 'Tentang Kami' : page?.title ?? 'Informasi Adiwiyata'
  const description = section === 'tentang' ? 'Kenali platform digital, tujuan pemantauan sampah, dan tim pengembang Adiwiyata 55 SMAN 55 Jakarta.' : page?.intro ?? 'Pusat Informasi Adiwiyata SMAN 55 Jakarta.'
  // Judul lengkap (dengan nama sekolah) dirakit template title di root
  // layout; di sini cukup nama section-nya saja.
  const url = `https://adiwiyata55-cwpr.vercel.app/adiwiyata/${section}`
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
  return <AdiwiyataPublicHub section={section as (typeof sections)[number]} documents={documents} content={content} structure={structure} />
}
