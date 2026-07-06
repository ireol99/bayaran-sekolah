import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core';

/**
 * -----------------------------------------------------------------------------
 * SCHEMA: Student Savings Module (Tabungan Siswa)
 * -----------------------------------------------------------------------------
 * Mengelola saldo tabungan siswa dan histori mutasi setor/tarik/bayar tagihan.
 */

// 1. Akun Tabungan Siswa (1 Siswa = 1 Akun Tabungan)
export const savingAccountsTable = pgTable('saving_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().unique(),
  accountNumber: text('account_number').notNull().unique(), // Contoh: TAB/2026/0001
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Transaksi Mutasi Tabungan
export const savingTransactionsTable = pgTable('saving_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull(),
  studentId: uuid('student_id').notNull(),
  type: text('type', { enum: ['DEPOSIT', 'WITHDRAWAL', 'PAYMENT'] }).notNull(), // Setor, Tarik, Bayar Tagihan
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
  referenceNo: text('reference_no'), // No transaksi atau invoice terkait
  description: text('description'),
  createdById: uuid('created_by_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SavingAccountSelect = typeof savingAccountsTable.$inferSelect;
export type SavingTransactionSelect = typeof savingTransactionsTable.$inferSelect;
