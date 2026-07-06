import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * -----------------------------------------------------------------------------
 * SCHEMA: IAM (Identity & Access Management) Module
 * -----------------------------------------------------------------------------
 * Menyimpan data akun pengguna (Admin TU, Superadmin, Kepala Sekolah, Yayasan).
 */
export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', {
    enum: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'],
  }).notNull().default('ADMIN_TU'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserSelect = typeof usersTable.$inferSelect;
export type UserInsert = typeof usersTable.$inferInsert;
