'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requirePortalRole } from '@/lib/auth/access'
import { allowRequest } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { sliderActivityLog, sliderImages, sliderSettings, sliderSlides } from '@/lib/db/schema'
import { ensureSliderSchema, type SliderTransition } from '@/lib/slider/data'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateCtaUrl(value: string) {
  const url = value.trim()
  if (!url) return null
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString()
  } catch {
    // Invalid URLs are reported with the same message as unsupported protocols.
  }
  throw new Error('Tautan tombol harus berupa jalur internal (/) atau URL http/https.')
}

function validateDate(value: string, label: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} tidak valid.`)
  }
  return value
}

function invalidateSliderPages() {
  revalidatePath('/')
  revalidatePath('/admin/slider')
}

export async function saveSliderSlide(formData: FormData) {
  const admin = await requirePortalRole(['admin'])
  await ensureSliderSchema()
  // B-04: batas laju perubahan slider (30/jam per admin).
  if (!(await allowRequest(`slider:${admin.id}`, 30, 3600))) throw new Error('Terlalu banyak perubahan. Coba lagi nanti.')

  const rawId = String(formData.get('id') ?? '').trim()
  const id = rawId || crypto.randomUUID()
  if (!uuidPattern.test(id)) throw new Error('Slide tidak ditemukan. Muat ulang halaman lalu coba lagi.')

  const judul = String(formData.get('judul') ?? '').trim().slice(0, 120) || null
  const deskripsi = String(formData.get('deskripsi') ?? '').trim().slice(0, 280) || null
  const ctaTeks = String(formData.get('cta_teks') ?? '').trim().slice(0, 48) || null
  const ctaUrlRaw = String(formData.get('cta_url') ?? '').trim().slice(0, 500)
  const ctaUrl = validateCtaUrl(ctaUrlRaw)
  const altText = String(formData.get('alt_text') ?? '').trim().slice(0, 240)
  const tanggalMulai = validateDate(String(formData.get('tanggal_mulai') ?? '').trim(), 'Tanggal mulai')
  const tanggalSelesai = validateDate(String(formData.get('tanggal_selesai') ?? '').trim(), 'Tanggal selesai')
  const rawActive = String(formData.get('aktif') ?? '')
  if (rawActive !== 'true' && rawActive !== 'false') throw new Error('Status slide tidak dapat disimpan. Muat ulang halaman lalu coba lagi.')
  const aktif = rawActive === 'true'

  if (!altText) throw new Error('Teks alternatif gambar wajib diisi.')
  if (Boolean(ctaTeks) !== Boolean(ctaUrl)) throw new Error('Isi teks tombol dan tautannya bersama-sama, atau kosongkan keduanya.')
  if (tanggalMulai && tanggalSelesai && tanggalSelesai < tanggalMulai) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.')

  const existing = rawId ? (await db.select().from(sliderSlides).where(eq(sliderSlides.id, id)).limit(1))[0] : null
  if (rawId && !existing) throw new Error('Slide tidak ditemukan. Muat ulang halaman lalu coba lagi.')

  const upload = formData.get('gambar')
  let imageData: Buffer | null = null
  let imageType: string | null = null
  let imageUrl = existing?.imageUrl ?? ''
  if (upload && typeof upload === 'object' && 'arrayBuffer' in upload && upload.size > 0) {
    if (upload.size > MAX_IMAGE_BYTES) throw new Error('Ukuran gambar maksimal 2 MB.')
    if (!allowedMimeTypes.has(upload.type)) throw new Error('Format gambar harus JPG, PNG, atau WebP.')
    const source = Buffer.from(await upload.arrayBuffer())
    const isJpeg = source[0] === 0xff && source[1] === 0xd8 && source[2] === 0xff
    const isPng = source.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const isWebp = source.toString('ascii', 0, 4) === 'RIFF' && source.toString('ascii', 8, 12) === 'WEBP'
    const signatureMatches = upload.type === 'image/jpeg' ? isJpeg : upload.type === 'image/png' ? isPng : isWebp
    if (!signatureMatches) throw new Error('Isi gambar tidak sesuai dengan format berkasnya.')
    imageData = source
    imageType = upload.type
    imageUrl = `/api/slider/images/${id}`
  } else if (!existing) {
    throw new Error('Pilih gambar untuk slide baru.')
  }

  await db.transaction(async (transaction) => {
    if (existing) {
      await transaction.update(sliderSlides).set({
        imageUrl,
        altText,
        judul,
        deskripsi,
        ctaTeks,
        ctaUrl,
        aktif,
        tanggalMulai,
        tanggalSelesai,
      }).where(eq(sliderSlides.id, id))
    } else {
      await transaction.insert(sliderSlides).values({
        id,
        imageUrl,
        altText,
        judul,
        deskripsi,
        ctaTeks,
        ctaUrl,
        aktif,
        tanggalMulai,
        tanggalSelesai,
        urutan: Date.now(),
        dibuatOleh: admin.id,
      })
    }
    if (imageData) {
      await transaction.insert(sliderImages).values({ slideId: id, imageData, imageType: imageType ?? 'image/webp' }).onConflictDoUpdate({
        target: sliderImages.slideId,
        set: { imageData, imageType: imageType ?? 'image/webp', updatedAt: new Date() },
      })
    }
    await transaction.insert(sliderActivityLog).values({
      actorId: admin.id,
      action: existing ? 'ubah' : 'tambah',
      slideId: id,
      details: { judul, aktif, gambarDiperbarui: Boolean(imageData) },
    })
  })

  invalidateSliderPages()
  return { success: true }
}

export async function toggleSliderSlide(id: string, aktif: boolean) {
  const admin = await requirePortalRole(['admin'])
  await ensureSliderSchema()
  // B-04: batas laju perubahan slider (30/jam per admin).
  if (!(await allowRequest(`slider:${admin.id}`, 30, 3600))) throw new Error('Terlalu banyak perubahan. Coba lagi nanti.')
  if (!uuidPattern.test(id) || typeof aktif !== 'boolean') throw new Error('Status slide tidak dapat disimpan. Muat ulang halaman lalu coba lagi.')
  await db.transaction(async (transaction) => {
    const [slide] = await transaction.update(sliderSlides).set({ aktif }).where(eq(sliderSlides.id, id)).returning({ id: sliderSlides.id, judul: sliderSlides.judul })
    if (!slide) throw new Error('Slide tidak ditemukan.')
    await transaction.insert(sliderActivityLog).values({ actorId: admin.id, action: 'ubah', slideId: id, details: { judul: slide.judul, aktif } })
  })
  invalidateSliderPages()
  return { success: true }
}

export async function duplicateSliderSlide(id: string) {
  const admin = await requirePortalRole(['admin'])
  await ensureSliderSchema()
  // B-04: batas laju perubahan slider (30/jam per admin).
  if (!(await allowRequest(`slider:${admin.id}`, 30, 3600))) throw new Error('Terlalu banyak perubahan. Coba lagi nanti.')
  if (!uuidPattern.test(id)) throw new Error('Slide tidak ditemukan.')
  const [source] = await db.select().from(sliderSlides).where(eq(sliderSlides.id, id)).limit(1)
  if (!source) throw new Error('Slide tidak ditemukan.')
  const [sourceImage] = await db.select().from(sliderImages).where(eq(sliderImages.slideId, id)).limit(1)
  const newId = crypto.randomUUID()
  const newTitle = source.judul ? `${source.judul} (salinan)` : 'Salinan slide'
  const imageUrl = source.imageUrl.startsWith('/api/slider/images/') ? `/api/slider/images/${newId}` : source.imageUrl
  await db.transaction(async (transaction) => {
    await transaction.insert(sliderSlides).values({
      id: newId,
      imageUrl,
      altText: source.altText,
      judul: newTitle,
      deskripsi: source.deskripsi,
      ctaTeks: source.ctaTeks,
      ctaUrl: source.ctaUrl,
      urutan: source.urutan + 1,
      aktif: false,
      tanggalMulai: null,
      tanggalSelesai: null,
      dibuatOleh: admin.id,
    })
    if (sourceImage) await transaction.insert(sliderImages).values({ slideId: newId, imageData: sourceImage.imageData, imageType: sourceImage.imageType })
    await transaction.insert(sliderActivityLog).values({ actorId: admin.id, action: 'duplikat', slideId: newId, details: { sumber: id, judul: newTitle } })
  })
  invalidateSliderPages()
  return { success: true }
}

export async function deleteSliderSlide(id: string) {
  const admin = await requirePortalRole(['admin'])
  await ensureSliderSchema()
  // B-04: batas laju perubahan slider (30/jam per admin).
  if (!(await allowRequest(`slider:${admin.id}`, 30, 3600))) throw new Error('Terlalu banyak perubahan. Coba lagi nanti.')
  if (!uuidPattern.test(id)) throw new Error('Slide tidak ditemukan.')
  const [slide] = await db.select({ id: sliderSlides.id, judul: sliderSlides.judul }).from(sliderSlides).where(eq(sliderSlides.id, id)).limit(1)
  if (!slide) throw new Error('Slide tidak ditemukan.')
  await db.transaction(async (transaction) => {
    await transaction.delete(sliderSlides).where(eq(sliderSlides.id, id))
    await transaction.insert(sliderActivityLog).values({ actorId: admin.id, action: 'hapus', slideId: id, details: { judul: slide.judul } })
  })
  invalidateSliderPages()
  return { success: true }
}

export async function saveSliderOrder(ids: string[]) {
  const admin = await requirePortalRole(['admin'])
  await ensureSliderSchema()
  // B-04: batas laju perubahan slider (30/jam per admin).
  if (!(await allowRequest(`slider:${admin.id}`, 30, 3600))) throw new Error('Terlalu banyak perubahan. Coba lagi nanti.')
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => !uuidPattern.test(id)) || new Set(ids).size !== ids.length) {
    throw new Error('Urutan slide tidak dapat disimpan. Muat ulang halaman lalu coba lagi.')
  }
  const rows = await db.select({ id: sliderSlides.id }).from(sliderSlides)
  if (rows.length !== ids.length || rows.some((row) => !ids.includes(row.id))) throw new Error('Daftar slide berubah. Muat ulang halaman lalu coba lagi.')
  await db.transaction(async (transaction) => {
    for (const [urutan, id] of ids.entries()) {
      await transaction.update(sliderSlides).set({ urutan }).where(eq(sliderSlides.id, id))
    }
    if (ids.length) await transaction.insert(sliderActivityLog).values({ actorId: admin.id, action: 'ubah_urutan', details: { jumlah: ids.length } })
  })
  invalidateSliderPages()
  return { success: true }
}

export async function saveSliderSettings(input: {
  intervalDetik: number
  transisi: SliderTransition
  autoplay: boolean
  tampilPanah: boolean
  tampilDots: boolean
}) {
  const admin = await requirePortalRole(['admin'])
  await ensureSliderSchema()
  // B-04: batas laju perubahan slider (30/jam per admin).
  if (!(await allowRequest(`slider:${admin.id}`, 30, 3600))) throw new Error('Terlalu banyak perubahan. Coba lagi nanti.')
  if (!input || !Number.isInteger(input.intervalDetik) || input.intervalDetik < 2 || input.intervalDetik > 15) throw new Error('Kecepatan slider harus 2 sampai 15 detik.')
  if (input.transisi !== 'fade' && input.transisi !== 'slide') throw new Error('Jenis transisi tidak dapat disimpan. Muat ulang halaman lalu coba lagi.')
  if ([input.autoplay, input.tampilPanah, input.tampilDots].some((value) => typeof value !== 'boolean')) throw new Error('Pengaturan kontrol tidak dapat disimpan. Muat ulang halaman lalu coba lagi.')
  await db.insert(sliderSettings).values({
    id: true,
    intervalDetik: input.intervalDetik,
    transisi: input.transisi,
    autoplay: input.autoplay,
    tampilPanah: input.tampilPanah,
    tampilDots: input.tampilDots,
    updatedBy: admin.id,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: sliderSettings.id,
    set: {
      intervalDetik: input.intervalDetik,
      transisi: input.transisi,
      autoplay: input.autoplay,
      tampilPanah: input.tampilPanah,
      tampilDots: input.tampilDots,
      updatedBy: admin.id,
      updatedAt: new Date(),
    },
  })
  invalidateSliderPages()
  return { success: true }
}
