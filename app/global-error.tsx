'use client'

import '@/components/game/game.css'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body className="antialiased">
        <main className="leaderboard-page">
          <section className="game-stage" role="alert" aria-live="assertive">
            <span className="eyebrow">PORTAL ADIWIYATA</span>
            <h1>Halaman belum dapat dimuat</h1>
            <p>Terjadi gangguan saat mengambil data. Coba muat ulang bagian ini.</p>
            <div className="game-actions">
              <button className="game-play" type="button" onClick={reset}>Coba lagi</button>
              <a className="game-ghost" href="/">Kembali ke beranda</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
