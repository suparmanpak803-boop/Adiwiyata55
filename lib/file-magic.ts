// Pemeriksaan magic bytes untuk upload (L-03): MIME yang diklaim klien
// bisa dipalsukan, isi berkas tidak. Dipakai route upload laporan dan
// dokumen admin. Pola yang sama sudah dipakai upload slider
// (app/actions/slider.ts).
export function matchesMagicBytes(buf: Buffer, type: string): boolean {
  const starts = (bytes: number[]) => buf.length >= bytes.length && bytes.every((byte, index) => buf[index] === byte)
  switch (type) {
    case 'image/jpeg':
      return starts([0xff, 0xd8, 0xff])
    case 'image/png':
      return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/webp':
      return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'
    case 'application/pdf':
      return buf.length >= 4 && buf.toString('ascii', 0, 4) === '%PDF'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      // OOXML = arsip ZIP.
      return starts([0x50, 0x4b, 0x03, 0x04])
    case 'application/msword':
    case 'application/vnd.ms-excel':
    case 'application/vnd.ms-powerpoint':
      // Format Office lama (OLE Compound Document).
      return starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    default:
      return false
  }
}
