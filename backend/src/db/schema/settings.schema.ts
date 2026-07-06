import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const settingsTable = pgTable('settings', {
  id: text('id').primaryKey().default('PROFILE'),
  schoolName: text('school_name').notNull().default('Yayasan Pendidikan Islam Madrasah Terpadu'),
  miName: text('mi_name').notNull().default('Madrasah Ibtidaiyah (MI) Terpadu'),
  mtsName: text('mts_name').notNull().default('Madrasah Tsanawiyah (MTs) Terpadu'),
  maName: text('ma_name').notNull().default('Madrasah Aliyah (MA) Terpadu'),
  address: text('address').notNull().default('Jl. Pendidikan Islam No. 45, Kecamatan Sukamaju, Kota Bandung'),
  phone: text('phone').notNull().default('022-7654321'),
  email: text('email').notNull().default('info@madrasah-terpadu.sch.id'),
  receiptFooter: text('receipt_footer').notNull().default('Terima kasih atas pembayaran Anda. Semoga berkah.'),
  rolePermissions: text('role_permissions').default('{}'), // JSON string mapping Role to Array of allowed Menu IDs
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
