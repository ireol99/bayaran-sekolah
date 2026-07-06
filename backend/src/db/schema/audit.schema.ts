import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

/**
 * -----------------------------------------------------------------------------
 * SCHEMA: Audit Trail System
 * -----------------------------------------------------------------------------
 * Mencatat semua aktivitas penting pengguna di dalam aplikasi (Login, Void, Generate, Deposit).
 */
export const auditTrailsTable = pgTable('audit_trails', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  userName: text('user_name'),
  role: text('role'),
  action: text('action').notNull(), // Contoh: "AUTH_LOGIN", "VOID_TRANSACTION", "CREATE_INVOICE"
  module: text('module').notNull(), // IAM, POS, BILLING, SAVINGS, EXPENSE
  details: jsonb('details'), // Data kontekstual JSON
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AuditTrailSelect = typeof auditTrailsTable.$inferSelect;
