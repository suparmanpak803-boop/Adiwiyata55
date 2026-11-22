// SK Kader Adiwiyata — khusus petugas (dan admin).
//
// PDF-nya disimpan di private/dokumen/ (BUKAN public/) dan hanya
// disajikan lewat route ini, yang memeriksa sesi + peran lewat
// requirePortalRole. Pengunjung dan pengguna yang belum login
// mendapat 401/403 dan tidak pernah menerima isi file.
//
// File di sini adalah versi web dari SK asli (14 halaman hasil
// pindai, dikompres ke ±3,4 MB pada 120 dpi grayscale agar muat
// dalam batas respons serverless; isi, tanda tangan, dan stempel
// tetap terbaca). SK asli 10,7 MB tetap tersimpan di arsip user.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { requirePortalRole } from '@/lib/auth/access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FILE_NAME = 'sk-kader-adiwiyata-2026-2027.pdf'

export async function GET() {
  try {
    await requirePortalRole(['petugas', 'admin'])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ galat: true, kode: 'BELUM_LOGIN', pesan: 'Silakan login kembali.' }, { status: 401 })
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ galat: true, kode: 'AKSES_DITOLAK', pesan: 'Dokumen ini hanya untuk petugas Adiwiyata.' }, { status: 403 })
    }
    console.error('[api/petugas/dokumen/sk-kader]', error)
    return NextResponse.json({ galat: true, kode: 'DOKUMEN_GAGAL', pesan: 'Dokumen belum dapat dibuka.' }, { status: 500 })
  }

  try {
    const file = await fs.readFile(path.join(process.cwd(), 'private', 'dokumen', FILE_NAME))
    return new Response(file, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="SK-Kader-Adiwiyata-2026-2027.pdf"`,
        'Content-Length': String(file.byteLength),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[api/petugas/dokumen/sk-kader] file', error)
    return NextResponse.json({ galat: true, kode: 'DOKUMEN_GAGAL', pesan: 'Dokumen belum dapat dibuka.' }, { status: 500 })
  }
}
