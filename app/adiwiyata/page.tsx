import type { Metadata } from 'next'
import { AdiwiyataPublicHub } from '@/components/adiwiyata/public-hub'
import { getAdiwiyataDocuments } from '@/lib/documents'
import { getAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content.server'
import { getSliderHomepageData } from '@/lib/slider/data'
import './adiwiyata.css'

export const metadata: Metadata = {
  title: 'Informasi Adiwiyata',
  description: 'Pusat informasi, program, publikasi, dokumentasi kegiatan dan arsip Adiwiyata SMAN 55 Jakarta.',
  alternates: { canonical: 'https://adiwiyata55-cwpr.vercel.app/adiwiyata' },
  openGraph: {
    title: 'Informasi Adiwiyata | Adiwiyata SMAN 55 Jakarta',
    description: 'Pusat informasi, program, publikasi, dokumentasi kegiatan dan arsip Adiwiyata SMAN 55 Jakarta.',
    url: 'https://adiwiyata55-cwpr.vercel.app/adiwiyata',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Adiwiyata SMAN 55 Jakarta',
  url: 'https://adiwiyata55-cwpr.vercel.app/adiwiyata',
  logo: 'https://adiwiyata55-cwpr.vercel.app/adiwiyata-logo.png',
  description: 'Pusat informasi, program, publikasi, dokumentasi kegiatan dan arsip Adiwiyata SMAN 55 Jakarta.',
  inLanguage: 'id',
}

export default async function AdiwiyataHomePage() {
  const [documents, content, sliderData] = await Promise.all([getAdiwiyataDocuments(), getAdiwiyataSiteContent(), getSliderHomepageData()])
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AdiwiyataPublicHub documents={documents} content={content} sliderData={sliderData} />
    </>
  )
}
