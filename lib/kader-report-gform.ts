// Konfigurasi Google Form laporan kinerja kader.
// Form "Laporan Kinerja Kader Adiwiyata" dibuat via Google Forms API
// pada 2026-11-24 (akun Google pengguna). formId adalah ID /d/e/ dari
// URL viewform.
//
// PENTING: entry ID di bawah ini adalah ID DALAM dari data form yang
// tayang (FB_PUBLIC_LOAD_DATA_ di HTML viewform: tiap item punya
// [id_luar, judul, ..., [[id_dalam, ...]]], dan yang dipakai
// formResponse/pre-filled adalah id_dalam). BUKAN questionId
// heksadesimal dari Forms API (mis. "6bd61b2d") dan BUKAN id_luar
// (mis. 111865168). Uji kirim 24–25 Nov membuktikan keduanya
// diabaikan Google — respons tercatat kosong. ID dalam TERBUKTI
// dikenali form: nilai pre-filled dengan ID ini tampil sebagai
// jawaban di halaman form (TES-PREFILL-DALAM), dan uji kirim TES8
// memakai ID ini. Bila pertanyaan dibuat ulang di editor Form,
// ID dalamnya berubah dan harus diperbarui di sini.
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
    date: 'entry.1809193773',
    staffName: 'entry.968299065',
    className: 'entry.1611215990',
    category: 'entry.758090798',
    tasks: 'entry.1906652442',
    notes: 'entry.61308530',
    evidenceUrl: 'entry.843093599',
  },
}

export function hasKaderReportFormConfig(): boolean {
  return Boolean(KADER_REPORT_GFORM.formId) && Object.values(KADER_REPORT_GFORM.entries).every(Boolean)
}

export function getKaderReportFormUrl(): string {
  if (!hasKaderReportFormConfig()) return ''
  return `https://docs.google.com/forms/d/e/${KADER_REPORT_GFORM.formId}/viewform`
}
