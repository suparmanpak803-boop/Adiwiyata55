'use client'

import { BookOpen, Flag, Map, Trophy, User } from 'lucide-react'

export type AiaTab = 'peta' | 'misi' | 'ensiklopedia' | 'peringkat' | 'profil'

const TABS: { id: AiaTab; label: string; Icon: typeof Map }[] = [
  { id: 'peta', label: 'Jelajah', Icon: Map },
  { id: 'misi', label: 'Misi', Icon: Flag },
  { id: 'ensiklopedia', label: 'Ensiklopedia', Icon: BookOpen },
  { id: 'peringkat', label: 'Peringkat', Icon: Trophy },
  { id: 'profil', label: 'Profil', Icon: User },
]

export function BottomNav({ tab, onChange }: { tab: AiaTab; onChange: (tab: AiaTab) => void }) {
  return (
    <nav className="aia-bottom-nav" aria-label="Navigasi kampanye">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`aia-nav-btn${tab === id ? ' active' : ''}`}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
