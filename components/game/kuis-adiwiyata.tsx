'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Brain, Coins, Info, ListChecks, LogOut, Pause, Play, Timer } from 'lucide-react'
import { SOAL_INSPEKSI } from '@/lib/apa-itu-adiwiyata/content/pertanyaan'
import { useCampaign } from '@/lib/apa-itu-adiwiyata/context'
import { BATAS_KOIN_ARKADE_HARIAN, koinArkadeDiberikan, koinKuis, tanggalHariIni } from '@/lib/apa-itu-adiwiyata/arkade'

const WAKTU_PER_SOAL = 20

type Prepared = { id: string; q: string; options: { key: string; text: string }[]; correctIndex: number; explanation: string }

function acakSoal(): Prepared[] {
  const salin = [...SOAL_INSPEKSI]
  for (let i = salin.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[salin[i], salin[j]] = [salin[j], salin[i]]
  }
  return salin.map((soal, i) => ({
    id: `soal-${i}`,
    q: soal.pertanyaan,
    options: soal.pilihan.map((text, j) => ({ key: String.fromCharCode(65 + j), text })),
    correctIndex: soal.jawabanIndex,
    explanation: soal.penjelasan,
  }))
}

/**
 * Kuis Adiwiyata — game arkade di dunia kampanye, dibuka lewat NPC Kak Dara.
 * Soal sepenuhnya lokal dari SOAL_INSPEKSI (tanpa server): 12 soal, 20 detik
 * per soal. Jumlah jawaban benar diubah jadi Koin Hijau oleh runner lewat
 * onFinished, dan rekor terbaik tersimpan di save kampanye.
 */
export function KuisAdiwiyata({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number) => void }) {
  const { save } = useCampaign()
  const [stage, setStage] = useState<'judul' | 'main' | 'selesai'>('judul')
  const [questions, setQuestions] = useState<Prepared[]>([])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [left, setLeft] = useState(WAKTU_PER_SOAL)
  const [correct, setCorrect] = useState(0)
  const [jeda, setJeda] = useState(false)
  const [skorAkhir, setSkorAkhir] = useState(0)
  const [terbaikLama, setTerbaikLama] = useState(0)
  // F13: koin yang benar-benar diberikan (dijepit batas harian) + yang
  // diminta — dijepret saat selesai dari save SEBELUM hadiah runner,
  // supaya angka di layar hasil sama dengan yang masuk ke saldo.
  const [koinHasil, setKoinHasil] = useState<{ diminta: number; diberikan: number } | null>(null)
  const selesaiRef = useRef(false)
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished
  const saveRef = useRef(save)
  saveRef.current = save

  // Selesai lokal: dipanggil tepat satu kali per ronde — simpan jumlah benar,
  // tampilkan layar hasil, dan beri tahu runner (koin + rekor terbaik).
  const finishLocal = useCallback((benar: number) => {
    if (selesaiRef.current) return
    selesaiRef.current = true
    setTerbaikLama(saveRef.current.arkade?.kuis ?? 0)
    const koinDiminta = koinKuis(benar)
    setKoinHasil({
      diminta: koinDiminta,
      diberikan: koinArkadeDiberikan(
        koinDiminta,
        saveRef.current.arkadeTanggal ?? null,
        saveRef.current.arkadeKoinHariIni ?? 0,
        tanggalHariIni(),
      ),
    })
    setSkorAkhir(benar)
    setStage('selesai')
    onFinishedRef.current(benar)
  }, [])

  const mulai = () => {
    selesaiRef.current = false
    setQuestions(acakSoal())
    setIndex(0); setChosen(null); setRevealed(false)
    setCorrect(0); setLeft(WAKTU_PER_SOAL); setJeda(false)
    setStage('main')
  }

  const answer = useCallback((option: number | null) => {
    if (revealed) return
    setChosen(option)
    setRevealed(true)
    const current = questions[index]
    if (current && option === current.correctIndex) setCorrect((count) => count + 1)
  }, [revealed, questions, index])

  // Hitung mundur 1 detik sekali; berhenti saat jawaban terbuka atau dijeda.
  useEffect(() => {
    if (stage !== 'main' || revealed || jeda || !questions.length) return
    const timer = window.setInterval(() => {
      setLeft((sisa) => Math.max(0, sisa - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [stage, revealed, jeda, index, questions.length])

  // Waktu habis -> jawab kosong (dianggap salah) begitu hitungan mencapai 0.
  useEffect(() => {
    if (stage === 'main' && !revealed && !jeda && questions.length && left <= 0) answer(null)
  }, [stage, revealed, jeda, questions.length, left, answer])

  function next() {
    if (index >= questions.length - 1) { finishLocal(correct); return }
    setIndex(index + 1); setChosen(null); setRevealed(false); setLeft(WAKTU_PER_SOAL)
  }

  if (stage === 'judul') {
    return (
      <section className="game-stage" aria-labelledby="kuis-judul">
        <div className="game-ikon-judul" aria-hidden="true"><Brain /></div>
        <h2 id="kuis-judul" className="game-judul">Kuis Adiwiyata</h2>
        <p className="game-hint">Jawab soal tentang sekolah hijau. Makin banyak benar, makin banyak Koin Hijau.</p>
        <div className="game-fakta">
          <div className="game-fakta-chip"><ListChecks aria-hidden="true" />12<span>soal</span></div>
          <div className="game-fakta-chip"><Timer aria-hidden="true" />20 dtk<span>per soal</span></div>
          <div className="game-fakta-chip"><Coins aria-hidden="true" />×3<span>koin per benar</span></div>
        </div>
        <ul className="game-aturan">
          <li><Info aria-hidden="true" /><span>Jawab sebelum waktu habis. Penjelasan muncul setelah tiap jawaban, jadi bisa sambil belajar.</span></li>
        </ul>
        <div className="game-actions game-actions--tumpuk">
          <button type="button" className="game-play" style={{ minHeight: 44 }} onClick={mulai}><Play aria-hidden="true" /> Mulai</button>
          <button type="button" className="game-ghost" style={{ minHeight: 44 }} onClick={onExit}><LogOut aria-hidden="true" /> Keluar</button>
        </div>
      </section>
    )
  }

  if (stage === 'selesai') {
    const rekorBaru = skorAkhir > terbaikLama
    return (
      <section className="game-stage" aria-labelledby="kuis-selesai">
        <h2 id="kuis-selesai">Kuis selesai</h2>
        <p className="game-big">Benar {skorAkhir} dari {questions.length || SOAL_INSPEKSI.length}</p>
        <p className="game-hint">Kamu mendapat <b>+{koinHasil?.diberikan ?? 0} Koin Hijau</b>.</p>
        {koinHasil && koinHasil.diberikan < koinHasil.diminta && (
          <p className="game-hint">Batas harian arkade tercapai ({BATAS_KOIN_ARKADE_HARIAN} Koin Hijau/hari). Coba lagi besok.</p>
        )}
        <p className="game-hint">
          Rekor terbaik: <b>{Math.max(terbaikLama, skorAkhir)} benar</b>
          {rekorBaru && ' — Rekor baru!'}
        </p>
        <div className="game-actions game-actions--tumpuk">
          <button type="button" className="game-play" style={{ minHeight: 44 }} onClick={mulai}><Play aria-hidden="true" /> Main lagi</button>
          <button type="button" className="game-ghost" style={{ minHeight: 44 }} onClick={onExit}><LogOut aria-hidden="true" /> Kembali ke dunia</button>
        </div>
      </section>
    )
  }

  const current = questions[index]
  if (!current) {
    return (
      <section className="game-stage" role="alert">
        <p>Soal kuis belum dapat dimuat. Coba lagi.</p>
        <button className="game-ghost" type="button" style={{ minHeight: 44 }} onClick={onExit}>Kembali ke dunia</button>
      </section>
    )
  }

  if (jeda) {
    return (
      <section className="game-stage" role="dialog" aria-modal="true" aria-label="Jeda">
        <h2>Jeda</h2>
        <p className="game-hint">Hitungan waktu berhenti. Progres kampanye (Koin Hijau) tetap tersimpan.</p>
        <div className="game-actions">
          <button type="button" className="game-play" style={{ minHeight: 44 }} onClick={() => setJeda(false)}><Play aria-hidden="true" /> Lanjutkan</button>
          <button type="button" className="game-ghost" style={{ minHeight: 44 }} onClick={onExit}><LogOut aria-hidden="true" /> Keluar</button>
        </div>
      </section>
    )
  }

  return (
    <section className="game-stage">
      <div className="game-hud"><span>Soal <b>{index + 1}/{questions.length}</b></span><span>Benar <b>{correct}</b></span><span>Waktu <b>{revealed ? '-' : `${left}s`}</b></span></div>
      <div className="game-controls">
        <button type="button" className="game-play" style={{ minHeight: 44 }} onClick={() => setJeda(true)}><Pause aria-hidden="true" /> Jeda</button>
        <button type="button" className="game-ghost" style={{ minHeight: 44 }} onClick={onExit}><LogOut aria-hidden="true" /> Keluar</button>
      </div>
      <h2 className="game-question">{current.q}</h2>
      <div className="game-options" role="group" aria-label="Pilihan jawaban">
        {current.options.map((option, i) => {
          const state = revealed ? (i === current.correctIndex ? 'right' : i === chosen ? 'wrong' : '') : ''
          return <button key={option.key} type="button" className={`game-option ${state}`} disabled={revealed} onClick={() => answer(i)}>{option.text}</button>
        })}
      </div>
      {revealed && (
        <div className="game-explain" aria-live="polite">
          <p><b>{chosen === current.correctIndex ? 'Benar!' : chosen === null ? 'Waktu habis.' : 'Kurang tepat.'}</b> {current.explanation}</p>
          <p><a href="/edukasi" target="_blank" rel="noreferrer">Pelajari lebih lanjut di Edukasi</a></p>
          <button className="game-play" type="button" style={{ minHeight: 44 }} onClick={next}>{index >= questions.length - 1 ? 'Lihat hasil' : 'Soal berikutnya'}</button>
        </div>
      )}
    </section>
  )
}
