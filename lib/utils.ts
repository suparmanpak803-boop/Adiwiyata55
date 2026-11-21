// Utilitas kecil untuk menggabungkan class CSS (pola standar shadcn).
// Satu-satunya pemakai di repo ini: components/ui/button.tsx.
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
