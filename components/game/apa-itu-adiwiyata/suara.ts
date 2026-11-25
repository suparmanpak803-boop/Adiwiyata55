// AudioManager terpusat kampanye "Apa itu Adiwiyata" (singleton, satu file).
//
// SEMUA suara disintesis dengan Web Audio API (oscillator + noise), TANPA file
// audio mp3/ogg: total aset suara 0 byte (di bawah batas 3 MB), tanpa masalah
// lisensi, tanpa CREDITS.md untuk audio.
//
// - AudioContext dibuat malas saat interaksi pertama (tidak ada autoplay
//   sebelum pengguna menyentuh sesuatu). Semua fungsi tidak pernah throw bila
//   audio diblokir (try/catch di semua jalur).
// - Pengaturan volume/mute disimpan di save kampanye (localStorage
//   'aia-save-v1'), bukan kunci kedua. Provider memanggil syncSettings()
//   setiap pengaturan berubah; manager hanya menyimpan cache di memori.
// - Manager mendengarkan visibilitychange sendiri: musik dijeda (context
//   di-suspend) saat tab tidak aktif, lanjut saat kembali.
// - Musik latar generatif: loop sederhana per mode (pad chord + arpeggio),
//   gain terpisah untuk musik vs efek, supaya volume keduanya bisa diatur
//   sendiri-sendiri.
//
// AKSESIBILITAS: suara TIDAK PERNAH menjadi satu-satunya penanda. Setiap SFX
// penting (benar/salah/koin/nyawa) harus selalu dipasangkan komponen dengan
// umpan balik visual (warna, teks, atau animasi). Itu tugas komponen, bukan
// file ini. File ini hanya memastikan suara tidak pernah throw dan bisa
// dimatikan total lewat pengaturan bisu.

export type MusicMode = 'menu' | 'bab1' | 'bab2' | 'bab3' | 'bab4' | 'bab5' | 'bab6' | 'tamat'

interface AudioSettings {
  musik: number
  efek: number
  muted: boolean
}

const settings: AudioSettings = { musik: 0.7, efek: 0.9, muted: false }

let audioCtx: AudioContext | null = null
let musicBus: GainNode | null = null
let sfxBus: GainNode | null = null
/** Gain khusus ducking di antara musicBus dan destination: musik turun
 * −12 dB saat dialog terbuka tanpa menyentuh slider musik pemain dan
 * tanpa mengubah volume SFX (sfxBus langsung ke destination). */
let duckGain: GainNode | null = null
/** Berapa banyak peminta ducking yang sedang aktif (refcount): dialog NPC
 * di Jelajah, dialog pembuka di MisiShell, overlay di runner, dialog di
 * Rumah — masing-masing memanggil duckMusik()/unduckMusik() berpasangan,
 * jadi yang satu menutup tidak membatalkan ducking yang lain. */
let jumlahDuck = 0
/** Level duck saat ini (1 = normal, FAKTOR_DUCK = −12 dB). */
let levelDuck = 1
const FAKTOR_DUCK = Math.pow(10, -12 / 20)
const DURASI_DUCK = 0.25
let noiseBuf: AudioBuffer | null = null

function applyGains(): void {
  if (!audioCtx) return
  const musicVol = settings.muted ? 0 : settings.musik * 0.22
  const sfxVol = settings.muted ? 0 : settings.efek
  try {
    if (musicBus) musicBus.gain.setTargetAtTime(musicVol, audioCtx.currentTime, 0.05)
    if (sfxBus) sfxBus.gain.setTargetAtTime(sfxVol, audioCtx.currentTime, 0.05)
  } catch {
    // Abaikan: gain tidak bisa diatur di perangkat ini.
  }
}

function ensureCtx(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    if (!audioCtx) {
      audioCtx = new AC()
      musicBus = audioCtx.createGain()
      sfxBus = audioCtx.createGain()
      duckGain = audioCtx.createGain()
      duckGain.gain.value = levelDuck
      musicBus.connect(duckGain)
      duckGain.connect(audioCtx.destination)
      sfxBus.connect(audioCtx.destination)
      applyGains()
    }
    if (audioCtx.state === 'suspended') {
      // C-22: jangan resume saat tab tersembunyi — dan jangan jadwalkan
      // SFX baru ke context yang membeku (currentTime berhenti, jadi nada
      // yang dijadwalkan akan berbunyi serentak saat tab kembali aktif).
      // Pemanggil (tone/noise) sudah menangani null dengan diam.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return null
      void audioCtx.resume()
    }
    return audioCtx
  } catch {
    return null
  }
}

/** Terapkan pengaturan volume/mute terbaru (dipanggil provider tiap berubah). */
export function syncSettings(next: Partial<AudioSettings>): void {
  Object.assign(settings, next)
  try {
    applyGains()
  } catch {
    // Diam saja: audio tidak tersedia.
  }
}

/**
 * Terapkan level ducking ke duckGain dengan transisi 0,25 detik (ramp
 * linear = ease yang halus). Dipanggil tiap refcount berubah; bila
 * AudioContext belum dibuat, level tersimpan dan diterapkan saat
 * ensureCtx() membuat node-nya.
 */
function terapkanDuck(): void {
  const target = jumlahDuck > 0 ? FAKTOR_DUCK : 1
  levelDuck = target
  try {
    if (!audioCtx || !duckGain) return
    const t0 = audioCtx.currentTime
    duckGain.gain.cancelScheduledValues(t0)
    duckGain.gain.setValueAtTime(duckGain.gain.value, t0)
    duckGain.gain.linearRampToValueAtTime(target, t0 + DURASI_DUCK)
  } catch {
    // Diam saja: gain tidak bisa diatur di perangkat ini.
  }
}

/**
 * Ducking musik: turunkan musik −12 dB selagi dialog terbuka. Satu
 * peminta = satu hitungan; unduckMusik() yang berpasangan menurunkannya
 * lagi. Tidak menyentuh slider musik pemain (musicBus) maupun SFX.
 * Tidak pernah throw; aman dipanggil sebelum audio dibuat.
 */
export function duckMusik(): void {
  jumlahDuck += 1
  terapkanDuck()
}

/** Kembalikan musik ke volume normal (pasangan duckMusik()). */
export function unduckMusik(): void {
  jumlahDuck = Math.max(0, jumlahDuck - 1)
  terapkanDuck()
}

// Jeda musik saat tab tidak aktif, lanjut saat kembali (listener milik manager).
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    try {
      if (!audioCtx) return
      if (document.visibilityState === 'hidden') {
        if (audioCtx.state === 'running') void audioCtx.suspend()
      } else if (audioCtx.state === 'suspended') {
        void audioCtx.resume()
      }
    } catch {
      // Diam saja.
    }
  })
}

interface ToneOpts {
  type?: OscillatorType
  delay?: number
  volume?: number
  slideTo?: number
  bus?: GainNode | null
  /** Detune dalam semitone (diterapkan ke frekuensi awal dan slideTo). */
  detune?: number
  /** Penguatan tambahan dalam dB (diterapkan ke volume). */
  gainDb?: number
}

/**
 * Variasi SFX yang berulang (ketuk, koin, pilah, ...): tiap pemanggilan
 * memilih satu dari 5 varian (detune ±1 semitone, gain ±2 dB) dan tidak
 * pernah mengulang varian yang sama dua kali berturut-turut per grup —
 * supaya bunyi yang sama tidak terasa mekanis. Volume dasar / mute tidak
 * berubah: variasi hanya menggeser nada dan gain di sekitar nilai dasar.
 */
interface VarianSfx {
  detune: number
  gainDb: number
}

const VARIAN_SFX: VarianSfx[] = [
  { detune: -1, gainDb: -2 },
  { detune: -0.5, gainDb: 2 },
  { detune: 0, gainDb: 0 },
  { detune: 0.5, gainDb: -2 },
  { detune: 1, gainDb: 2 },
]

const varianTerakhir = new Map<string, number>()

function varianSfx(grup: string): VarianSfx {
  let idx = Math.floor(Math.random() * VARIAN_SFX.length)
  if (VARIAN_SFX.length > 1 && idx === varianTerakhir.get(grup)) {
    idx = (idx + 1) % VARIAN_SFX.length
  }
  varianTerakhir.set(grup, idx)
  return VARIAN_SFX[idx]
}

function tone(freq: number, dur: number, opts: ToneOpts = {}): void {
  try {
    const ac = ensureCtx()
    if (!ac || !sfxBus) return
    const dest = opts.bus ?? sfxBus
    const t0 = ac.currentTime + (opts.delay ?? 0)
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const faktorNada = Math.pow(2, (opts.detune ?? 0) / 12)
    const faktorGain = Math.pow(10, (opts.gainDb ?? 0) / 20)
    osc.type = opts.type ?? 'sine'
    osc.frequency.setValueAtTime(Math.max(1, freq * faktorNada), t0)
    if (opts.slideTo)
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo * faktorNada), t0 + dur)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime((opts.volume ?? 0.15) * faktorGain, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(t0)
    osc.stop(t0 + dur + 0.05)
  } catch {
    // Diam saja: suara tidak tersedia di perangkat ini.
  }
}

function getNoise(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    const len = ac.sampleRate
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

interface NoiseOpts {
  type?: BiquadFilterType
  freq?: number
  freqEnd?: number
  q?: number
  delay?: number
  volume?: number
  /** Detune dalam semitone (diterapkan ke frekuensi filter). */
  detune?: number
  /** Penguatan tambahan dalam dB (diterapkan ke volume). */
  gainDb?: number
}

function noise(dur: number, opts: NoiseOpts = {}): void {
  try {
    const ac = ensureCtx()
    if (!ac || !sfxBus) return
    const t0 = ac.currentTime + (opts.delay ?? 0)
    const src = ac.createBufferSource()
    src.buffer = getNoise(ac)
    src.loop = true
    const filter = ac.createBiquadFilter()
    filter.type = opts.type ?? 'bandpass'
    const faktorNada = Math.pow(2, (opts.detune ?? 0) / 12)
    const faktorGain = Math.pow(10, (opts.gainDb ?? 0) / 20)
    filter.frequency.setValueAtTime((opts.freq ?? 1000) * faktorNada, t0)
    if (opts.freqEnd) filter.frequency.exponentialRampToValueAtTime(opts.freqEnd * faktorNada, t0 + dur)
    filter.Q.value = opts.q ?? 1
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime((opts.volume ?? 0.1) * faktorGain, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(sfxBus)
    src.start(t0)
    src.stop(t0 + dur + 0.05)
  } catch {
    // Diam saja.
  }
}

/** Getar (haptic). Diam saja bila perangkat tidak mendukung. */
export function getar(pola: number | number[] = 20): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pola)
  } catch {
    // Diam saja.
  }
}

// ---------------------------------------------------------------- SFX ----

/** Ketukan tombol / aksi kecil. */
export function klik(): void {
  tone(700, 0.05, { volume: 0.1, ...varianSfx('ketuk') })
}

/** Pindah halaman / pindah tab. */
export function pindah(): void {
  tone(520, 0.06, { type: 'triangle', volume: 0.12 })
}

/** Mengambil barang. */
export function ambil(): void {
  const v = varianSfx('ambil')
  tone(600, 0.07, { ...v })
  tone(900, 0.09, { delay: 0.05, ...v })
}

/** Melepas barang. */
export function lepas(): void {
  tone(400, 0.08, { type: 'triangle', volume: 0.12, ...varianSfx('lepas') })
}

/** Jawaban / aksi benar. Nada makin tinggi saat combo naik. */
export function benar(combo = 0): void {
  const naik = Math.min(Math.max(combo, 0), 10)
  const f = 660 * (1 + naik * 0.03)
  const v = varianSfx('benar')
  tone(f, 0.1, { ...v })
  tone(f * 1.335, 0.14, { delay: 0.08, ...v })
  getar(20)
}

/** Jawaban / aksi salah: "bonk" lucu, sawtooth pendek. */
export function salah(): void {
  tone(200, 0.12, { type: 'sawtooth', volume: 0.1 })
  tone(140, 0.16, { type: 'sawtooth', delay: 0.08, volume: 0.1 })
  getar([40, 40, 40])
}

/** Melempar sampah: whoosh (noise sweep naik). */
export function lempar(): void {
  noise(0.25, { freq: 400, freqEnd: 1800, volume: 0.12, ...varianSfx('lempar') })
}

/** Sampah masuk tong: plop (nada turun cepat). */
export function plop(): void {
  tone(300, 0.15, { slideTo: 120, volume: 0.15, ...varianSfx('pilah') })
}

/** Dapat Koin Hijau. */
export function koin(): void {
  const v = varianSfx('koin')
  tone(988, 0.07, { ...v })
  tone(1319, 0.18, { delay: 0.07, ...v })
  getar(15)
}

/** Nyawa berkurang: nada turun. */
export function nyawa(): void {
  tone(440, 0.12)
  tone(330, 0.12, { delay: 0.1 })
  tone(220, 0.2, { delay: 0.2 })
}

/** Lalat: buzz sawtooth bergetar. */
export function lalat(): void {
  tone(240, 0.05, { type: 'sawtooth', volume: 0.06 })
  tone(200, 0.05, { type: 'sawtooth', delay: 0.06, volume: 0.06 })
  tone(240, 0.05, { type: 'sawtooth', delay: 0.12, volume: 0.06 })
}

/** Hujan: noise terfilter singkat. */
export function hujan(): void {
  noise(0.5, { type: 'lowpass', freq: 1200, volume: 0.08 })
}

/** Badai: noise burst + gemuruh rendah. */
export function badai(): void {
  noise(0.8, { type: 'lowpass', freq: 400, volume: 0.2 })
  tone(60, 0.8, { volume: 0.2 })
}

/** Maggot: blip lembut. */
export function maggot(): void {
  tone(500, 0.1, { volume: 0.08 })
  tone(700, 0.12, { delay: 0.08, volume: 0.08 })
}

/** Panen: arpeggio ceria. */
export function panen(): void {
  ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.09 }))
}

/** Menyiram: noise + blip turun. */
export function siram(): void {
  noise(0.4, { freq: 900, volume: 0.08 })
  tone(600, 0.3, { slideTo: 300, volume: 0.06, delay: 0.05 })
}

/** Tanaman tumbuh: arpeggio naik. */
export function tumbuh(): void {
  ;[392, 523, 659, 784].forEach((f, i) => tone(f, 0.14, { delay: i * 0.1 }))
}

/** Burung: chirp, lompatan nada cepat. */
export function burung(): void {
  tone(1800, 0.06, { volume: 0.08 })
  tone(2400, 0.06, { delay: 0.07, volume: 0.08 })
  tone(2000, 0.06, { delay: 0.14, volume: 0.08 })
  tone(2800, 0.09, { delay: 0.21, volume: 0.08 })
}

/** Checkpoint Pos Hijau: nada naik. */
export function bendera(): void {
  ;[523, 659, 784].forEach((f, i) => tone(f, 0.12, { delay: i * 0.1 }))
}

/** Dapat lencana: fanfare pendek. */
export function lencana(): void {
  ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.09 }))
}

/** Naik level: nada naik empat tingkat. */
export function naikLevel(): void {
  ;[440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, { delay: i * 0.09 }))
}

/** Sertifikat: fanfare lebih panjang. */
export function sertifikat(): void {
  ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, { delay: i * 0.13 }))
}

/** Detak timer. Makin cepat (nada lebih tinggi) bila cepat=true. */
export function tik(cepat = false): void {
  tone(cepat ? 1200 : 1000, cepat ? 0.03 : 0.04, {
    volume: cepat ? 0.12 : 0.09,
    ...varianSfx('tik'),
  })
}

/**
 * Gumam karakter gaya Animal Crossing: beberapa blip pendek.
 * Magi bernada lebih tinggi, Pak Plastik lebih rendah.
 */
export function playMumble(karakter: 'Magi' | 'Pak Plastik'): void {
  const dasar = karakter === 'Magi' ? 700 : 220
  const pola = [0, 3, 1, 4]
  pola.forEach((langkah, i) => {
    tone(dasar * (1 + langkah * 0.06), 0.07, { type: 'triangle', delay: i * 0.09, volume: 0.1 })
  })
}

// ------------------------------------------------------- Langkah kaki (R10) ----

/**
 * Langkah kaki: bunyi tapak lembut — noise lowpass singkat + nada rendah
 * yang turun. Kaki kiri/kanan beda sedikit nadanya. Volume pelan (0,05)
 * supaya tidak mengganggu musik; melewati tone()/noise() biasa sehingga
 * mute, volume efek, dan tab tersembunyi dihormati (ensureCtx).
 */
export function langkah(kiri: boolean): void {
  const v = varianSfx('langkah')
  const detune = kiri ? -2 : 2
  noise(0.06, { type: 'lowpass', freq: 350, volume: 0.05, detune, gainDb: v.gainDb })
  tone(kiri ? 95 : 105, 0.07, { slideTo: 65, volume: 0.04, detune })
}

// ------------------------------------------------------- Ambience per peta (R10) ----

// Suara latar ringan tiap peta — Kantin ramai (gumam + denting), Kebun /
// Taman / Gerbang burung sesekali, Pos Maggot dengung pelan. Satu interval
// 1,5 detik; tiap tick peluang kecil berbunyi supaya tidak jadi loop
// mekanis. Volume sangat pelan (0,02–0,04), di bawah musik. Melewati
// tone()/noise() biasa: mute/volume efek dihormati, dan diam saat tab
// tersembunyi (cek visibilityState + ensureCtx).

function ciritBurungPelan(): void {
  tone(1900, 0.05, { volume: 0.035 })
  tone(2500, 0.05, { delay: 0.06, volume: 0.035 })
  tone(2100, 0.08, { delay: 0.12, volume: 0.03 })
}

function gumamKantin(): void {
  noise(0.5, { type: 'bandpass', freq: 500, q: 0.6, volume: 0.025 })
}

function dentingKantin(): void {
  tone(1750, 0.06, { volume: 0.03 })
  tone(1250, 0.08, { delay: 0.05, volume: 0.025 })
}

function dengungMaggot(): void {
  tone(95, 0.6, { type: 'sawtooth', volume: 0.018 })
}

const AMBIENCE_PETA: Record<string, () => void> = {
  kantin: () => {
    if (Math.random() < 0.55) gumamKantin()
    else if (Math.random() < 0.3) dentingKantin()
  },
  kebun: () => {
    if (Math.random() < 0.4) ciritBurungPelan()
  },
  taman: () => {
    if (Math.random() < 0.3) ciritBurungPelan()
  },
  gerbang: () => {
    if (Math.random() < 0.25) ciritBurungPelan()
  },
  maggot: () => {
    if (Math.random() < 0.5) dengungMaggot()
  },
}

let ambienceTimer: ReturnType<typeof setInterval> | null = null
let ambiencePeta: string | null = null

/** Mulai ambience peta tertentu (ganti peta = ganti ambience). Peta tanpa
 * ambience (mis. rumah — hening) hanya menghentikan yang sedang berjalan. */
export function mulaiAmbience(peta: string): void {
  try {
    hentikanAmbience()
    const bunyi = AMBIENCE_PETA[peta]
    if (!bunyi) return
    ambiencePeta = peta
    ambienceTimer = setInterval(() => {
      try {
        if (ambiencePeta !== peta) return
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
        bunyi()
      } catch {
        // Diam saja.
      }
    }, 1500)
  } catch {
    // Diam saja.
  }
}

/** Hentikan ambience apa pun yang sedang berjalan. */
export function hentikanAmbience(): void {
  try {
    if (ambienceTimer) {
      clearInterval(ambienceTimer)
      ambienceTimer = null
    }
    ambiencePeta = null
  } catch {
    // Diam saja.
  }
}

// ------------------------------------------------- Wrapper lama (agen mini-game) ----

/** Bunyi pop pendek (wrapper klik). */
export function playPop(): void {
  tone(880, 0.08, { volume: 0.12, ...varianSfx('ketuk') })
}

/** Wrapper benar(). */
export function playBenar(): void {
  benar()
}

/** Wrapper salah(). */
export function playSalah(): void {
  salah()
}

/** Wrapper panen() (arpeggio menang). */
export function playMenang(): void {
  panen()
}

/** Atur bisu semua suara (wrapper syncSettings). */
export function setSuaraMuted(value: boolean): void {
  syncSettings({ muted: value })
}

// ------------------------------------------------------- Musik latar generatif ----

const midi = (m: number): number => 440 * Math.pow(2, (m - 69) / 12)

interface MusicModeConfig {
  bpm: number
  /** Progresi chord per bar (angka MIDI). */
  chords: number[][]
  /** Pola arpeggio (offset semitone dari nada dasar chord, +12 oktaf). */
  arp: number[]
  wave: OscillatorType
  padVolume: number
  arpVolume: number
}

// Satu loop sederhana per mode — cukup beda suasana, tidak mengganggu.
// menu santai, bab1-2 riang tempo sedang, bab3 lucu bubbly, bab4 tenang,
// bab5 mengalir ritmis, bab6 tegang (minor + tempo cepat), tamat meriah.
const MUSIC_MODES: Record<MusicMode, MusicModeConfig> = {
  menu: {
    bpm: 72,
    chords: [
      [60, 64, 67],
      [65, 69, 72],
      [67, 71, 74],
      [60, 64, 67],
    ],
    arp: [0, 4, 7, 12],
    wave: 'sine',
    padVolume: 0.05,
    arpVolume: 0.05,
  },
  bab1: {
    bpm: 100,
    chords: [
      [60, 64, 67],
      [67, 71, 74],
      [69, 72, 76],
      [65, 69, 72],
    ],
    arp: [0, 2, 4, 7, 9, 12],
    wave: 'triangle',
    padVolume: 0.04,
    arpVolume: 0.06,
  },
  bab2: {
    bpm: 104,
    chords: [
      [60, 64, 67],
      [67, 71, 74],
      [69, 72, 76],
      [65, 69, 72],
    ],
    arp: [0, 4, 7, 9, 12, 7],
    wave: 'triangle',
    padVolume: 0.04,
    arpVolume: 0.06,
  },
  bab3: {
    bpm: 112,
    chords: [
      [62, 65, 69],
      [67, 71, 74],
      [60, 64, 67],
      [67, 71, 74],
    ],
    arp: [0, 7, 12, 7, 4, 9],
    wave: 'triangle',
    padVolume: 0.04,
    arpVolume: 0.07,
  },
  bab4: {
    bpm: 66,
    chords: [
      [60, 64, 67],
      [57, 60, 64],
      [65, 69, 72],
      [60, 64, 67],
    ],
    arp: [0, 7, 12],
    wave: 'sine',
    padVolume: 0.06,
    arpVolume: 0.04,
  },
  bab5: {
    bpm: 96,
    chords: [
      [60, 64, 67],
      [62, 65, 69],
      [65, 69, 72],
      [67, 71, 74],
    ],
    arp: [0, 4, 7, 12, 7, 4],
    wave: 'sine',
    padVolume: 0.04,
    arpVolume: 0.06,
  },
  bab6: {
    bpm: 120,
    chords: [
      [57, 60, 64],
      [62, 65, 68],
      [57, 60, 64],
      [59, 62, 65],
    ],
    arp: [0, 3, 7, 10, 12, 10],
    wave: 'triangle',
    padVolume: 0.03,
    arpVolume: 0.04,
  },
  tamat: {
    bpm: 116,
    chords: [
      [60, 64, 67],
      [67, 71, 74],
      [65, 69, 72],
      [60, 64, 67],
    ],
    arp: [0, 4, 7, 12, 16, 12, 7, 4],
    wave: 'triangle',
    padVolume: 0.05,
    arpVolume: 0.07,
  },
}

function musicTone(freq: number, start: number, dur: number, type: OscillatorType, volume: number): void {
  try {
    if (!audioCtx || !musicBus) return
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.05)
    gain.gain.setValueAtTime(volume, start + dur * 0.6)
    gain.gain.linearRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain)
    gain.connect(musicBus)
    osc.start(start)
    osc.stop(start + dur + 0.05)
  } catch {
    // Diam saja.
  }
}

let musicTimer: ReturnType<typeof setInterval> | null = null
let musicMode: MusicMode | null = null
let musicNextBar = 0
let musicBarIndex = 0

/** Mulai musik latar generatif mode tertentu. Panggilan ulang dengan mode yang sama tidak memulai ulang. */
export function startMusic(mode: MusicMode): void {
  try {
    if (musicMode === mode && musicTimer) return
    stopMusic()
    const ac = ensureCtx()
    if (!ac) return
    const cfg = MUSIC_MODES[mode]
    musicMode = mode
    musicBarIndex = 0
    musicNextBar = ac.currentTime + 0.1
    const barDur = (60 / cfg.bpm) * 4
    musicTimer = setInterval(() => {
      try {
        if (!audioCtx || musicMode !== mode) return
        // Tab tidak aktif: jangan jadwalkan bar baru (context juga di-suspend
        // oleh listener visibilitychange, jadi currentTime membeku).
        if (document.visibilityState === 'hidden') return
        while (musicNextBar < audioCtx.currentTime + 0.6) {
          const chord = cfg.chords[musicBarIndex % cfg.chords.length]
          for (const m of chord) musicTone(midi(m), musicNextBar, barDur, cfg.wave, cfg.padVolume)
          const step = barDur / 8
          for (let i = 0; i < 8; i += 1) {
            const deg = cfg.arp[i % cfg.arp.length]
            musicTone(midi(chord[0] + 12 + deg), musicNextBar + i * step, step * 0.9, cfg.wave, cfg.arpVolume)
          }
          musicBarIndex += 1
          musicNextBar += barDur
        }
      } catch {
        // Diam saja.
      }
    }, 200)
  } catch {
    // Diam saja.
  }
}

/** Hentikan musik latar. */
export function stopMusic(): void {
  try {
    if (musicTimer) {
      clearInterval(musicTimer)
      musicTimer = null
    }
    musicMode = null
  } catch {
    // Diam saja.
  }
}
