// Data dunia mode "Jelajah" — PINDAH ke lib/apa-itu-adiwiyata/content/peta.ts.
// File ini hanya shim kompatibilitas: `misi.ts` (dan agen lain) tetap bisa
// mengimpor NPCS / tipe dari './dunia' apa adanya.
//
// DUNIA lama (satu peta 960x640) SUDAH TIDAK ADA. Jangan pakai alias di
// bawah untuk logika baru — pakai PETA dari './content/peta'. Alias hanya
// supaya impor lama tidak crash: DUNIA = peta Gerbang (hub) dengan bentuk
// lama { lebar, tinggi, spawn, zona, dinding, sampah }.
import { PETA, cariTitik } from './content/peta'
import type { Dinding, NpcDunia, PortalPeta, SampahJatuh, ZonaDunia } from './content/peta'

export { PETA, PETA_ORDER, NPCS, cariTitik, petaUntukNpc } from './content/peta'
export type { Dinding, NpcDunia, PortalPeta, SampahJatuh, ZonaDunia } from './content/peta'
export type { IdTitikInteraksi, PetaDunia, PetaId, TitikInteraksi } from './content/peta'

/** @deprecated Pakai PETA['gerbang'] dari './content/peta'. */
export const DUNIA: {
  lebar: number
  tinggi: number
  spawn: { x: number; y: number }
  zona: ZonaDunia[]
  dinding: Dinding[]
  sampah: SampahJatuh[]
} = {
  lebar: PETA.gerbang.lebar,
  tinggi: PETA.gerbang.tinggi,
  spawn: PETA.gerbang.spawn,
  zona: PETA.gerbang.zona,
  dinding: PETA.gerbang.dinding,
  sampah: PETA.gerbang.sampah,
}

/** @deprecated Portal "Jalan Pulang" kini PETA.gerbang.portal. */
export const JALAN_PULANG: { x: number; y: number; w: number; h: number } = (() => {
  const portal = PETA.gerbang.portal.find((p) => p.id === 'jalan-pulang') as PortalPeta
  return { x: portal.x, y: portal.y, w: portal.w, h: portal.h }
})()

/** @deprecated Tempat Sampah Terpilah kini titik 'pilah' di PETA.gerbang. */
export const TEMPAT_PILAH: { x: number; y: number } = cariTitik(PETA.gerbang, 'pilah') as { x: number; y: number }

/** @deprecated Bank Sampah kini titik 'bank-sampah' di PETA.kebun. */
export const BANK_SAMPAH: { x: number; y: number } = cariTitik(PETA.kebun, 'bank-sampah') as { x: number; y: number }

/** @deprecated Booth Eco-Shop kini titik 'eco-shop' di PETA.kebun. */
export const ECO_SHOP: { x: number; y: number } = cariTitik(PETA.kebun, 'eco-shop') as { x: number; y: number }
