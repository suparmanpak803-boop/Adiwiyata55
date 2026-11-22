import '@/components/game/game.css'

export default function NotFound() {
  return (
    <main className="leaderboard-page">
      <section className="game-stage" role="alert" aria-live="assertive">
        <span className="eyebrow">ADIWIYATA 55</span>
        <h1>Halaman tidak ditemukan</h1>
        <p>Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa kembali alamatnya, atau kembali ke beranda.</p>
        <div className="game-actions">
          <a className="game-play" href="/">Kembali ke beranda</a>
        </div>
      </section>
    </main>
  )
}
