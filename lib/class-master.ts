// Master kelas dari Apps Script (sheet Master_Kelas).
// Sumber: POST <apps_script_url> { action: 'classes', token } (token di
// body, bukan URL — lihat lib/apps-script-client.ts) mengembalikan
// { success, master: { classes, byGrade, locations } }.
// Melempar bila gagal — caller memakai .catch(() => getFallbackClassMaster()).
import { callAppsScriptRead } from '@/lib/apps-script-client'
import { LOKASI_KELAS } from '@/lib/laporan'

export type ClassMasterItem = {
  code: string
  grade: string
  rombel: string
  homeroomTeacher: string
  active: boolean
}

export type ClassMasterData = {
  classes: ClassMasterItem[]
  byGrade: Record<string, ClassMasterItem[]>
  locations: string[]
}

function isClassMasterItem(value: unknown): value is ClassMasterItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.code === 'string' && typeof item.grade === 'string' && typeof item.rombel === 'string'
}

export function getFallbackClassMaster(): ClassMasterData {
  const classes: ClassMasterItem[] = LOKASI_KELAS.map((code) => {
    const [grade, rombel] = code.split('-')
    return { code, grade, rombel, homeroomTeacher: '', active: true }
  })
  const byGrade: Record<string, ClassMasterItem[]> = { X: [], XI: [], XII: [] }
  for (const item of classes) byGrade[item.grade].push(item)
  return { classes, byGrade, locations: ['Kantin', 'Halaman', 'Lab', 'Perpustakaan', 'Taman'] }
}

export async function getClassMasterData(): Promise<ClassMasterData> {
  const result = await callAppsScriptRead<{ success?: boolean; master?: unknown; error?: string }>('classes')
  if (!result.success || !result.master || typeof result.master !== 'object') {
    throw new Error(result.error || 'Master kelas tidak dapat dimuat dari Apps Script.')
  }
  const master = result.master as Record<string, unknown>
  const classes = Array.isArray(master.classes) ? master.classes.filter(isClassMasterItem) : []
  if (!classes.length) throw new Error('Master kelas dari Apps Script kosong.')
  const byGrade: Record<string, ClassMasterItem[]> = {}
  for (const item of classes) {
    if (!byGrade[item.grade]) byGrade[item.grade] = []
    byGrade[item.grade].push(item)
  }
  const locations = Array.isArray(master.locations)
    ? master.locations.filter((item): item is string => typeof item === 'string')
    : getFallbackClassMaster().locations
  return { classes, byGrade, locations }
}

export async function isActiveClassCode(code: string): Promise<boolean> {
  const master = await getClassMasterData()
  return master.classes.some((item) => item.active && item.code === code)
}
