'use client'

import { motion } from 'motion/react'
import { Activity, ArrowDownUp, BarChart3, BookOpenCheck, Database, GraduationCap, Leaf, Recycle, ShieldCheck, UsersRound } from 'lucide-react'
import { CountUp, fadeUpChild, staggerParent } from '@/components/animations'

const wasteCategories = ['Organik', 'Anorganik', 'Residu', 'B3', 'Kertas']

const team = [
  { name: 'Deni Aryadi', detail: 'XII-E', initials: 'DA' },
  { name: 'Ica Trisnawati', detail: 'XII-E', initials: 'IT' },
  { name: 'Nadiya Ayu Artanti', detail: 'XII-E', initials: 'NA' },
]

const features = [
  { icon: Database, title: 'Data terhubung', description: 'Integrasi otomatis dengan Google Sheets membantu pencatatan tersusun dan mudah ditinjau.' },
  { icon: Activity, title: 'Pantau per tanggal', description: 'Filter rentang tanggal memudahkan pemantauan penggunaan tumbler, lunch box, dan volume sampah.' },
  { icon: BookOpenCheck, title: 'Mudah diakses', description: 'Informasi dan edukasi interaktif dirancang untuk siswa maupun admin sekolah.' },
]

export function AboutSection() {
  return (
    <section className="adi-about" aria-label="Tentang Adiwiyata 55">
      <motion.div className="adi-about-grid" variants={staggerParent} initial="hidden" animate="show">
        <motion.article className="adi-about-card adi-about-story" variants={fadeUpChild} whileHover={{ y: -4 }}>
          <span className="adi-about-kicker"><Leaf aria-hidden="true" /> PLATFORM DIGITAL · SMAN 55 JAKARTA</span>
          <h2>Pemantauan digital menggantikan catatan kertas</h2>
          <p>Adiwiyata 55 adalah platform digital berbasis web untuk sistem monitoring program Adiwiyata di lingkungan SMAN 55 Jakarta.</p>
          <p>Platform ini lahir untuk menggantikan pencatatan volume sampah manual berbasis kertas dengan sistem digital yang transparan dan akurat, yang bisa dipantau kapan saja.</p>
          <div className="adi-about-transition" aria-label="Perubahan pencatatan dari manual menjadi digital">
            <span><BookOpenCheck aria-hidden="true" /> Catatan kertas</span>
            <ArrowDownUp aria-hidden="true" />
            <span><BarChart3 aria-hidden="true" /> Monitoring digital</span>
          </div>
          <p>Program yang dipantau platform ini bisa dilihat di halaman <a href="/adiwiyata/program">Program &amp; kegiatan</a>.</p>
        </motion.article>

        <motion.article className="adi-about-card adi-about-impact" variants={fadeUpChild} whileHover={{ y: -4 }}>
          <span className="adi-about-kicker"><BarChart3 aria-hidden="true" /> TUJUAN PENELITIAN</span>
          <strong className="adi-about-impact-number"><CountUp value={5} /></strong>
          <h2>Kategori sampah terpilah</h2>
          <p>Mengukur efektivitas kebijakan membawa tempat makan dan tumbler dari rumah terhadap penurunan volume sampah.</p>
          <div className="adi-about-tags" aria-label="Lima kategori sampah">
            {wasteCategories.map((category) => <span key={category}>{category}</span>)}
          </div>
        </motion.article>

        <motion.article className="adi-about-card adi-about-awareness" variants={fadeUpChild} whileHover={{ y: -4 }}>
          <span className="adi-about-icon"><ShieldCheck aria-hidden="true" /></span>
          <span className="adi-about-kicker">DAMPAK YANG DIHARAPKAN</span>
          <h2>Dampak yang diharapkan: kesadaran, kedisiplinan, dan literasi</h2>
          <p>Meningkatkan kesadaran, kedisiplinan, dan literasi lingkungan seluruh warga sekolah SMAN 55 Jakarta.</p>
          <div className="adi-about-pillars"><span>Kesadaran</span><span>Kedisiplinan</span><span>Literasi</span></div>
        </motion.article>

        <motion.article className="adi-about-card adi-about-team" variants={fadeUpChild} whileHover={{ y: -4 }}>
          <div className="adi-about-card-heading">
            <span className="adi-about-icon"><UsersRound aria-hidden="true" /></span>
            <div><span className="adi-about-kicker">KELOMPOK 49 · KELAS XII-E</span><h2>Tim pengembang</h2></div>
          </div>
          <p className="adi-about-team-note">Dikembangkan sebagai bagian dari penelitian karya tulis ilmiah sekolah.</p>
          <div className="adi-about-team-list">
            {team.map((member, index) => (
              <div className="adi-about-member" key={member.name} title={member.name}>
                <span className={`adi-about-avatar avatar-${index + 1}`} aria-hidden="true">{member.initials}</span>
                <span><strong>{member.name}</strong><small>{member.detail}</small></span>
                <GraduationCap aria-hidden="true" />
              </div>
            ))}
          </div>
        </motion.article>

        {features.map(({ icon: Icon, title, description }, index) => (
          <motion.article className={`adi-about-card adi-about-feature feature-${index + 1}`} key={title} variants={fadeUpChild} whileHover={{ y: -4 }}>
            <span className="adi-about-icon"><Icon aria-hidden="true" /></span>
            <span className="adi-about-kicker">KEUNGGULAN 0{index + 1}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </motion.article>
        ))}

        <div className="adi-about-footnote"><Recycle aria-hidden="true" /><p>Memilah hari ini, memahami dampaknya untuk esok.</p></div>
      </motion.div>
    </section>
  )
}
