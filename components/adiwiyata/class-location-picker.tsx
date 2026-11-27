'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { fetchJson } from '@/lib/api-client'

type ClassOption = { name?: string; code?: string; grade: string; rombel: string }

const GRADES = ['X', 'XI', 'XII']

async function fetchClassList(url: string) {
  const result = await fetchJson<{ success?: boolean; classes?: ClassOption[]; error?: string }>(url, { cache: 'no-store' })
  if (!result.success || !result.classes) throw new Error(result.error || 'Daftar kelas belum dapat dimuat.')
  return { classes: result.classes }
}

export function ClassLocationPicker({ classes, invalid, errorId, defaultValue }: {
  classes: ClassOption[]
  invalid?: boolean
  errorId?: string
  // Nilai awal "TINGKAT-ROMBEL" (mis. "XII-E") dari profil pengguna.
  // Hanya dipakai saat mount; pilihan setelah itu milik komponen ini.
  defaultValue?: string | null
}) {
  const initial = (() => {
    if (!defaultValue) return { grade: '', selection: '' }
    const dash = defaultValue.indexOf('-')
    if (dash <= 0) return { grade: '', selection: '' }
    const grade = defaultValue.slice(0, dash)
    if (!GRADES.includes(grade)) return { grade: '', selection: '' }
    return { grade, selection: defaultValue }
  })()
  const [grade, setGrade] = useState(initial.grade)
  const [selection, setSelection] = useState(initial.selection)
  const { data: masterData } = useSWR('/api/classes', fetchClassList, {
    fallbackData: { classes },
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })
  const activeClasses = masterData?.classes ?? classes
  const rombels = useMemo(() => activeClasses.filter((item) => item.grade === grade).map((item) => item.rombel).sort(), [activeClasses, grade])
  const selectedRoom = selection.startsWith(`${grade}-`) ? selection.slice(grade.length + 1) : ''

  useEffect(() => {
    if (selection && masterData && !masterData.classes.some((item) => item.name === selection || item.code === selection)) {
      setSelection('')
    }
  }, [masterData, selection])

  function chooseGrade(value: string) {
    setGrade(value)
    setSelection('')
  }

  return (
    <fieldset className="class-location-picker" aria-invalid={invalid} aria-describedby={errorId}>
      <legend>Kelas/Lokasi</legend>
      <input type="hidden" name="className" value={selection} />
      <div className="class-picker-desktop">
        <label className="deposit-field"><span>Pilih tingkat</span><select value={grade} onChange={(event) => chooseGrade(event.target.value)}><option value="">Pilih tingkat</option>{GRADES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="deposit-field"><span>Pilih rombel</span><select value={selectedRoom} disabled={!grade || rombels.length === 0} onChange={(event) => setSelection(event.target.value ? `${grade}-${event.target.value}` : '')}><option value="">{grade ? 'Pilih rombel' : 'Pilih tingkat dahulu'}</option>{rombels.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="class-picker-mobile">
        <span className="class-picker-label">Pilih tingkat</span>
        <div className="class-choice-grid class-grade-choices">{GRADES.map((item) => <button key={item} type="button" className={grade === item ? 'class-choice is-selected' : 'class-choice'} aria-pressed={grade === item} onClick={() => chooseGrade(item)}>{item}</button>)}</div>
        <span className="class-picker-label">Pilih rombel</span>
        <div className="class-choice-grid">{rombels.length ? rombels.map((item) => <button key={item} type="button" className={selectedRoom === item ? 'class-choice is-selected' : 'class-choice'} aria-pressed={selectedRoom === item} disabled={!grade} onClick={() => setSelection(`${grade}-${item}`)}>{item}</button>) : <span className="class-picker-hint">Pilih tingkat untuk melihat rombel aktif.</span>}</div>
      </div>
      <span className="class-selection-preview" aria-live="polite">{selection ? `Dipilih: ${selection}` : 'Belum ada kelas/lokasi dipilih'}</span>
    </fieldset>
  )
}
