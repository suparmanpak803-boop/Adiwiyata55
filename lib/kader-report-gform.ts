// Konfigurasi Google Form laporan kinerja kader.
// PERINGATAN: formId dan ID entry di bawah ini KOSONG karena nilai
// aslinya tidak tersisa di repo mana pun (lihat PERBAIKAN.md).
// Isi dari Google Form asli: buka Form > kirim > salin ID form
// (bagian /d/e/<formId>/) dan ID tiap kolom (entry.XXXXXXXXX,
// lihat dari URL pre-filled). Selama kosong, form laporan kader
// menampilkan catatan "Google Form belum dikonfigurasi" dan tombol
// kirim nonaktif — itu perilaku yang disengaja, bukan bug.
export const KADER_REPORT_GFORM: {
  formId: string
  entries: {
    date: string
    staffName: string
    className: string
    category: string
    tasks: string
    notes: string
    evidenceUrl: string
  }
} = {
  formId: '',
  entries: {
    date: '',
    staffName: '',
    className: '',
    category: '',
    tasks: '',
    notes: '',
    evidenceUrl: '',
  },
}

export function hasKaderReportFormConfig(): boolean {
  return Boolean(KADER_REPORT_GFORM.formId) && Object.values(KADER_REPORT_GFORM.entries).every(Boolean)
}

export function getKaderReportFormUrl(): string {
  if (!hasKaderReportFormConfig()) return ''
  return `https://docs.google.com/forms/d/e/${KADER_REPORT_GFORM.formId}/viewform`
}
