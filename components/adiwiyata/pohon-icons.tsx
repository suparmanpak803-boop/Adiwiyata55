// Ikon garis "Pohon Adiwiyata" — satu gaya untuk semua ikon:
// SVG inline, ketebalan garis sama (1.8), ujung garis membulat,
// warna mengikuti teks di sekitarnya (currentColor).
// Semua ikon dekoratif: selalu render dengan aria-hidden="true".

import type { ComponentType } from 'react'
import type { IkonTim } from '@/lib/struktur-petugas-data'

type IkonProps = { className?: string }

function Garis({ className, children }: IkonProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function PohonIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M12 21v-7" />
      <path d="M12 3c-3.2 0-5.5 2.4-5.5 5.4 0 .9.2 1.7.6 2.4-1.8.6-3.1 2.1-3.1 3.9 0 2.1 1.8 3.8 4 3.8h8c2.2 0 4-1.7 4-3.8 0-1.8-1.3-3.3-3.1-3.9.4-.7.6-1.5.6-2.4C17.5 5.4 15.2 3 12 3z" />
      <path d="M6 21h12" />
    </Garis>
  )
}

export function DaunIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M5 19C5 9.5 11 4.5 20 4.5 20 13.5 14.5 19 5 19z" />
      <path d="M5 19c4-4 8-8 12-12" />
    </Garis>
  )
}

export function TetesanIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" />
      <path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5" />
    </Garis>
  )
}

export function DaurUlangIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9" />
      <path d="M20.5 3.5v4h-4" />
      <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9" />
      <path d="M3.5 20.5v-4h4" />
      <path d="M12 3.5v3" />
    </Garis>
  )
}

export function MatahariIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Garis>
  )
}

export function BungaIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 3.5c1.8 2.3 1.8 4.7 0 6-1.8-1.3-1.8-3.7 0-6z" />
      <path d="M12 3.5c1.8 2.3 1.8 4.7 0 6-1.8-1.3-1.8-3.7 0-6z" transform="rotate(72 12 12)" />
      <path d="M12 3.5c1.8 2.3 1.8 4.7 0 6-1.8-1.3-1.8-3.7 0-6z" transform="rotate(144 12 12)" />
      <path d="M12 3.5c1.8 2.3 1.8 4.7 0 6-1.8-1.3-1.8-3.7 0-6z" transform="rotate(216 12 12)" />
      <path d="M12 3.5c1.8 2.3 1.8 4.7 0 6-1.8-1.3-1.8-3.7 0-6z" transform="rotate(288 12 12)" />
      <path d="M12 13.5V21" />
    </Garis>
  )
}

export function TunasIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M12 21v-9" />
      <path d="M12 12c-4 0-6.5-2.5-6.5-6.5C9.5 5.5 12 8 12 12z" />
      <path d="M12 12c4 0 6.5-2.5 6.5-6.5C14.5 5.5 12 8 12 12z" />
    </Garis>
  )
}

export function PetirIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10H12l1-8z" />
    </Garis>
  )
}

export function MangkukIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M3 12h18" />
      <path d="M4.5 12a7.5 7.5 0 0 0 15 0" />
      <path d="M9.5 20.5h5" />
      <path d="M9.5 8.5c0-1.8 1.8-1.8 1.8-3.5" />
      <path d="M14.5 8.5c0-1.8 1.8-1.8 1.8-3.5" />
    </Garis>
  )
}

export function CariIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Garis>
  )
}

export function ChevronBawahIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M6 9l6 6 6-6" />
    </Garis>
  )
}

export function TutupIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Garis>
  )
}

export function OrangIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.8-3.8 3.9-5.5 7.5-5.5s6.7 1.7 7.5 5.5" />
    </Garis>
  )
}

export function GrafikIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M4 20h16" />
      <path d="M8 20v-6" />
      <path d="M12 20V9" />
      <path d="M16 20v-9" />
    </Garis>
  )
}

export function PesanIcon({ className }: IkonProps) {
  return (
    <Garis className={className}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8 9.5h8" />
      <path d="M8 13.5h5" />
    </Garis>
  )
}

// Pemeta ikon tiap tim — dipakai komponen StrukturPohon.
export const ikonTim: Record<IkonTim, ComponentType<IkonProps>> = {
  'daur-ulang': DaurUlangIcon,
  taman: TunasIcon,
  'air-energi': TetesanIcon,
  kantin: MangkukIcon,
  kompos: DaunIcon,
  pohon: PohonIcon,
  bunga: BungaIcon,
  tunas: TunasIcon,
  matahari: MatahariIcon,
  petir: PetirIcon,
  daun: DaunIcon,
  grafik: GrafikIcon,
  pesan: PesanIcon,
}
