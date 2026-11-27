'use client'

import '@/components/game/game.css'

export function AppErrorBoundary({ reset, section }: { reset: () => void; section: string }) {
  return (
    <main className="leaderboard-page">
      <section className="game-stage" role="alert" aria-live="assertive">
        <span className="eyebrow">{section}</span>
        <h1>Halaman belum dapat dimuat</h1>
        <p>Data belum termuat. Periksa koneksi, lalu coba lagi.</p>
        <div className="game-actions">
          <button className="game-play" type="button" onClick={reset}>Coba lagi</button>
          <a className="game-ghost" href="/">Kembali ke beranda</a>
        </div>
      </section>
    </main>
  )
}
