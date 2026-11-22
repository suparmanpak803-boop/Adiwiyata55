'use client'

import { useState } from 'react'
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react'
import { ProgressFill } from '@/components/animations'

const questions = [
  {
    prompt: 'Botol minummu habis saat istirahat. Apa langkah paling ramah lingkungan?',
    options: ['Beli botol sekali pakai lagi', 'Isi ulang tumbler yang kamu bawa', 'Tinggalkan botol di kelas'],
    answer: 1,
    feedback: 'Tumbler dan air isi ulang tercatat sebagai kebiasaan yang didorong di sekolah.',
  },
  {
    prompt: 'Ada sisa daun dan makanan dari kegiatan kelas. Sebaiknya bagaimana?',
    options: ['Campur dengan semua jenis sampah', 'Pilah agar bisa diolah bersama sampah organik', 'Buang ke selokan'],
    answer: 1,
    feedback: 'Pemilahan organik mendukung kegiatan kompos dan pengolahan organik yang tercatat di sekolah.',
  },
  {
    prompt: 'Kamu keluar kelas dan tidak ada orang lagi di dalam. Apa aksi kecilmu?',
    options: ['Matikan lampu dan perangkat yang tidak dipakai', 'Biarkan semua tetap menyala', 'Menunggu teman lain melakukannya'],
    answer: 0,
    feedback: 'Menghemat energi bisa dimulai dari kebiasaan sederhana setiap hari.',
  },
]

export function GreenActionQuiz() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const finished = step === questions.length
  const question = questions[step]

  function chooseOption(optionIndex: number) {
    if (selected !== null) return
    setSelected(optionIndex)
    if (optionIndex === question.answer) setScore((current) => current + 1)
  }

  function nextQuestion() {
    setStep((current) => current + 1)
    setSelected(null)
  }

  function restart() {
    setStep(0)
    setSelected(null)
    setScore(0)
  }

  return (
    <section className="adi-quiz-section" aria-labelledby="adi-quiz-title">
      <div className="adi-quiz-intro">
        <span className="adi-eyebrow"><Sparkles aria-hidden="true" /> TES PENGETAHUAN ADIWIYATA</span>
        <h2 id="adi-quiz-title">Tes pengetahuan Adiwiyata kamu</h2>
        <p>Uji pengetahuanmu tentang kebiasaan ramah lingkungan di sekolah. Tidak ada data yang disimpan.</p>
      </div>

      <div className="adi-quiz-card">
        {finished ? (
          <div className="adi-quiz-result" aria-live="polite">
            <span className="adi-quiz-result-icon"><Check aria-hidden="true" /></span>
            <span className="adi-eyebrow">SELESAI · {score} DARI {questions.length} TEPAT</span>
            <h3>{score === questions.length ? 'Insting hijau kamu kuat.' : score > 0 ? 'Aksi hijau dimulai dari sini.' : 'Saatnya coba satu aksi baru.'}</h3>
            <p>{score === questions.length ? 'Kamu sudah peka memilih kebiasaan yang lebih ramah lingkungan. Ajak teman sekelas ikut, ya.' : 'Sekarang kamu punya satu ide kecil untuk dicoba di sekolah hari ini.'}</p>
            <button className="adi-quiz-restart" type="button" onClick={restart}><RotateCcw aria-hidden="true" /> Main lagi</button>
          </div>
        ) : (
          <>
            <div className="adi-quiz-topline">
              <span>PERTANYAAN {step + 1} <i>/ {questions.length}</i></span>
              <span>{score} POIN</span>
            </div>
            <div className="adi-quiz-progress" role="progressbar" aria-label="Progres kuis" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={step + 1}>
              <ProgressFill ratio={(step + 1) / questions.length} />
            </div>
            <h3 className="adi-quiz-question">{question.prompt}</h3>
            <div className="adi-quiz-answers">
              {question.options.map((option, index) => {
                const isSelected = selected === index
                const isCorrect = index === question.answer
                const resultClass = selected === null ? '' : isCorrect ? 'is-correct' : isSelected ? 'is-incorrect' : ''
                return (
                  <button className={resultClass} type="button" key={option} onClick={() => chooseOption(index)} disabled={selected !== null} aria-pressed={isSelected}>
                    <span className="adi-quiz-option-letter">{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>
                    {selected !== null && isCorrect && <Check className="adi-quiz-option-check" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
            {selected !== null && (
              <div className={`adi-quiz-feedback ${selected === question.answer ? 'is-correct' : 'is-incorrect'}`} aria-live="polite">
                <p><strong>{selected === question.answer ? 'Tepat!' : 'Belum tepat, tapi jadi tahu.'}</strong> {question.feedback}</p>
                <button type="button" onClick={nextQuestion}>{step === questions.length - 1 ? 'Lihat hasil' : 'Lanjut'} <ArrowRight aria-hidden="true" /></button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
