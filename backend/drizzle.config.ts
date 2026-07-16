import { defineConfig } from 'drizzle-kit';

/**
 * Konfigurasi Drizzle Kit untuk Mengelola Migrasi & Push Skema Database
 */
export default defineConfig({
  // Lokasi berkas skema Drizzle
  schema: './src/db/schema/index.ts',
  // Folder output hasil generasi SQL migration (jika pakai migration)
  out: './drizzle',
  // Dialek database yang digunakan
  dialect: 'postgresql',
  // Kredensial koneksi database
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:adminDb@localhost:5432/bayaran_madrasah',
  },
});
