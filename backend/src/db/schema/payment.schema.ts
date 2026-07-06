import { pgTable, uuid, text, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * -----------------------------------------------------------------------------
 * SCHEMA: POS Payment & Transaction Module (No-Delete Policy)
 * -----------------------------------------------------------------------------
 * Catatan transaksi pembayaran kasir. Transaksi tidak pernah dihapus (DELETE),
 * melainkan di-VOID dengan record bertanda minus dan mencatat alasan pembatalan.
 */

// 1. Metode Pembayaran (Cash, Transfer, Tabungan Siswa)
export const paymentMethodsTable = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // CASH, TRANSFER, SAVINGS
  name: text('name').notNull(), // Tunai, Transfer Bank, Saldo Tabungan
  isActive: boolean('is_active').notNull().default(true),
});

// 2. Transaksi Pembayaran Kasir
export const transactionsTable = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionNumber: text('transaction_number').notNull().unique(), // TRX/2026/07/0001
  invoiceId: uuid('invoice_id').notNull(),
  studentId: uuid('student_id').notNull(),
  cashierId: uuid('cashier_id').notNull(), // User yang memproses (Admin TU)
  academicYear: text('academic_year'), // Tahun ajaran transaksi (Contoh: "2026/2027")
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // Nominal pembayaran (bisa negatif untuk VOID)
  paymentMethod: text('payment_method').notNull().default('CASH'),
  type: text('type', { enum: ['PAYMENT', 'VOID'] }).notNull().default('PAYMENT'),
  notes: text('notes'),
  voidedAt: timestamp('voided_at'),
  voidReason: text('void_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type TransactionSelect = typeof transactionsTable.$inferSelect;
export type TransactionInsert = typeof transactionsTable.$inferInsert;
