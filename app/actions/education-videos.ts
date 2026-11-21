'use server'

import { eq, inArray } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requirePortalRole } from '@/lib/auth/access'
import { db } from '@/lib/db'
import { adiwiyataEducationVideos, adiwiyataVideoDisplaySettings } from '@/lib/db/schema'
import { getYouTubeId } from '@/lib/education-videos'
import { allowedVideoCategories } from '@/lib/education-video-categories'

export type EducationVideoInput = {
  originalVideoId?: string
  youtubeUrl: string
  title: string
  category: string
  description: string
  displayOrder: number
  enabled: boolean
}

function validateVideoInput(input: EducationVideoInput) {
  if (!input || typeof input !== 'object') throw new Error('Data video tidak valid.')
  const youtubeUrl = typeof input.youtubeUrl === 'string' ? input.youtubeUrl.trim().slice(0, 500) : ''
  const videoId = getYouTubeId(youtubeUrl)
  if (!videoId) throw new Error('Masukkan tautan YouTube yang valid.')
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 160) : ''
  if (!title) throw new Error('Judul video wajib diisi.')
  if (!allowedVideoCategories.some((category) => category === input.category)) throw new Error('Pilih kategori video yang valid.')
  if (typeof input.description !== 'string' || input.description.length > 500) throw new Error('Deskripsi maksimal 500 karakter.')
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 1000) throw new Error('Urutan video harus bilangan bulat 0–1000.')
  if (typeof input.enabled !== 'boolean') throw new Error('Status tayang video tidak valid.')
  return { videoId, youtubeUrl, title, category: input.category, description: input.description.trim(), displayOrder: input.displayOrder, enabled: input.enabled }
}

export async function saveEducationVideo(input: EducationVideoInput) {
  await requirePortalRole(['admin'])
  const validated = validateVideoInput(input)
  const originalVideoId = input.originalVideoId?.trim()

  await db.transaction(async (transaction) => {
    if (originalVideoId) {
      const updated = await transaction.update(adiwiyataEducationVideos).set({
        videoId: validated.videoId,
        youtubeUrl: validated.youtubeUrl,
        title: validated.title,
        category: validated.category,
        description: validated.description,
        displayOrder: validated.displayOrder,
        isEnabled: validated.enabled,
        updatedAt: new Date(),
      }).where(eq(adiwiyataEducationVideos.videoId, originalVideoId)).returning({ videoId: adiwiyataEducationVideos.videoId })
      if (!updated.length) throw new Error('Video tidak ditemukan. Muat ulang halaman lalu coba lagi.')
      if (originalVideoId !== validated.videoId) {
        await transaction.delete(adiwiyataVideoDisplaySettings).where(eq(adiwiyataVideoDisplaySettings.videoId, originalVideoId))
      }
    } else {
      await transaction.insert(adiwiyataEducationVideos).values({
        videoId: validated.videoId,
        youtubeUrl: validated.youtubeUrl,
        title: validated.title,
        category: validated.category,
        description: validated.description,
        displayOrder: validated.displayOrder,
        isEnabled: validated.enabled,
        publishedAt: new Date().toISOString().slice(0, 10),
      })
    }
  })

  revalidateTag('education-videos', 'max')
  revalidatePath('/edukasi')
  revalidatePath('/')
  return { success: true }
}

export async function deleteEducationVideo(videoId: string) {
  await requirePortalRole(['admin'])
  if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('Video tidak ditemukan.')
  await db.transaction(async (transaction) => {
    await transaction.delete(adiwiyataVideoDisplaySettings).where(eq(adiwiyataVideoDisplaySettings.videoId, videoId))
    const deleted = await transaction.delete(adiwiyataEducationVideos).where(eq(adiwiyataEducationVideos.videoId, videoId)).returning({ videoId: adiwiyataEducationVideos.videoId })
    if (!deleted.length) throw new Error('Video tidak ditemukan atau sudah dihapus.')
  })
  revalidateTag('education-videos', 'max')
  revalidatePath('/edukasi')
  revalidatePath('/')
  return { success: true }
}

export type EducationVideoSettingInput = { videoId: string; enabled: boolean; displayOrder: number }

export async function saveEducationVideoSettings(settings: EducationVideoSettingInput[]) {
  await requirePortalRole(['admin'])
  if (!Array.isArray(settings) || settings.length > 300) throw new Error('Daftar pengaturan video tidak valid.')
  const rows = await db.select({ videoId: adiwiyataEducationVideos.videoId }).from(adiwiyataEducationVideos)
  const availableIds = new Set(rows.map((row) => row.videoId))
  const seen = new Set<string>()
  for (const setting of settings) {
    if (!setting || typeof setting !== 'object' || typeof setting.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(setting.videoId) || !availableIds.has(setting.videoId) || seen.has(setting.videoId)) {
      throw new Error('Daftar video berubah atau berisi tautan yang tidak valid. Muat ulang halaman lalu coba lagi.')
    }
    if (typeof setting.enabled !== 'boolean' || !Number.isInteger(setting.displayOrder) || setting.displayOrder < 0 || setting.displayOrder > 1000) {
      throw new Error('Status dan urutan video tidak valid.')
    }
    seen.add(setting.videoId)
  }

  await db.transaction(async (transaction) => {
    for (const setting of settings) {
      await transaction.update(adiwiyataEducationVideos).set({
        isEnabled: setting.enabled,
        displayOrder: setting.displayOrder,
        updatedAt: new Date(),
      }).where(eq(adiwiyataEducationVideos.videoId, setting.videoId))
      await transaction.insert(adiwiyataVideoDisplaySettings).values({
        videoId: setting.videoId,
        isEnabled: setting.enabled,
        displayOrder: setting.displayOrder,
      }).onConflictDoUpdate({
        target: adiwiyataVideoDisplaySettings.videoId,
        set: { isEnabled: setting.enabled, displayOrder: setting.displayOrder, updatedAt: new Date() },
      })
    }
    if (!settings.length && rows.length) {
      await transaction.delete(adiwiyataVideoDisplaySettings).where(inArray(adiwiyataVideoDisplaySettings.videoId, rows.map((row) => row.videoId)))
    }
  })

  revalidateTag('education-videos', 'max')
  revalidatePath('/edukasi')
  revalidatePath('/')
  return { success: true }
}
