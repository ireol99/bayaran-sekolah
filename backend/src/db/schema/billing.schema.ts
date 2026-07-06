import { pgTable, uuid, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * -----------------------------------------------------------------------------
 * SCHEMA: Smart Billing Engine (Frozen Price Pattern)
 * -----------------------------------------------------------------------------
 * Master Template Harga dan Tagihan Siswa (Invoices).
 */

// 0. Tabel Jenis Tagihan (Billing Types)
export const billingTypesTable = pgTable('billing_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // Contoh: "SPP", "BANGUNAN", "UJIAN"
  name: text('name').notNull(), // Contoh: "SPP Bulanan", "Uang Bangunan"
  description: text('description'), // Deskripsi singkat jenis tagihan
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 1. Template Harga Master Tagihan
export const feeTemplatesTable = pgTable('fee_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // Contoh: "SPP Bulanan MI 2025/2026"
  academicYear: text('academic_year').notNull(), // Contoh: "2025/2026"
  levelId: uuid('level_id').notNull(),
  baseAmount: numeric('base_amount', { precision: 12, scale: 2 }).notNull(), // Harga dasar sebelum diskon
  category: text('category').notNull().default('SPP'), // Merujuk ke billingTypesTable.code
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Tagihan Siswa (Invoices) - Frozen Price Pattern
export const invoicesTable = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: text('invoice_number').notNull().unique(), // Nomor unik tagihan: INV/2026/07/001
  studentId: uuid('student_id').notNull(),
  feeTemplateId: uuid('fee_template_id').notNull(),
  academicYear: text('academic_year').notNull(),
  period: text('period').notNull(), // Contoh: "Juli 2026", "Agustus 2026"
  baseAmount: numeric('base_amount', { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  finalAmount: numeric('final_amount', { precision: 12, scale: 2 }).notNull(), // baseAmount - discountAmount (FROZEN)
  paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull().default('0.00'), // Total nominal yang sudah dibayar
  remainingAmount: numeric('remaining_amount', { precision: 12, scale: 2 }).notNull(), // Sisa tagihan
  status: text('status', { enum: ['UNPAID', 'PARTIAL', 'PAID'] }).notNull().default('UNPAID'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type InvoiceSelect = typeof invoicesTable.$inferSelect;
export type InvoiceInsert = typeof invoicesTable.$inferInsert;
