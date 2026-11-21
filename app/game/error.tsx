'use client'

import { AppErrorBoundary } from '@/components/app-error-boundary'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorBoundary reset={reset} section="MAIN GAME" />
}
