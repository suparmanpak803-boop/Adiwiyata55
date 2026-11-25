// Data dunia mode "Jelajah" — PINDAH ke lib/apa-itu-adiwiyata/content/peta.ts.
// File ini hanya shim kompatibilitas: `misi.ts` (dan agen lain) tetap bisa
// mengimpor NPCS / tipe dari './dunia' apa adanya.
//
// DUNIA lama (satu peta 960x640) SUDAH TIDAK ADA. Jangan pakai alias di
// bawah untuk logika baru — pakai PETA dari './content/peta'. Alias hanya
// supaya impor lama tidak crash: DUNIA = peta Gerbang (hub) dengan bentuk
// lama { lebar, tinggi, spawn, zona, dinding, sampah }.
import { PETA, cariTitik } from './content/peta'
import type { Dinding, IdTitikInteraksi, NpcDunia, PortalPeta, SampahJatuh, ZonaDunia } from './content/peta'

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
  // C-37: tanpa cast — bila portal hilang dari peta, gagal dengan pesan
  // yang jelas, bukan crash `undefined.x` yang sulit dilacak.
  const portal = PETA.gerbang.portal.find((p) => p.id === 'jalan-pulang')
  if (!portal) throw new Error("Portal 'jalan-pulang' tidak ditemukan di PETA.gerbang")
  return { x: portal.x, y: portal.y, w: portal.w, h: portal.h }
})()

/** Ambil titik peta — throw dengan pesan jelas bila titiknya hilang. */
function titikWajib(
  peta: (typeof PETA)['gerbang'],
  id: IdTitikInteraksi,
): { x: number; y: number } {
  const titik = cariTitik(peta, id)
  if (!titik) throw new Error(`Titik '${id}' tidak ditemukan di peta`)
  return titik
}

/** @deprecated Tempat Sampah Terpilah kini titik 'pilah' di PETA.gerbang. */
export const TEMPAT_PILAH: { x: number; y: number } = titikWajib(PETA.gerbang, 'pilah')

/** @deprecated Bank Sampah kini titik 'bank-sampah' di PETA.kebun. */
export const BANK_SAMPAH: { x: number; y: number } = titikWajib(PETA.kebun, 'bank-sampah')

/** @deprecated Booth Eco-Shop kini titik 'eco-shop' di PETA.kebun. */
export const ECO_SHOP: { x: number; y: number } = titikWajib(PETA.kebun, 'eco-shop')
