// Normalisasi kode kelas SMAN 55: "xi-c", "XI C", "xi - c", "XIC" -> "XI-C".
// Algoritma disalin dari apps-script/Code.gs (normalizeClassCode) agar
// validasi di Next.js dan di Apps Script selalu sepakat.
// Mengembalikan '' bila tidak valid; tidak pernah throw.
export function normalizeClassCode(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  const compact = value.trim().toUpperCase().replace(/[\s-]+/g, '')
  const match = compact.match(/^(XII|XI|X)([A-Z])$/)
  return match ? `${match[1]}-${match[2]}` : ''
}
