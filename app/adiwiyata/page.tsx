import type { Metadata } from 'next'
import { AdiwiyataPublicHub } from '@/components/adiwiyata/public-hub'
import { getAdiwiyataDocuments } from '@/lib/documents'
import { getAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content.server'
import { getSliderHomepageData } from '@/lib/slider/data'
import { JsonLd, SITE_URL, breadcrumbJsonLd } from '@/lib/seo-schema'
import './adiwiyata.css'

export const metadata: Metadata = {
  title: 'Informasi Adiwiyata',
  description: 'Temukan program lingkungan, kegiatan warga sekolah, artikel, dan arsip Adiwiyata SMAN 55 Jakarta — dari pemilahan sampah dan bank sampah sampai kebun sekolah.',
  alternates: { canonical: 'https://www.adiwiyata55jkt.my.id/adiwiyata' },
  openGraph: {
    title: 'Informasi Adiwiyata | Adiwiyata SMAN 55 Jakarta',
    description: 'Temukan program lingkungan, kegiatan warga sekolah, artikel, dan arsip Adiwiyata SMAN 55 Jakarta — dari pemilahan sampah dan bank sampah sampai kebun sekolah.',
    url: 'https://www.adiwiyata55jkt.my.id/adiwiyata',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Informasi Adiwiyata | Adiwiyata SMAN 55 Jakarta',
    description: 'Temukan program lingkungan, kegiatan warga sekolah, artikel, dan arsip Adiwiyata SMAN 55 Jakarta — dari pemilahan sampah dan bank sampah sampai kebun sekolah.',
  },
}

export const dynamic = 'force-dynamic'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Adiwiyata SMAN 55 Jakarta',
  url: 'https://www.adiwiyata55jkt.my.id/adiwiyata',
  logo: 'https://www.adiwiyata55jkt.my.id/adiwiyata-logo.png',
  // Diselaraskan dengan deskripsi meta halaman ini (120–160 karakter).
  description: 'Temukan program lingkungan, kegiatan warga sekolah, artikel, dan arsip Adiwiyata SMAN 55 Jakarta — dari pemilahan sampah dan bank sampah sampai kebun sekolah.',
  inLanguage: 'id',
}

const breadcrumbLd = breadcrumbJsonLd([{ name: 'Beranda', item: `${SITE_URL}/adiwiyata` }])

export default async function AdiwiyataHomePage() {
  const [documents, content, sliderData] = await Promise.all([getAdiwiyataDocuments(), getAdiwiyataSiteContent(), getSliderHomepageData()])
  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      <AdiwiyataPublicHub documents={documents} content={content} sliderData={sliderData} />
    </>
  )
}
