import type { Metadata } from 'next'
import { EducationVideosPage } from '@/components/education/education-videos-page'
import { getEducationVideos } from '@/lib/education-videos'

export const metadata: Metadata = {
  title: 'Video Edukasi Lingkungan | Adiwiyata SMAN 55 Jakarta',
  description: 'Belajar memilah sampah, daur ulang, kompos, wadah makan ramah lingkungan, dan kegiatan Adiwiyata SMAN 55 Jakarta.',
}

export const revalidate = 300

export default async function EducationPage({ searchParams }: { searchParams: Promise<{ video?: string | string[] }> }) {
  const [{ videos, error }, params] = await Promise.all([getEducationVideos(), searchParams])
  const requestedVideo = Array.isArray(params.video) ? params.video[0] : params.video
  const initialVideoId = requestedVideo && /^[A-Za-z0-9_-]{11}$/.test(requestedVideo) ? requestedVideo : ''

  return <EducationVideosPage videos={videos} loadError={error} initialVideoId={initialVideoId} />
}
