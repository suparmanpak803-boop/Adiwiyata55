import type { Metadata } from 'next'
import { EducationVideosPage } from '@/components/education/education-videos-page'
import { getEducationVideos } from '@/lib/education-videos'
import { JsonLd, SITE_URL, breadcrumbJsonLd, videoObjectJsonLd } from '@/lib/seo-schema'

export const metadata: Metadata = {
  title: 'Video Edukasi Lingkungan',
  description: 'Tonton video edukasi lingkungan SMAN 55 Jakarta: cara memilah sampah, daur ulang, membuat kompos, dan memakai wadah makan guna ulang.',
  alternates: { canonical: 'https://www.adiwiyata55jkt.my.id/edukasi' },
  openGraph: {
    title: 'Video Edukasi Lingkungan | Adiwiyata SMAN 55 Jakarta',
    description: 'Tonton video edukasi lingkungan SMAN 55 Jakarta: cara memilah sampah, daur ulang, membuat kompos, dan memakai wadah makan guna ulang.',
    url: 'https://www.adiwiyata55jkt.my.id/edukasi',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Video Edukasi Lingkungan | Adiwiyata SMAN 55 Jakarta',
    description: 'Tonton video edukasi lingkungan SMAN 55 Jakarta: cara memilah sampah, daur ulang, membuat kompos, dan memakai wadah makan guna ulang.',
  },
}

export const revalidate = 300

export default async function EducationPage({ searchParams }: { searchParams: Promise<{ video?: string | string[] }> }) {
  const [{ videos, error }, params] = await Promise.all([getEducationVideos(), searchParams])
  const requestedVideo = Array.isArray(params.video) ? params.video[0] : params.video
  const initialVideoId = requestedVideo && /^[A-Za-z0-9_-]{11}$/.test(requestedVideo) ? requestedVideo : ''

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Beranda', item: `${SITE_URL}/adiwiyata` },
    { name: 'Video Edukasi', item: `${SITE_URL}/edukasi` },
  ])
  // VideoObject dari data video yang benar-benar dimuat dari DB saat
  // runtime (judul, deskripsi, tanggal terbit bila ada). Bila DB gagal
  // dimuat, tidak ada VideoObject yang dikarang.
  const videoObjects = videos.map((video) => videoObjectJsonLd(video)).filter((item): item is NonNullable<typeof item> => item !== null)
  const videoLd = videoObjects.length > 0 ? { '@context': 'https://schema.org', '@graph': videoObjects } : null

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      {videoLd ? <JsonLd data={videoLd} /> : null}
      <EducationVideosPage videos={videos} loadError={error} initialVideoId={initialVideoId} />
    </>
  )
}
