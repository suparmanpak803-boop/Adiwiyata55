import type { Metadata } from 'next'
import { AdiwiyataPublicHub } from '@/components/adiwiyata/public-hub'
import { getAdiwiyataDocuments } from '@/lib/documents'
import { getAdiwiyataSiteContent } from '@/lib/adiwiyata-site-content.server'
import { getSliderHomepageData } from '@/lib/slider/data'
import './adiwiyata.css'

export const metadata: Metadata = {
  title: 'Informasi Adiwiyata | SMAN 55 Jakarta',
  description: 'Pusat informasi, program, publikasi, dokumentasi kegiatan dan arsip Adiwiyata SMAN 55 Jakarta.',
}

export const dynamic = 'force-dynamic'

export default async function AdiwiyataHomePage() {
  const [documents, content, sliderData] = await Promise.all([getAdiwiyataDocuments(), getAdiwiyataSiteContent(), getSliderHomepageData()])
  return <AdiwiyataPublicHub documents={documents} content={content} sliderData={sliderData} />
}
