'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { CountUp, fadeUpChild, staggerParent } from '@/components/animations'
import { GraduationCap, Leaf, Search, Users } from 'lucide-react'
import { saveClass, type getDepositPageData } from '@/app/actions/deposits'

type Classes = Awaited<ReturnType<typeof getDepositPageData>>['classes']

export function ClassDirectory({ classes, isAdmin }: { classes: Classes; isAdmin: boolean }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const classData = useMemo(() => classes, [classes])
  const filteredClasses = useMemo(() => classData.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())), [classData, search])

  function updateClass(event: FormEvent<HTMLFormElement>, name: string) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const countText = String(form.get('studentCount') ?? '').trim()
    startTransition(async () => {
      try {
        const result = await saveClass({
          name,
          studentCount: countText ? Number(countText) : null,
          homeroomTeacher: String(form.get('homeroomTeacher') ?? ''),
          officerName: String(form.get('officerName') ?? ''),
        })
        if (!result.success) throw new Error(result.error)
        setMessage(`Data ${name} berhasil diperbarui.`)
        setError('')
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Data kelas belum berhasil disimpan.')
      }
    })
  }

  return (
    <section className="directory-page" aria-labelledby="directory-title">
      <div className="directory-heading"><div><span className="eyebrow">WARGA SEKOLAH</span><h1 id="directory-title">Daftar Kelas &amp; Petugas</h1><p>Admin dapat melengkapi jumlah siswa, wali kelas, dan petugas Adiwiyata untuk setiap kelas di portal.</p></div><span className="directory-total"><strong><CountUp value={classData.length} /></strong> kelas</span></div>
      <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Cari kelas</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kelas, mis. XI-C" /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="auth-success" role="status">{message}</p>}
      <motion.div className="class-grid" variants={staggerParent} initial="hidden" animate="show">
        {filteredClasses.map((item) => <motion.article className="class-card" key={item.name} variants={fadeUpChild} whileHover={{ y: -4 }}>
          <div className="class-card-top"><span className="class-grade">TINGKAT {item.grade}</span><span className="class-status">{item.student_count ? 'Data terisi' : 'Perlu dilengkapi'}</span></div>
          <h2>{item.name}</h2>
          <div className="class-details"><span><GraduationCap aria-hidden="true" />Jumlah siswa</span><strong>{item.student_count ?? 'Belum diisi'}</strong></div>
          <div className="class-details"><span><Users aria-hidden="true" />Wali kelas</span><strong>{item.homeroom_teacher || 'Belum diisi'}</strong></div>
          <div className="class-details"><span><Leaf aria-hidden="true" />Petugas Adiwiyata</span><strong>{item.officer_name || 'Belum diisi'}</strong></div>
          {isAdmin && <form className="class-admin-card class-directory-editor" onSubmit={(event) => updateClass(event, item.name)}>
            <label className="deposit-field"><span>Jumlah siswa</span><input name="studentCount" type="number" min="1" max="100" step="1" defaultValue={item.student_count ?? ''} /></label>
            <label className="deposit-field"><span>Nama wali kelas</span><input name="homeroomTeacher" maxLength={100} autoComplete="name" defaultValue={item.homeroom_teacher} /></label>
            <label className="deposit-field"><span>Petugas Adiwiyata</span><input name="officerName" maxLength={100} defaultValue={item.officer_name} /></label>
            <button className="text-button" type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan data kelas'}</button>
          </form>}
        </motion.article>)}
      </motion.div>
      {filteredClasses.length === 0 && <div className="empty-search"><Search aria-hidden="true" /><strong>Kelas tidak ditemukan</strong><span>Coba gunakan kata kunci lain.</span></div>}
    </section>
  )
}
