import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Redis from 'ioredis';
import * as schema from '../db/schema';

/**
 * -----------------------------------------------------------------------------
 * CONFIGURATION: Database & Redis Connection
 * -----------------------------------------------------------------------------
 * File ini mengkonfigurasi koneksi ke PostgreSQL via Drizzle ORM dan Redis Client.
 * Sangat aman untuk lingkungan local maupun server produksi (Ubuntu).
 */

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:adminDb@localhost:5432/bayaran_madrasah';

// 1. Inisialisasi Driver Postgres (postgres.js)
// max: 10 menentukan jumlah maksimal koneksi paralel dalam pool
export const queryClient = postgres(connectionString, { max: 10 });

// 2. Inisialisasi Drizzle ORM dengan memasukkan semua Schema modul
export const db = drizzle(queryClient, { schema });

// 3. Inisialisasi Redis Client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    // Retry interval max 2 detik
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

// Tangkap event error untuk mencegah crash "Unhandled error event"
redis.on('error', (err) => {
  // Logger pasif untuk menampung error koneksi agar ioredis tidak melempar Unhandled Error
});

// Coba koneksi ke Redis secara async (non-blocking)
redis.connect().catch((err) => {
  console.warn('⚠️ Redis connection notice:', err.message || 'Redis is offline. Cashier & WhatsApp queue will fallback to in-memory mode.');
});
