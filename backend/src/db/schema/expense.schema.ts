import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core';

/**
 * -----------------------------------------------------------------------------
 * SCHEMA: Expense Management Module (Pengeluaran Kas)
 * -----------------------------------------------------------------------------
 * Catatan pengeluaran operasional madrasah beserta kategori pengeluaran.
 */

// 1. Kategori Pengeluaran (Gaji Guru, Listrik, ATK, Pemeliharaan, dll)
export const expenseCategoriesTable = pgTable('expense_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Transaksi Pengeluaran Kas
export const expensesTable = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  refNo: text('ref_no').notNull().unique(), // EXP/2026/07/001
  categoryId: uuid('category_id').notNull(),
  academicYear: text('academic_year').notNull(),
  description: text('description').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  createdById: uuid('created_by_id').notNull(),
  voidedAt: timestamp('voided_at'),
  voidReason: text('void_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ExpenseCategorySelect = typeof expenseCategoriesTable.$inferSelect;
export type ExpenseSelect = typeof expensesTable.$inferSelect;
