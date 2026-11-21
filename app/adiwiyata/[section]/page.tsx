import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdiwiyataPublicHub } from '@/components/adiwiyata/public-hub'
import { getAdiwiyataDocuments } from '@/lib/documents'
import { getAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content.server'
import '../adiwiyata.css'

export const dynamic = 'force-dynamic'

const sections = ['tentang', 'profil', 'program', 'dokumentasi', 'publikasi', 'dokumen'] as const

export function generateStaticParams() {
  return sections.map((section) => ({ section }))
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  const content = await getAdiwiyataSiteContent()
  const page = Object.hasOwn(content.pages, section) ? content.pages[section as keyof typeof content.pages] : null
  const title = section === 'tentang' ? 'Tentang Kami' : page?.title ?? 'Informasi Adiwiyata'
  const description = section === 'tentang' ? 'Kenali platform digital, tujuan pemantauan sampah, dan tim pengembang Adiwiyata 55 SMAN 55 Jakarta.' : page?.intro ?? 'Pusat Informasi Adiwiyata SMAN 55 Jakarta.'
  return { title: `${title} Adiwiyata | SMAN 55 Jakarta`, description }
}

export default async function AdiwiyataSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!sections.some((item) => item === section)) notFound()
  const [documents, content] = await Promise.all([getAdiwiyataDocuments(), getAdiwiyataSiteContent()])
  return <AdiwiyataPublicHub section={section as (typeof sections)[number]} documents={documents} content={content} />
}
