import { pgTable, uuid, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * -----------------------------------------------------------------------------
 * SCHEMA: Academic & Student Master Data Module
 * -----------------------------------------------------------------------------
 * Menyimpan data master Akademik: Tingkat (MI/MTs/MA), Kelas, Kategori Diskon, & Siswa.
 */

// 1. Tabel Tingkat Sekolah (Levels: MI, MTs, MA)
export const levelsTable = pgTable('levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // Contoh: "MI", "MTs", "MA"
  code: text('code').notNull().unique(), // Contoh: "MI", "MTS", "MA"
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Tabel Kelas (Classes)
export const classesTable = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // Contoh: "7-A", "8-B", "10-IPA-1"
  levelId: uuid('level_id').notNull(), // FK ke Level (logical ref)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Tabel Kategori Diskon (Discount Categories)
export const discountCategoriesTable = pgTable('discount_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // Contoh: "Anak Yatim", "Anak Guru", "Beasiswa"
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0.00'), // Nominal potongan
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Tabel Siswa (Students Master)
export const studentsTable = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  nis: text('nis').notNull().unique(), // Nomor Induk Siswa (Unik)
  nisn: text('nisn'), // Nomor Induk Siswa Nasional (Optional/Unik)
  name: text('name').notNull(),
  classId: uuid('class_id').notNull(),
  discountId: uuid('discount_id'), // Diskon tetap yang melekat pada siswa (optional)
  parentName: text('parent_name'),
  parentPhone: text('parent_phone').notNull(), // No WA Orang Tua untuk notifikasi
  status: text('status', { enum: ['ACTIVE', 'GRADUATED', 'MOVED', 'INACTIVE'] }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Tabel Tahun Ajaran (Academic Years)
export const academicYearsTable = pgTable('academic_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(), // Contoh: "2025/2026", "2026/2027"
  isCurrent: boolean('is_current').notNull().default(false), // Status tahun ajaran aktif saat ini
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type StudentSelect = typeof studentsTable.$inferSelect;
export type StudentInsert = typeof studentsTable.$inferInsert;
