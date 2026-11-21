// Skema Drizzle. Hanya tabel yang dipakai lewat Drizzle di kode yang ada.
// Nama kolom mengikuti snake_case di Postgres; nama properti camelCase.
// Tabel neon_auth.user dikelola Neon Auth — skema di sini hanya membaca
// kolom id (satu-satunya yang dipakai Drizzle di repo), plus name/email
// yang dipakai query mentah getManagedAccounts/listStaff.
import {
  bigint,
  boolean,
  customType,
  date,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Drizzle 0.45 tidak menyediakan kolom bytea bawaan; didefinisikan
// lewat customType. Driver pg mengembalikan bytea sebagai Buffer.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
  toDriver(value: Buffer) {
    return value
  },
  fromDriver(value: Buffer) {
    return value as Buffer
  },
})

const neonAuth = pgSchema('neon_auth')

export const neonAuthUsers = neonAuth.table('user', {
  id: uuid('id').primaryKey(),
  name: text('name'),
  email: text('email'),
})

export const adiwiyataUserRoles = pgTable('adiwiyata_user_roles', {
  userId: uuid('user_id').primaryKey(),
  // Nilai DB: 'admin' | 'officer' | 'visitor'. Aplikasi memakai
  // 'admin' | 'petugas' | 'pengunjung' — pemetaan ada di lib/auth/access.
  role: text('role').notNull().default('visitor'),
  className: text('class_name'),
  totalPoin: integer('total_poin').notNull().default(0),
  tampilInisial: boolean('tampil_inisial').notNull().default(false),
  diblokirLeaderboard: boolean('diblokir_leaderboard').notNull().default(false),
  expiresOn: date('expires_on'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adiwiyataDocuments = pgTable('adiwiyata_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('Umum'),
  blobUrl: text('blob_url').notNull(),
  blobPathname: text('blob_pathname').notNull().unique(),
  contentType: text('content_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  uploadedBy: uuid('uploaded_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adiwiyataEducationVideos = pgTable('adiwiyata_education_videos', {
  videoId: text('video_id').primaryKey(),
  title: text('title').notNull(),
  youtubeUrl: text('youtube_url').notNull(),
  category: text('category').notNull().default('Pemilahan Sampah'),
  description: text('description').notNull().default(''),
  duration: text('duration').notNull().default(''),
  publishedAt: date('published_at'),
  displayOrder: integer('display_order').notNull().default(0),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adiwiyataVideoDisplaySettings = pgTable('adiwiyata_video_display_settings', {
  videoId: text('video_id').primaryKey(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Pengaturan umum key/value (dipakai konten situs: key 'adiwiyata_site_content').
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull().default({}),
  diubahOleh: uuid('diubah_oleh'),
  diubahPada: timestamp('diubah_pada', { withTimezone: true }).notNull().defaultNow(),
})

// --- Slider beranda ---
// PERINGATAN: keempat tabel slider TIDAK punya migrasi di db/ pada zip
// asli. DDL-nya ditambahkan di db/migrations/0003_slider_tables.sql
// dan dibuat ulang secara idempotent oleh ensureSliderSchema()
// (lib/slider/data) setiap kali action slider dijalankan.
export const sliderSlides = pgTable('slider_slides', {
  id: uuid('id').primaryKey().defaultRandom(),
  imageUrl: text('image_url').notNull(),
  altText: text('alt_text').notNull(),
  judul: text('judul'),
  deskripsi: text('deskripsi'),
  ctaTeks: text('cta_teks'),
  ctaUrl: text('cta_url'),
  // bigint: nilai awal Date.now() (ms epoch), lalu 0,1,2,... saat reorder.
  urutan: bigint('urutan', { mode: 'number' }).notNull().default(0),
  aktif: boolean('aktif').notNull().default(true),
  tanggalMulai: date('tanggal_mulai'),
  tanggalSelesai: date('tanggal_selesai'),
  dibuatOleh: uuid('dibuat_oleh').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sliderImages = pgTable('slider_images', {
  slideId: uuid('slide_id')
    .primaryKey()
    .references(() => sliderSlides.id, { onDelete: 'cascade' }),
  imageData: bytea('image_data').notNull(),
  imageType: text('image_type').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sliderSettings = pgTable('slider_settings', {
  id: boolean('id').primaryKey(),
  intervalDetik: integer('interval_detik').notNull().default(5),
  transisi: text('transisi').notNull().default('fade'),
  autoplay: boolean('autoplay').notNull().default(true),
  tampilPanah: boolean('tampil_panah').notNull().default(true),
  tampilDots: boolean('tampil_dots').notNull().default(true),
  updatedBy: uuid('updated_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sliderActivityLog = pgTable('slider_activity_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  actorId: uuid('actor_id').notNull(),
  action: text('action').notNull(),
  slideId: uuid('slide_id'),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
