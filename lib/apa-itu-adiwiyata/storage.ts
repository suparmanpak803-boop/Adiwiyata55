// Penyimpanan progres kampanye "Apa itu Adiwiyata" di localStorage.
// Skema berversi: kunci 'aia-save-v1' + field version di dalam save.
// Semua akses localStorage dibungkus try/catch: aman bila window tidak ada
// (render server), storage penuh, atau data rusak.

import { CHAPTER_ORDER } from './chapters'
import { freshDunia, type DuniaHidup } from './dunia-hidup'
import { TUGAS_ORDER } from './types'
import type { CampaignSave, Carryover, ChapterId, ChapterProgress, StageProgress, TugasKaderId, TugasProgress } from './types'

export const SAVE_KEY = 'aia-save-v1'
export const SAVE_VERSION = 1 as const

function freshStage(status: StageProgress['status']): StageProgress {
  return { status, bestScore: 0 }
}

function freshChapter(firstStageOpen: boolean): ChapterProgress {
  return {
    stages: [
      freshStage(firstStageOpen ? 'open' : 'locked'),
      freshStage('locked'),
      freshStage('locked'),
    ],
    done: false,
    badgeEarned: false,
  }
}

/** Cermin freshChapter: semua Misi Kader mulai dengan tahap pertama terbuka. */
function freshTugas(): TugasProgress {
  return {
    stages: [freshStage('open'), freshStage('locked'), freshStage('locked')],
    done: false,
    badgeEarned: false,
  }
}

export function freshSave(nickname = ''): CampaignSave {
  const chapters = {} as Record<ChapterId, ChapterProgress>
  for (const id of CHAPTER_ORDER) {
    chapters[id] = freshChapter(id === 'gerbang')
  }
  const tugas = {} as Record<TugasKaderId, TugasProgress>
  for (const id of TUGAS_ORDER) {
    tugas[id] = freshTugas()
  }
  return {
    version: SAVE_VERSION,
    nickname,
    hideName: false,
    /** Permainan baru belum memilih karakter (null) — pemilih tampil di
     * Layar Awal sebelum tombol mulai. */
    jenisKelamin: null,
    coins: 0,
    streak: { count: 0, lastDay: null, multiplierActive: false },
    chapters,
    tugas,
    bestScores: {},
    unlockedCards: [],
    badges: [],
    report: { sampah: 0, energi: 0, air: 0, hijau: 0, biodiversitas: 0 },
    carryover: { maggotKenaMinyak: false, komposBau: false },
    species: [],
    muted: false,
    volumeMusik: 0.7,
    volumeEfek: 0.9,
    modeSatuKetukan: false,
    dunia: freshDunia(),
    cerita: {},
    pakPlastik: 'netral',
    arkade: { tangkap: 0, kuis: 0 },
    lapar: 100,
    haus: 100,
    uang: 0,
    koinDaun: 0,
    inventaris: [],
    kostumDipakai: null,
    pohonDitanam: 0,
    bekalTanggal: null,
    bekalDipakai: 0,
    hadiahTerakhir: null,
    hadiahSiklus: 1,
    skorAdiwiyata: 0,
    sepatuEco: false,
    pinDuta: false,
    panelSurya: false,
    petaAktif: 'rumah',
    ibuTanggal: null,
    kasurTanggal: null,
    sampahDibawa: {},
    completedAt: null,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Apakah save ini punya progres yang layak dilanjutkan (bukan permainan
 * baru)? Dipakai Layar Awal: ada progres -> tampil "Lanjutkan" +
 * "Mulai dari Awal" (dengan konfirmasi); belum ada -> tombol utama "Mulai".
 * Nama panggilan saja belum dihitung progres — pemain yang baru mengisi nama
 * tetap mendapat "Mulai". Nilai awal dunia (maggot lapar 20, sampah liar 3,
 * petak tahap 0) bukan progres; perubahan dari nilai itulah yang dihitung.
 */
export function hasProgress(save: CampaignSave): boolean {
  for (const id of CHAPTER_ORDER) {
    if (save.chapters[id].stages.some((s) => s.status === 'done')) return true
  }
  for (const id of TUGAS_ORDER) {
    const t = save.tugas?.[id]
    if (t?.stages?.some((s) => s.status === 'done')) return true
  }
  if (save.coins > 0) return true
  if (
    save.badges.length > 0 ||
    save.unlockedCards.length > 0 ||
    save.species.length > 0
  ) {
    return true
  }
  if ((save.streak?.count ?? 0) > 0) return true
  if ((save.uang ?? 0) > 0 || (save.koinDaun ?? 0) > 0) return true
  if (Object.values(save.sampahDibawa ?? {}).some((n) => n > 0)) return true
  if ((save.inventaris?.length ?? 0) > 0 || (save.pohonDitanam ?? 0) > 0) return true
  if ((save.skorAdiwiyata ?? 0) > 0 || save.sepatuEco || save.pinDuta || save.panelSurya) return true
  if ((save.lapar ?? 100) < 100 || (save.haus ?? 100) < 100) return true
  if ((save.hadiahTerakhir ?? null) !== null) return true
  if (save.completedAt !== null) return true
  if (Object.keys(save.cerita ?? {}).length > 0 || save.pakPlastik !== 'netral') return true
  const dunia = save.dunia
  if (dunia) {
    if (dunia.petak.some((p) => p.tahap > 0 || p.layu)) return true
    if (dunia.maggot.tahap > 0 || dunia.maggot.kaliDiberiMakan > 0 || dunia.maggot.lapar !== 20) return true
    if (dunia.sampahLiar !== 3) return true
  }
  return false
}

/** Cek bentuk save secara longgar; data yang gagal cek dianggap rusak. */
export function isSaveValid(value: unknown): value is CampaignSave {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<CampaignSave>
  if (v.version !== SAVE_VERSION) return false
  if (typeof v.nickname !== 'string') return false
  if (typeof v.coins !== 'number' || Number.isNaN(v.coins)) return false
  if (typeof v.chapters !== 'object' || v.chapters === null) return false
  for (const id of CHAPTER_ORDER) {
    const chapter = (v.chapters as Partial<Record<ChapterId, ChapterProgress>>)[id]
    if (!chapter || !Array.isArray(chapter.stages) || chapter.stages.length !== 3) return false
    for (const stage of chapter.stages) {
      if (!stage || typeof stage.bestScore !== 'number') return false
      if (stage.status !== 'locked' && stage.status !== 'open' && stage.status !== 'done') return false
    }
  }
  if (typeof v.report !== 'object' || v.report === null) return false
  if (typeof v.carryover !== 'object' || v.carryover === null) return false
  if (!Array.isArray(v.unlockedCards) || !Array.isArray(v.badges) || !Array.isArray(v.species)) return false
  // B-8: streak + tugas juga diperiksa — save korup berisi streak/tugas
  // null sebelumnya lolos cek ini, lalu menimpa default segar di loadSave
  // dan membuat hasProgress melempar (layar putih).
  if (!isStreakValid(v.streak)) return false
  if (!isTugasValid(v.tugas)) return false
  return true
}

/** Bentuk `streak` yang sehat: count angka, lastDay string/null, pengali boolean.
 * Field yang TIDAK ADA (save lama) diterima — default diisi gabungan di loadSave;
 * yang ditolak hanya yang ada tapi bentuknya rusak (mis. null). */
function isStreakValid(value: unknown): value is CampaignSave['streak'] {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<CampaignSave['streak']>
  if (typeof s.count !== 'number' || Number.isNaN(s.count)) return false
  if (typeof s.lastDay !== 'string' && s.lastDay !== null) return false
  if (typeof s.multiplierActive !== 'boolean') return false
  return true
}

/** Bentuk `tugas` yang sehat: tiap Misi Kader punya 3 tahap valid (cermin cek chapters).
 * Field yang TIDAK ADA (save lama) diterima — default diisi gabungan di loadSave;
 * yang ditolak hanya yang ada tapi bentuknya rusak (mis. null). */
function isTugasValid(value: unknown): value is CampaignSave['tugas'] {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null) return false
  const t = value as Partial<Record<TugasKaderId, TugasProgress>>
  for (const id of TUGAS_ORDER) {
    const tugas = t[id]
    if (!tugas || !Array.isArray(tugas.stages) || tugas.stages.length !== 3) return false
    for (const stage of tugas.stages) {
      if (!stage || typeof stage.bestScore !== 'number') return false
      if (stage.status !== 'locked' && stage.status !== 'open' && stage.status !== 'done') return false
    }
  }
  return true
}

export function loadSave(): CampaignSave {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return freshSave()
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return freshSave()
    const parsed: unknown = JSON.parse(raw)
    if (!isSaveValid(parsed)) return freshSave()
    // Gabung dengan default baru: save lama (tanpa field volume) tetap
    // bisa dimuat; field yang belum ada memakai nilai default.
    const merged = { ...freshSave(), ...parsed }
    // Pengaman sempit untuk field baru: bila `dunia` tersimpan tapi bentuknya
    // rusak (mis. diedit manual), ganti bagian itu saja dengan default baru
    // supaya UI Dunia Hidup tidak crash — sisa progres tetap dipertahankan.
    // isSaveValid sengaja TIDAK diubah: save lama tanpa `dunia` tetap valid
    // dan mendapat default dari gabungan di atas.
    if (!isDuniaValid(merged.dunia)) merged.dunia = freshDunia()
    // Normalisasi carryover (B-14): flag `kebunLayu` yang sudah dihapus
    // tidak lagi dibaca — save lama yang masih menyimpannya dibersihkan
    // ke dua flag yang masih berlaku, supaya tidak ada kunci mati yang
    // tersisa di save tersimpan.
    merged.carryover = {
      maggotKenaMinyak: (merged.carryover as Partial<Carryover> | null)?.maggotKenaMinyak === true,
      komposBau: (merged.carryover as Partial<Carryover> | null)?.komposBau === true,
    }
    // Normalisasi field baru Dunia Hidup (K-5): save lama tanpa
    // `terakhirPanenKasgot` tetap valid (isDuniaValid tidak mewajibkannya)
    // dan mendapat 0 di sini (= belum pernah panen kasgot).
    if (typeof merged.dunia.maggot.terakhirPanenKasgot !== 'number') {
      merged.dunia = {
        ...merged.dunia,
        maggot: { ...merged.dunia.maggot, terakhirPanenKasgot: 0 },
      }
    }
    // B-8: pengaman streak/tugas — bila bentuknya rusak (mis. null dari
    // save yang diedit manual), ganti bagian itu saja dengan default baru
    // supaya hasProgress tidak melempar; sisa progres tetap dipertahankan.
    if (!isStreakValid(merged.streak)) {
      merged.streak = { count: 0, lastDay: null, multiplierActive: false }
    }
    if (!isTugasValid(merged.tugas)) {
      const tugasBaru = {} as Record<TugasKaderId, TugasProgress>
      for (const id of TUGAS_ORDER) {
        tugasBaru[id] = freshTugas()
      }
      merged.tugas = tugasBaru
    }
    if (typeof merged.cerita !== 'object' || merged.cerita === null) merged.cerita = {}
    if (
      merged.pakPlastik !== 'netral' &&
      merged.pakPlastik !== 'dibujuk' &&
      merged.pakPlastik !== 'dilawan' &&
      merged.pakPlastik !== 'dijebak'
    ) {
      merged.pakPlastik = 'netral'
    }
    if (
      typeof merged.arkade !== 'object' ||
      merged.arkade === null ||
      typeof merged.arkade.tangkap !== 'number' ||
      typeof merged.arkade.kuis !== 'number'
    ) {
      merged.arkade = { tangkap: 0, kuis: 0 }
    }
    // Pengaman jenis kelamin: save lama TANPA field ini (kunci tidak ada
    // di data tersimpan) mendapat default 'siswa' supaya pemain lama tidak
    // dipaksa memilih; permainan baru yang tersimpan dengan null tetap null
    // supaya pemilih karakter tetap tampil; nilai rusak juga jadi 'siswa'.
    const jenisKelaminTersimpan = (parsed as Partial<CampaignSave>).jenisKelamin
    if (jenisKelaminTersimpan === 'siswa' || jenisKelaminTersimpan === 'siswi') {
      merged.jenisKelamin = jenisKelaminTersimpan
    } else if (jenisKelaminTersimpan === null) {
      merged.jenisKelamin = null
    } else {
      merged.jenisKelamin = 'siswa'
    }
    // Pengaman field kantin (lapar/haus/uang/Koin Daun/inventaris/kostum/
    // pohon/bekal): save lama tanpa field ini mendapat default dari
    // gabungan di atas; bila bentuknya rusak, ganti bagian itu saja.
    const angka = (v: unknown, def: number): number =>
      typeof v === 'number' && !Number.isNaN(v) ? v : def
    merged.lapar = Math.max(0, Math.min(100, Math.round(angka(merged.lapar, 100))))
    merged.haus = Math.max(0, Math.min(100, Math.round(angka(merged.haus, 100))))
    merged.uang = Math.max(0, Math.round(angka(merged.uang, 0)))
    merged.koinDaun = Math.max(0, Math.round(angka(merged.koinDaun, 0)))
    merged.pohonDitanam = Math.max(0, Math.round(angka(merged.pohonDitanam, 0)))
    merged.bekalDipakai = Math.max(0, Math.round(angka(merged.bekalDipakai, 0)))
    if (!Array.isArray(merged.inventaris)) merged.inventaris = []
    if (typeof merged.kostumDipakai !== 'string' && merged.kostumDipakai !== null) merged.kostumDipakai = null
    if (typeof merged.bekalTanggal !== 'string' && merged.bekalTanggal !== null) merged.bekalTanggal = null
    // Pengaman Hadiah Harian: save lama tanpa field ini mendapat default
    // dari gabungan di atas; bila bentuknya rusak, kembalikan ke awal siklus.
    if (typeof merged.hadiahTerakhir !== 'string' && merged.hadiahTerakhir !== null) merged.hadiahTerakhir = null
    if (
      typeof merged.hadiahSiklus !== 'number' ||
      !Number.isInteger(merged.hadiahSiklus) ||
      merged.hadiahSiklus < 1 ||
      merged.hadiahSiklus > 7
    ) {
      merged.hadiahSiklus = 1
    }
    // Pengaman Peta: save lama tanpa field ini tetap membuka dunia
    // sekolah (perilaku lama) — kini sebagai peta Gerbang; nilai lama
    // 'sekolah' dipetakan ke 'gerbang'; nilai rusak juga jadi 'gerbang'.
    // Permainan baru (freshSave) memakai 'rumah'.
    const petaTersimpan: unknown = (parsed as Partial<CampaignSave>).petaAktif
    const PETA_VALID = ['rumah', 'gerbang', 'kantin', 'kebun', 'maggot', 'taman']
    merged.petaAktif =
      petaTersimpan === 'sekolah'
        ? 'gerbang'
        : typeof petaTersimpan === 'string' && PETA_VALID.includes(petaTersimpan)
          ? (petaTersimpan as CampaignSave['petaAktif'])
          : 'gerbang'
    // Pengaman uang saku Ibu: hanya tanggal lokal YYYY-MM-DD atau null.
    const ibuTersimpan = (parsed as Partial<CampaignSave>).ibuTanggal
    merged.ibuTanggal =
      typeof ibuTersimpan === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ibuTersimpan) ? ibuTersimpan : null
    // Pengaman kasur (B-7): pola yang sama seperti ibuTanggal.
    const kasurTersimpan = (parsed as Partial<CampaignSave>).kasurTanggal
    merged.kasurTanggal =
      typeof kasurTersimpan === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(kasurTersimpan) ? kasurTersimpan : null
    // Pengaman sampah dibawa: save lama tanpa field ini -> {}; bentuk rusak
    // atau jumlah bukan angka positif dibuang, sisanya dipertahankan.
    const dibawaTersimpan = (parsed as Partial<CampaignSave>).sampahDibawa
    if (
      typeof dibawaTersimpan !== 'object' ||
      dibawaTersimpan === null ||
      Array.isArray(dibawaTersimpan)
    ) {
      merged.sampahDibawa = {}
    } else {
      const bersih: Record<string, number> = {}
      for (const [k, v] of Object.entries(dibawaTersimpan)) {
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) bersih[k] = Math.floor(v)
      }
      merged.sampahDibawa = bersih
    }
    // Pengaman Eco-Shop & Skor Adiwiyata: save lama tanpa field ini
    // mendapat skor dari pohon yang sudah ditanam (pohon*5, 0 bila belum
    // ada pohon) dan ketiga flag false; nilai rusak juga jatuh ke default
    // yang sama. Skor dari misi/panel lama sengaja tidak dihitung ulang —
    // spek menghitung save lama hanya dari pohon.
    const skorTersimpan = (parsed as Partial<CampaignSave>).skorAdiwiyata
    merged.skorAdiwiyata =
      typeof skorTersimpan === 'number' && Number.isFinite(skorTersimpan) && skorTersimpan >= 0
        ? Math.floor(skorTersimpan)
        : Math.max(0, Math.round(angka(merged.pohonDitanam, 0))) * 5
    merged.sepatuEco = (parsed as Partial<CampaignSave>).sepatuEco === true
    merged.pinDuta = (parsed as Partial<CampaignSave>).pinDuta === true
    merged.panelSurya = (parsed as Partial<CampaignSave>).panelSurya === true
    return merged
  } catch {
    // JSON rusak, storage tidak bisa dibaca, atau mode privat yang menolak akses.
    return freshSave()
  }
}

/** Cek bentuk `dunia` secara longgar; dipakai loadSave sebagai pengaman. */
function isDuniaValid(value: unknown): value is DuniaHidup {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Partial<DuniaHidup>
  if (!Array.isArray(d.petak) || d.petak.length !== 3) return false
  for (const p of d.petak) {
    if (!p || typeof p.id !== 'string' || typeof p.jenis !== 'string') return false
    if (typeof p.tahap !== 'number' || typeof p.layu !== 'boolean') return false
    if (typeof p.terakhirDisiram !== 'number' || typeof p.ditanam !== 'number') return false
  }
  if (typeof d.maggot !== 'object' || d.maggot === null) return false
  const m = d.maggot as Partial<DuniaHidup['maggot']>
  if (typeof m.lapar !== 'number' || typeof m.tahap !== 'number' || typeof m.kaliDiberiMakan !== 'number') return false
  if (typeof d.sampahLiar !== 'number' || typeof d.hariTerakhirKunjung !== 'string') return false
  return true
}

export function saveSave(save: CampaignSave): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // Storage penuh atau tidak bisa ditulis: progres tetap jalan di memori
    // selama tab terbuka, tapi tidak tersimpan.
  }
}
