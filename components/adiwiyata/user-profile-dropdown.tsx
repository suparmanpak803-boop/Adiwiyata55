'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Camera,
  Check,
  ChevronDown,
  Coins,
  CupSoda,
  ExternalLink,
  History,
  ImagePlus,
  LogOut,
  Moon,
  Pencil,
  Recycle,
  Sun,
  X,
} from 'lucide-react'
import { saveKelasProfil } from '@/app/actions/profile'
import { loadSave } from '@/lib/apa-itu-adiwiyata/storage'
import type { JenisPengguna } from '@/lib/auth/access'

export type UserProfileDropdownProps = {
  user: {
    id: string
    name: string
    email: string
    role: 'admin' | 'petugas' | 'pengunjung'
    jenisPengguna: JenisPengguna
    className: string | null
    nomorAbsen: number | null
  }
  displayName: string
  onDisplayNameChange: (name: string) => void
  classes: { name: string; grade: string; rombel: string }[]
  dark: boolean | null
  onToggleDark: () => void
  onSignOut: () => void
  onOpenClassHistory: (className: string) => void
  profileStats: { setoran: number; hariTumbler: number } | null
  onClassSaved: (className: string | null, nomorAbsen: number | null) => void
}

type Props = UserProfileDropdownProps

const PHOTO_KEY = 'adiwiyata-foto-profil-v1'
const CLASS_CACHE_KEY = 'adiwiyata-kelas-profil-v1'
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

const PRESETS = [
  { id: 'daun', label: 'Daun' },
  { id: 'tumbler', label: 'Tumbler' },
  { id: 'bumi', label: 'Bumi' },
  { id: 'siswa', label: 'Siswa' },
] as const

type PresetId = (typeof PRESETS)[number]['id']

const ROLE_LABEL: Record<Props['user']['role'], string> = {
  admin: 'Admin',
  petugas: 'Kader Adiwiyata',
  pengunjung: 'Siswa',
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'A'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatAbsen(n: number | null): string {
  if (n === null) return ''
  return String(n).padStart(2, '0')
}

function gradeLabel(grade: string): string {
  const g = grade.trim().toUpperCase()
  if (g.includes('XII') || g === '12') return 'Kelas XII'
  if (g.includes('XI') || g === '11') return 'Kelas XI'
  if (g.includes('X') || g === '10') return 'Kelas X'
  return 'Kelas lain'
}

function readStoredPhoto(): string | null {
  try {
    return window.localStorage.getItem(PHOTO_KEY)
  } catch {
    return null
  }
}

function storePhoto(value: string): void {
  try {
    window.localStorage.setItem(PHOTO_KEY, value)
  } catch {
    // Penyimpanan penuh atau ditolak: foto tetap tampil di sesi ini,
    // tapi tidak tersimpan untuk kunjungan berikutnya.
  }
}

function PresetAvatar({ id, size }: { id: PresetId; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    role: 'img' as const,
    'aria-label': `Avatar ${PRESETS.find((p) => p.id === id)?.label ?? ''}`,
  }
  if (id === 'daun') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="32" fill="#FBF6E9" />
        <path
          d="M32 50 C14 44 10 26 20 12 C36 14 50 26 48 44 C44 50 38 52 32 50 Z"
          fill="#236B4D"
        />
        <path d="M32 48 C30 36 30 24 34 14" stroke="#FBF6E9" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M32 38 L24 32 M32 30 L40 24" stroke="#FBF6E9" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    )
  }
  if (id === 'tumbler') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="32" fill="#FBF6E9" />
        <path d="M22 16 h20 l-3 34 a4 4 0 0 1 -4 4 h-6 a4 4 0 0 1 -4 -4 Z" fill="#2E7FA8" />
        <path d="M22 26 h20" stroke="#FBF6E9" strokeWidth="3" />
        <path d="M38 16 L44 8" stroke="#236B4D" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="32" cy="38" r="5" fill="#F2B705" />
      </svg>
    )
  }
  if (id === 'bumi') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="32" fill="#FBF6E9" />
        <circle cx="32" cy="34" r="18" fill="#2E7FA8" />
        <path
          d="M22 30 C26 24 32 26 34 30 C36 34 30 38 26 36 C22 34 20 33 22 30 Z M38 40 C42 38 46 40 46 44 C44 48 38 48 36 44 C35 42 36 41 38 40 Z"
          fill="#236B4D"
        />
        <path d="M16 34 a18 18 0 0 1 32 0" stroke="#F2B705" strokeWidth="2" fill="none" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="32" cy="32" r="32" fill="#FBF6E9" />
      <path d="M32 14 L54 24 L32 34 L10 24 Z" fill="#C96F3B" />
      <path d="M20 30 v10 c0 5 24 5 24 0 v-10 l-12 5 Z" fill="#236B4D" />
      <path d="M50 26 v12" stroke="#C96F3B" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="42" r="2.5" fill="#F2B705" />
    </svg>
  )
}

function AvatarView({
  photo,
  name,
  size,
}: {
  photo: string | null
  name: string
  size: number
}) {
  if (photo && photo.startsWith('preset:')) {
    const id = photo.slice('preset:'.length) as PresetId
    if (PRESETS.some((p) => p.id === id)) {
      return <PresetAvatar id={id} size={size} />
    }
  }
  if (photo && photo.startsWith('data:image/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={`Foto profil ${name}`}
        width={size}
        height={size}
        className="upd-avatar-img"
      />
    )
  }
  return (
    <span className="upd-avatar-initials" style={{ width: size, height: size }} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}

export default function UserProfileDropdown({
  user,
  displayName,
  onDisplayNameChange,
  classes,
  dark,
  onToggleDark,
  onSignOut,
  onOpenClassHistory,
  profileStats,
  onClassSaved,
}: Props) {
  const isGuru = user.jenisPengguna === 'guru'
  const isStaffTu = user.jenisPengguna === 'staff_tu'
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [selectedClass, setSelectedClass] = useState(user.className ?? '')
  // Guru tidak memakai nomor absen: state absen dikosongkan supaya nilai
  // lama yang tersimpan tidak tampil sebagai nilai aktif.
  const [absen, setAbsen] = useState(
    isGuru || user.nomorAbsen === null ? '' : String(user.nomorAbsen),
  )
  const [savingClass, setSavingClass] = useState(false)
  const [classError, setClassError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [nameError, setNameError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setPhoto(readStoredPhoto())
    setCoins(loadSave().coins)
  }, [])

  useEffect(() => {
    setSelectedClass(user.className ?? '')
    setAbsen(isGuru || user.nomorAbsen === null ? '' : String(user.nomorAbsen))
  }, [user.className, user.nomorAbsen, isGuru])

  useEffect(() => {
    setNameDraft(displayName)
  }, [displayName])

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const updatePanelPos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setIsMobile(window.innerWidth < 768)
    setPanelPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) })
  }, [])

  const closePanel = useCallback(() => {
    setOpen(false)
    setPhotoPickerOpen(false)
    setEditingName(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    setCoins(loadSave().coins)
    updatePanelPos()
    const onResize = () => updatePanelPos()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, updatePanelPos, closePanel])

  const handlePhotoFile = (file: File | undefined) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Format foto tidak didukung. Pilih foto JPG, PNG, atau WebP.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Fotonya lebih dari 2 MB. Pilih foto yang lebih kecil, maksimal 2 MB.')
      return
    }
    setPhotoError(null)
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - side) / 2
      const sy = (img.naturalHeight - side) / 2
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setPhotoError('Foto tidak bisa diproses di perangkat ini. Coba foto lain.')
        return
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, 256, 256)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      storePhoto(dataUrl)
      setPhoto(dataUrl)
      setPhotoPickerOpen(false)
      showToast('Foto profil berhasil diperbarui')
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setPhotoError('Foto tidak bisa dibaca. Coba foto lain.')
    }
    img.src = objectUrl
  }

  const handlePreset = (id: PresetId) => {
    const value = `preset:${id}`
    storePhoto(value)
    setPhoto(value)
    setPhotoError(null)
    setPhotoPickerOpen(false)
    showToast('Foto profil berhasil diperbarui')
  }

  const groupedClasses = (() => {
    const order = ['Kelas X', 'Kelas XI', 'Kelas XII', 'Kelas lain']
    const groups = new Map<string, { name: string; grade: string; rombel: string }[]>()
    for (const c of classes) {
      const label = gradeLabel(c.grade)
      const list = groups.get(label) ?? []
      list.push(c)
      groups.set(label, list)
    }
    return order
      .filter((label) => groups.has(label))
      .map((label) => ({ label, items: groups.get(label) ?? [] }))
  })()

  const handleSaveClass = async () => {
    setClassError(null)
    const className = selectedClass.trim() === '' ? null : selectedClass.trim()
    let nomorAbsen: number | null = null
    // Guru tidak memakai absen: isi state absen diabaikan dan null yang dikirim.
    if (!isGuru && absen.trim() !== '') {
      const parsed = Number(absen)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 36) {
        setClassError('Nomor absen 1 sampai 36. Perbaiki nomornya, lalu simpan lagi.')
        return
      }
      nomorAbsen = parsed
    }
    setSavingClass(true)
    try {
      const result = await saveKelasProfil(className, nomorAbsen)
      if (!result.ok) {
        setClassError(
          `${result.error ?? 'Profil kelas gagal disimpan.'} Coba simpan lagi, atau hubungi admin bila terus gagal.`,
        )
        return
      }
      try {
        window.localStorage.setItem(
          CLASS_CACHE_KEY,
          JSON.stringify({ className: result.className, nomorAbsen: result.nomorAbsen }),
        )
      } catch {
        // Cache gagal ditulis: data server tetap tersimpan.
      }
      onClassSaved(result.className, result.nomorAbsen)
      if (result.className === null) {
        showToast('Profil kelas diperbarui. Kelas dikosongkan.')
      } else if (result.nomorAbsen === null) {
        showToast(`Profil kelas diperbarui ke ${result.className}`)
      } else {
        showToast(
          `Profil kelas diperbarui ke ${result.className} - Absen ${formatAbsen(result.nomorAbsen)}`,
        )
      }
    } catch {
      setClassError('Profil kelas gagal disimpan. Periksa koneksimu, lalu coba simpan lagi.')
    } finally {
      setSavingClass(false)
    }
  }

  const handleSaveName = () => {
    const next = nameDraft.trim()
    if (next === '') {
      setNameError('Nama tampilan tidak boleh kosong.')
      return
    }
    setNameError(null)
    onDisplayNameChange(next)
    setEditingName(false)
    showToast('Nama tampilan diperbarui')
  }

  // Jenis pengguna mengalahkan pemetaan peran di badge: akun admin yang
  // jenisnya guru menampilkan "Guru", tapi izinnya tetap admin.
  const roleBadge =
    user.jenisPengguna === 'guru'
      ? 'Guru'
      : user.jenisPengguna === 'staff_tu'
        ? 'Staff TU'
        : ROLE_LABEL[user.role]
  const classBadge = user.className
    ? isGuru || user.nomorAbsen === null
      ? user.className
      : `${user.className} \u2022 ${formatAbsen(user.nomorAbsen)}`
    : 'Belum ada kelas'
  const classBadgeShort = user.className ?? 'Pilih kelas'
  const isDark = dark === true

  const panel = open ? (
    <>
      <div className="upd-backdrop" onClick={closePanel} aria-hidden="true" />
      <div
        ref={panelRef}
        role="menu"
        aria-label="Menu profil"
        className={isMobile ? 'upd-panel upd-panel-sheet' : 'upd-panel upd-panel-desktop'}
        style={
          isMobile
            ? undefined
            : { top: panelPos.top, right: panelPos.right }
        }
      >
        <div className="upd-panel-head">
          <span className="upd-panel-title">Profil</span>
          <button
            type="button"
            className="upd-close-btn"
            onClick={closePanel}
            aria-label="Tutup menu profil"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="upd-header">
          <div className="upd-photo-wrap">
            <div className="upd-photo-large">
              <AvatarView photo={photo} name={displayName} size={64} />
            </div>
            <button
              type="button"
              className="upd-camera-btn"
              onClick={() => setPhotoPickerOpen((v) => !v)}
              aria-label="Ubah foto profil"
              aria-expanded={photoPickerOpen}
            >
              <Camera size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="upd-header-text">
            <strong className="upd-display-name">{displayName}</strong>
            <span className="upd-email">{user.email}</span>
            <span className="upd-role-badge">{roleBadge}</span>
          </div>
        </div>

        {photoPickerOpen && (
          <div className="upd-photo-picker">
            <p className="upd-picker-label">Pilih foto profil</p>
            <div className="upd-preset-grid">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="upd-preset-btn"
                  onClick={() => handlePreset(preset.id)}
                  aria-label={`Pakai avatar ${preset.label}`}
                  aria-pressed={photo === `preset:${preset.id}`}
                >
                  <PresetAvatar id={preset.id} size={44} />
                  <span>{preset.label}</span>
                  {photo === `preset:${preset.id}` && (
                    <span className="upd-preset-check" aria-hidden="true">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="upd-upload-btn"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={16} aria-hidden="true" />
              Unggah foto dari perangkat
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="upd-file-input"
              aria-label="Pilih foto profil"
              onChange={(e) => {
                handlePhotoFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <p className="upd-note">Foto JPG, PNG, atau WebP, maksimal 2 MB. Foto dipotong jadi bulat.</p>
            {photoError && (
              <p className="upd-error" role="alert">
                {photoError}
              </p>
            )}
          </div>
        )}

        <div className="upd-stats" aria-label="Statistik singkat">
          <div className="upd-stat">
            <Recycle size={16} aria-hidden="true" className="upd-stat-icon" />
            <span className="upd-stat-value">
              {profileStats === null ? 'Belum ada data' : String(profileStats.setoran)}
            </span>
            <span className="upd-stat-label">Setoran Sampah</span>
            <span className="upd-stat-sub">setoran ditulis akun ini</span>
          </div>
          <div className="upd-stat">
            <CupSoda size={16} aria-hidden="true" className="upd-stat-icon" />
            <span className="upd-stat-value">
              {profileStats === null ? 'Belum ada data' : String(profileStats.hariTumbler)}
            </span>
            <span className="upd-stat-label">Kebiasaan Tumbler</span>
            <span className="upd-stat-sub">hari tercatat membawa tumbler</span>
          </div>
          <div className="upd-stat">
            <Coins size={16} aria-hidden="true" className="upd-stat-icon" />
            <span className="upd-stat-value">{String(coins)}</span>
            <span className="upd-stat-label">Skor Mini-Game</span>
            <span className="upd-stat-sub">Koin Hijau (perangkat ini)</span>
          </div>
        </div>

        {!isStaffTu && (
          <section className="upd-section" aria-labelledby="upd-kelas-title">
            <h2 id="upd-kelas-title" className="upd-section-title">
              {isGuru ? 'Kelas yang diampu' : 'Kelas dan absen'}
            </h2>
            <div className="upd-class-row">
              <label className="upd-field">
                <span className="upd-field-label">Kelas</span>
                <select
                  className="upd-select"
                  value={selectedClass}
                  disabled={classes.length === 0 || savingClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">Pilih kelas</option>
                  {groupedClasses.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {!isGuru && (
                <label className="upd-field upd-field-absen">
                  <span className="upd-field-label">Absen</span>
                  <input
                    className="upd-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={36}
                    value={absen}
                    disabled={savingClass}
                    placeholder="08"
                    aria-label="Nomor absen, 1 sampai 36"
                    onChange={(e) => setAbsen(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                  />
                </label>
              )}
            </div>
            {classes.length === 0 && (
              <p className="upd-note">
                {isGuru
                  ? 'Belum ada kelas yang bisa dipilih. Hubungi admin bila kelas yang diampu belum terdaftar.'
                  : 'Belum ada kelas yang bisa dipilih. Hubungi admin bila kelasmu belum terdaftar.'}
              </p>
            )}
            <button
              type="button"
              className="upd-save-btn"
              onClick={handleSaveClass}
              disabled={savingClass || classes.length === 0}
            >
              {savingClass ? 'Menyimpan...' : 'Simpan kelas'}
            </button>
            {classError && (
              <p className="upd-error" role="alert">
                {classError}
              </p>
            )}
          </section>
        )}

        <section className="upd-section" aria-labelledby="upd-pengaturan-title">
          <h2 id="upd-pengaturan-title" className="upd-section-title">
            Pengaturan
          </h2>
          <div className="upd-menu-row">
            <span className="upd-menu-label">
              {isDark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
              {isDark ? 'Mode gelap' : 'Mode terang'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label="Mode gelap"
              className="upd-switch"
              onClick={onToggleDark}
            >
              <span className="upd-switch-knob" />
            </button>
          </div>
          {!isStaffTu && (
            <button
              type="button"
              className="upd-menu-btn"
              disabled={!user.className}
              onClick={() => {
                if (user.className) onOpenClassHistory(user.className)
              }}
            >
              <History size={16} aria-hidden="true" />
              <span className="upd-menu-btn-text">
                Riwayat Aktivitas Kelas
                {!user.className && (
                  <small>
                    {isGuru
                      ? 'Pilih kelas dulu supaya riwayat kelas yang diampu bisa dibuka.'
                      : 'Pilih kelas dulu supaya riwayat kelasmu bisa dibuka.'}
                  </small>
                )}
              </span>
            </button>
          )}
          <button
            type="button"
            className="upd-menu-btn"
            onClick={() => {
              setEditingName((v) => !v)
              setNameDraft(displayName)
              setNameError(null)
            }}
            aria-expanded={editingName}
          >
            <Pencil size={16} aria-hidden="true" />
            <span className="upd-menu-btn-text">Edit Nama dan Biodata</span>
          </button>
          {editingName && (
            <div className="upd-name-form">
              <label className="upd-field">
                <span className="upd-field-label">Nama tampilan</span>
                <input
                  className="upd-input"
                  type="text"
                  value={nameDraft}
                  maxLength={60}
                  onChange={(e) => setNameDraft(e.target.value)}
                  aria-label="Nama tampilan"
                />
              </label>
              {nameError && (
                <p className="upd-error" role="alert">
                  {nameError}
                </p>
              )}
              <div className="upd-name-actions">
                <button type="button" className="upd-save-btn" onClick={handleSaveName}>
                  Simpan
                </button>
                <button
                  type="button"
                  className="upd-ghost-btn"
                  onClick={() => {
                    setEditingName(false)
                    setNameDraft(displayName)
                    setNameError(null)
                  }}
                >
                  Batal
                </button>
              </div>
              <p className="upd-note">Nama ini hanya tampil di perangkat ini.</p>
            </div>
          )}
          <a
            className="upd-menu-btn upd-menu-link"
            href="https://myaccount.google.com/security"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} aria-hidden="true" />
            <span className="upd-menu-btn-text">
              Kelola Akun Google
              <small>Kata sandi diatur di akun Google, bukan di situs ini.</small>
            </span>
          </a>
        </section>

        <div className="upd-divider" aria-hidden="true" />
        <button type="button" className="upd-signout-btn" onClick={onSignOut}>
          <LogOut size={16} aria-hidden="true" />
          Keluar
        </button>
      </div>
    </>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="upd-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menu profil ${displayName}`}
      >
        <span className="upd-trigger-photo">
          <AvatarView photo={photo} name={displayName} size={36} />
        </span>
        <span className="upd-trigger-name">{displayName}</span>
        <span className="upd-trigger-badge upd-trigger-badge-long">{classBadge}</span>
        <span className="upd-trigger-badge upd-trigger-badge-short">{classBadgeShort}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={open ? 'upd-chevron upd-chevron-open' : 'upd-chevron'}
        />
      </button>
      {mounted && open && createPortal(panel, document.body)}
      {mounted &&
        toast !== null &&
        createPortal(
          <div className="upd-toast" role="status" aria-live="polite">
            {toast}
          </div>,
          document.body,
        )}
    </>
  )
}

export { UserProfileDropdown }
