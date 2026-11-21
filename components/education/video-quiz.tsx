'use client'

import { useState, type FormEvent } from 'react'

const questions = [
  { prompt: 'Kapan sampah sebaiknya dipilah?', options: ['Setelah sampai di TPA', 'Sejak dari sumbernya', 'Hanya saat kerja bakti'], answer: 1, explanation: 'Memilah dari sumber menjaga bahan yang masih bisa diolah tetap bersih dan mudah dikumpulkan.' },
  { prompt: 'Apa yang sebaiknya dilakukan sebelum kemasan didaur ulang?', options: ['Dibersihkan dan dikeringkan', 'Dicampur dengan sisa makanan', 'Dibakar lebih dulu'], answer: 0, explanation: 'Kemasan yang bersih dan kering mengurangi kontaminasi saat proses daur ulang.' },
  { prompt: 'Sampah organik seperti sisa sayur dapat diolah menjadi…', options: ['Kompos', 'Limbah elektronik', 'Residu berbahaya'], answer: 0, explanation: 'Sisa bahan alami dapat dikomposkan untuk membantu menyuburkan tanaman.' },
  { prompt: 'Baterai bekas termasuk jenis sampah yang perlu…', options: ['Dicampur dengan daun kering', 'Dibuang ke komposter', 'Dipisahkan dan diserahkan ke pengelola khusus'], answer: 2, explanation: 'Baterai termasuk sampah berbahaya dan perlu ditangani melalui jalur pengumpulan khusus.' },
]

export function VideoQuiz() {
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1))
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (answers.some((answer) => answer < 0)) {
      setMessage('Pilih satu jawaban untuk setiap soal sebelum melihat hasil.')
      return
    }
    setSubmitted(true)
    setMessage(`Skor kamu ${answers.filter((answer, index) => answer === questions[index].answer).length} dari ${questions.length}.`)
  }

  function reset() {
    setAnswers(Array(questions.length).fill(-1))
    setSubmitted(false)
    setMessage('')
  }

  return (
    <section className="education-quiz" aria-labelledby="quiz-heading">
      <div className="education-subheading"><span className="education-overline">CEK PEMAHAMAN</span><h3 id="quiz-heading">Kuis Singkat</h3><p>Empat pertanyaan kecil untuk mengingat kebiasaan baik.</p></div>
      <form onSubmit={submit}>
        {questions.map((question, questionIndex) => (
          <fieldset className="quiz-question" key={question.prompt}>
            <legend><span>{String(questionIndex + 1).padStart(2, '0')}</span>{question.prompt}</legend>
            <div className="quiz-options">{question.options.map((option, optionIndex) => (
              <label className={`quiz-option${answers[questionIndex] === optionIndex ? ' is-selected' : ''}`} key={option}>
                <input type="radio" name={`quiz-question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} disabled={submitted} onChange={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))} />
                <span>{option}</span>
              </label>
            ))}</div>
            {submitted && <p className={`quiz-explanation${answers[questionIndex] === question.answer ? ' is-correct' : ''}`}>{answers[questionIndex] === question.answer ? 'Tepat. ' : 'Belum tepat. '}{question.explanation}</p>}
          </fieldset>
        ))}
        <div className="quiz-submit-row"><p aria-live="polite" className="quiz-result">{message}</p>{submitted ? <button className="education-outline-button" type="button" onClick={reset}>Ulangi kuis</button> : <button className="education-primary-button" type="submit">Lihat skor</button>}</div>
      </form>
    </section>
  )
}
