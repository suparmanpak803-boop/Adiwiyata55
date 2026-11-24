// Konfigurasi Google Form laporan kinerja kader.
// Form "Laporan Kinerja Kader Adiwiyata" dibuat via Google Forms API
// pada 2026-11-24 (akun Google pengguna). formId adalah ID /d/e/ dari
// URL viewform.
//
// PENTING: entry ID di bawah ini adalah ID NUMERIK dari data form yang
// tayang (FB_PUBLIC_LOAD_DATA_ di HTML viewform), BUKAN questionId
// heksadesimal dari Forms API (mis. "6bd61b2d"). Uji kirim 24 Nov
// membuktikan ID heksadesimal diabaikan Google — respons tercatat
// kosong — sedangkan ID numerik inilah yang dipakai formResponse.
// Bila pertanyaan dibuat ulang di editor Form, ID numeriknya berubah
// dan harus diperbarui di sini (lihat di HTML viewform, cari judul
// pertanyaan di blob FB_PUBLIC_LOAD_DATA_).
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
    date: 'entry.111865168',
    staffName: 'entry.1939884990',
    className: 'entry.1928518469',
    category: 'entry.1529131154',
    tasks: 'entry.1475142477',
    notes: 'entry.1441677708',
    evidenceUrl: 'entry.1469026892',
  },
}

export function hasKaderReportFormConfig(): boolean {
  return Boolean(KADER_REPORT_GFORM.formId) && Object.values(KADER_REPORT_GFORM.entries).every(Boolean)
}

export function getKaderReportFormUrl(): string {
  if (!hasKaderReportFormConfig()) return ''
  return `https://docs.google.com/forms/d/e/${KADER_REPORT_GFORM.formId}/viewform`
}
