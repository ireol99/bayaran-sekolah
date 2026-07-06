import { db } from './src/config/database';
import { sql } from 'drizzle-orm';

async function migrate() {
  // Create billing_types table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS billing_types (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `);

  console.log('✅ Table billing_types created');

  // Seed default billing types
  const defaults = [
    { code: 'SPP', name: 'SPP Bulanan', description: 'Sumbangan Pembinaan Pendidikan Bulanan' },
    { code: 'BANGUNAN', name: 'Uang Bangunan', description: 'Biaya pembangunan dan pemeliharaan gedung' },
    { code: 'UJIAN', name: 'Uang Ujian', description: 'Biaya penyelenggaraan ujian semester/akhir' },
    { code: 'SERAGAM', name: 'Paket Seragam', description: 'Pengadaan paket seragam sekolah' },
    { code: 'KEGIATAN', name: 'Uang Kegiatan', description: 'Biaya kegiatan ekstrakurikuler dan study tour' },
    { code: 'BUKU', name: 'Uang Buku', description: 'Pengadaan buku pelajaran' },
  ];

  for (const bt of defaults) {
    await db.execute(sql`
      INSERT INTO billing_types (code, name, description)
      VALUES (${bt.code}, ${bt.name}, ${bt.description})
      ON CONFLICT (code) DO NOTHING
    `);
  }

  console.log('✅ billing_types seeded with', defaults.length, 'default entries');
}

migrate().catch(console.error);
