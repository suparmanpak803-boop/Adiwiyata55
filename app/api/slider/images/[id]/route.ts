import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { allowRequest } from '@/lib/rate-limit'
import { sliderImages, sliderSlides } from '@/lib/db/schema'
import { getSliderToday } from '@/lib/slider/data'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: 'Sesi masuk diperlukan.' }, { status: 401 })
  // B-13: batas laju pengambilan gambar slider (60/menit per pengguna).
  if (!(await allowRequest(`slider-image:${user.id}`, 60, 60))) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 })

  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Gambar tidak ditemukan.' }, { status: 404 })
  }

  try {
    const [record] = await db.select({
      imageData: sliderImages.imageData,
      imageType: sliderImages.imageType,
      aktif: sliderSlides.aktif,
      tanggalMulai: sliderSlides.tanggalMulai,
      tanggalSelesai: sliderSlides.tanggalSelesai,
    }).from(sliderImages).innerJoin(sliderSlides, eq(sliderImages.slideId, sliderSlides.id)).where(eq(sliderSlides.id, id)).limit(1)

    const today = getSliderToday()
    const visible = Boolean(record?.aktif) && (!record?.tanggalMulai || record.tanggalMulai <= today) && (!record?.tanggalSelesai || record.tanggalSelesai >= today)
    if (!record || (user.role !== 'admin' && !visible)) {
      return NextResponse.json({ error: 'Gambar tidak ditemukan.' }, { status: 404 })
    }

    return new Response(new Uint8Array(record.imageData), {
      headers: {
        'Content-Type': record.imageType,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Gambar belum tersedia.' }, { status: 404 })
  }
}
