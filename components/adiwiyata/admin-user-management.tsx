'use client'

import { useState, useTransition, type FormEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Search, ShieldCheck, Users } from 'lucide-react'
import { searchAdminUsers, updateAdminUserRole } from '@/app/actions/admin-users'
import type { ManagedAccount, ManagedPortalRole } from '@/lib/admin-user-management'

type AccountDraft = { role: ManagedPortalRole; className: string; expiresOn: string }

const roleLabels: Record<ManagedPortalRole, string> = {
  admin: 'Admin',
  petugas: 'Petugas',
  pengunjung: 'Pengunjung',
}

export function AdminUserManagement({ initialAccounts, classes, currentUserId }: {
  initialAccounts: ManagedAccount[]
  classes: string[]
  currentUserId: string
}) {
  const router = useRouter()
  const [accounts, setAccounts] = useState(initialAccounts)
  const [drafts, setDrafts] = useState<Record<string, AccountDraft>>({})
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [searchPending, startSearch] = useTransition()
  const [savePending, startSave] = useTransition()

  function getDraft(account: ManagedAccount): AccountDraft {
    return drafts[account.id] ?? { role: account.role, className: account.className ?? '', expiresOn: account.expiresOn ?? '' }
  }

  function updateDraft(account: ManagedAccount, change: Partial<AccountDraft>) {
    setDrafts((current) => ({
      ...current,
      [account.id]: { ...(current[account.id] ?? getDraft(account)), ...change },
    }))
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    startSearch(async () => {
      try {
        const result = await searchAdminUsers(search)
        if (!result.success) throw new Error(result.error)
        setAccounts(result.accounts)
        setDrafts({})
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Pencarian akun belum berhasil.')
      }
    })
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
  }

  function saveAccount(event: FormEvent<HTMLFormElement>, account: ManagedAccount) {
    event.preventDefault()
    const draft = getDraft(account)
    setSavingId(account.id)
    setMessage('')
    setError('')
    startSave(async () => {
      try {
        const result = await updateAdminUserRole({ userId: account.id, role: draft.role, className: draft.className, expiresOn: draft.expiresOn || null })
        if (!result.success) throw new Error(result.error)
        setAccounts((current) => current.map((item) => item.id === account.id ? {
          ...item,
          role: draft.role,
          className: draft.role === 'petugas' ? draft.className : null,
          expiresOn: draft.role === 'petugas' ? draft.expiresOn || null : null,
        } : item))
        setDrafts((current) => {
          const next = { ...current }
          delete next[account.id]
          return next
        })
        setMessage(`Akses ${account.name} berhasil diperbarui.`)
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Perubahan akses belum berhasil disimpan.')
      } finally {
        setSavingId(null)
      }
    })
  }

  return (
    <main className="user-admin-page">
      <header className="user-admin-header">
        <a className="slider-admin-back" href="/"><ArrowLeft aria-hidden="true" /> Kembali ke portal</a>
        <div className="slider-admin-title-row">
          <span className="slider-admin-mark"><ShieldCheck aria-hidden="true" /></span>
          <div><span className="eyebrow">PENGATURAN ADMIN</span><h1>Akses Pengguna</h1></div>
        </div>
        <p>Atur peran akun portal dan kelas yang menjadi tanggung jawab setiap petugas.</p>
      </header>

      <section className="user-admin-overview" aria-label="Tentang pengelolaan akses">
        <span className="user-admin-overview-mark"><Users aria-hidden="true" /></span>
        <div><strong>{accounts.length} akun ditampilkan</strong><p>Perubahan akses berlaku pada permintaan berikutnya. Akun Petugas harus memiliki kelas aktif.</p></div>
      </section>

      {(message || error) && <p className={`user-admin-feedback${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>{message || error}</p>}

      <form className="user-admin-search" onSubmit={submitSearch} role="search">
        <label htmlFor="user-admin-search-input" className="sr-only">Cari nama atau email akun</label>
        <Search aria-hidden="true" />
        <input id="user-admin-search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Cari nama atau email akun" />
        <button className="secondary-button" type="submit" disabled={searchPending}>{searchPending ? 'Mencari…' : 'Cari akun'}</button>
      </form>
      <p className="user-admin-search-hint">Maksimal 250 hasil per pencarian. Gunakan nama atau email untuk menemukan akun.</p>

      {accounts.length > 0 ? <section className="user-admin-list" aria-label="Daftar akun">
        {accounts.map((account) => {
          const draft = getDraft(account)
          const isSaving = savePending && savingId === account.id
          return <article className="user-admin-card" key={account.id}>
            <div className="user-admin-card-heading">
              <span className="user-admin-avatar" aria-hidden="true">{account.name.trim().slice(0, 1).toUpperCase() || '?'}</span>
              <div className="user-admin-identity"><h2>{account.name}</h2><p>{account.email}</p></div>
              <span className={`user-admin-role-badge role-${account.role}`}>{roleLabels[account.role]}</span>
            </div>
            <form className="user-admin-controls" onSubmit={(event) => saveAccount(event, account)}>
              <label className="user-admin-field"><span>Peran akun</span><select value={draft.role} disabled={account.id === currentUserId || isSaving} onChange={(event) => updateDraft(account, { role: event.target.value as ManagedPortalRole })}>
                <option value="admin">Admin</option><option value="petugas">Petugas</option><option value="pengunjung">Pengunjung</option>
              </select></label>
              {draft.role === 'petugas' && <>
                <label className="user-admin-field"><span>Kelas tugas</span><select value={draft.className} required disabled={isSaving} onChange={(event) => updateDraft(account, { className: event.target.value })}>
                  <option value="" disabled>Pilih kelas</option>{classes.map((className) => <option value={className} key={className}>{className}</option>)}
                </select></label>
                <label className="user-admin-field"><span>Role berlaku sampai</span><input type="date" value={draft.expiresOn} min={new Date().toISOString().slice(0, 10)} disabled={isSaving} onChange={(event) => updateDraft(account, { expiresOn: event.target.value })} /><small>Kosongkan jika masa tugas tidak dibatasi.</small></label>
              </>}
              <div className="user-admin-save-wrap">
                <button className="primary-button" type="submit" disabled={isSaving || savePending || (draft.role === 'petugas' && !draft.className)}>
                  {isSaving ? 'Menyimpan…' : <><Check aria-hidden="true" /> Simpan akses</>}
                </button>
                {account.id === currentUserId && <small>Role Admin akun aktif tidak dapat diturunkan dari panel ini.</small>}
              </div>
            </form>
          </article>
        })}
      </section> : <div className="user-admin-empty"><span><Search aria-hidden="true" /></span><strong>Akun tidak ditemukan</strong><p>Coba nama atau email lain, atau kosongkan pencarian untuk melihat daftar akun.</p></div>}
    </main>
  )
}
