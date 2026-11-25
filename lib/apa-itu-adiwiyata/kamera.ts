// Kamera halus untuk peta Jelajah dan Rumah — dipakai bersama supaya
// polanya sama di kedua tempat.
//
// - Smoothing eksponensial `1 − exp(−rate·dt)` (rate 7/detik): kamera
//   mengejar target dengan mulus, bukan hard-follow.
// - Deadzone ±24px: kamera tidak ikut mikro-gerak joystick/keyboard —
//   pemain boleh bergeser sedikit tanpa kamera bergoyang.
// - Look-ahead ringan 36px searah gerak pemain, supaya arah jalan
//   terlihat lebih dulu.
// - Hard-cut + reset smoothing saat pindah peta: kamera langsung ke
//   posisi baru, tidak "terbang" menyeberang peta.
// - Clamp ke batas peta tetap dipertahankan (jepitKamera).

/**
 * Jepit posisi kamera ke dalam peta. Bila pandang lebih besar dari dunia,
 * kamera diam di 0 (peta tidak digeser ke koordinat negatif) — pemusatan
 * peta di dalam pandang yang lebih lebar ditangani `offsetPusat` di
 * pemanggil, bukan dengan kamera negatif (lihat K-1: kamera negatif
 * membuat aktor bergeser terhadap latar statis).
 */
export function jepitKamera(nilai: number, pandang: number, dunia: number): number {
  if (pandang >= dunia) return 0
  return Math.max(0, Math.min(nilai, dunia - pandang))
}

/**
 * Geser layar (px) supaya peta yang lebih kecil dari pandang tampil di
 * tengah, bukan menempel di tepi kiri/atas. 0 bila pandang muat di peta.
 * Dipakai pemanggil sebagai `translate(offset - cam, ...)` dan sebagai
 * koreksi konversi ketukan (`wx = pos.x - offset + camX`).
 */
export function offsetPusat(pandang: number, dunia: number): number {
  return pandang > dunia ? (pandang - dunia) / 2 : 0
}

/** Keadaan kamera yang dipegang satu ref per peta. */
export interface KameraHalus {
  x: number
  y: number
  /** false = belum pernah diposisikan (frame pertama / habis pindah peta):
   * pemanggilan berikutnya hard-cut ke target, tanpa smoothing. */
  siap: boolean
}

export function buatKamera(): KameraHalus {
  return { x: 0, y: 0, siap: false }
}

/** Pindah peta: kamera berikutnya langsung ke posisi baru. */
export function resetKamera(kam: KameraHalus): void {
  kam.siap = false
}

const RATE_KAMERA = 7
const DEADZONE_KAMERA = 24
const LIHAT_DEPAN = 36

/**
 * Majukan kamera satu frame menuju target (posisi pemain + look-ahead).
 * `gerakX`/`gerakY` = arah gerak pemain ternormalisasi (0,0 bila diam).
 * `dt` dalam detik.
 */
export function perbaruiKamera(
  kam: KameraHalus,
  targetX: number,
  targetY: number,
  pandangW: number,
  pandangH: number,
  duniaW: number,
  duniaH: number,
  dt: number,
  gerakX: number,
  gerakY: number,
): void {
  const tx = jepitKamera(targetX - pandangW / 2 + gerakX * LIHAT_DEPAN, pandangW, duniaW)
  const ty = jepitKamera(targetY - pandangH / 2 + gerakY * LIHAT_DEPAN, pandangH, duniaH)
  if (!kam.siap) {
    kam.x = tx
    kam.y = ty
    kam.siap = true
    return
  }
  const k = 1 - Math.exp(-RATE_KAMERA * Math.max(0, dt))
  if (Math.abs(tx - kam.x) > DEADZONE_KAMERA) kam.x += (tx - kam.x) * k
  if (Math.abs(ty - kam.y) > DEADZONE_KAMERA) kam.y += (ty - kam.y) * k
}
