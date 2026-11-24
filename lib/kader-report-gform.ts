// Konfigurasi Google Form laporan kinerja kader.
// Form "Laporan Kinerja Kader Adiwiyata" dibuat via Google Forms API
// pada 2026-11-24 (akun Google pengguna). formId adalah ID /d/e/ dari
// URL viewform; entry ID adalah questionId dari Forms API — sudah
// diverifikasi lewat link pre-filled (nilai tes muncul di HTML form).
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
  formId: '1FAIpQLSeDkHFdrHeeL7oLlf6Svyq3q6euQhPdSxZHKYPxzUdOZc8UuA',
  entries: {
    date: 'entry.6bd61b2d',
    staffName: 'entry.39b71239',
    className: 'entry.60093476',
    category: 'entry.2d2f8c2e',
    tasks: 'entry.71a5351a',
    notes: 'entry.03a77e72',
    evidenceUrl: 'entry.3240965f',
  },
}

export function hasKaderReportFormConfig(): boolean {
  return Boolean(KADER_REPORT_GFORM.formId) && Object.values(KADER_REPORT_GFORM.entries).every(Boolean)
}

export function getKaderReportFormUrl(): string {
  if (!hasKaderReportFormConfig()) return ''
  return `https://docs.google.com/forms/d/e/${KADER_REPORT_GFORM.formId}/viewform`
}
