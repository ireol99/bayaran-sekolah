import { db } from '../config/database';
import {
  usersTable,
  levelsTable,
  classesTable,
  discountCategoriesTable,
  studentsTable,
  savingAccountsTable,
  feeTemplatesTable,
  paymentMethodsTable,
  expenseCategoriesTable,
} from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

/**
 * -----------------------------------------------------------------------------
 * SEED SCRIPT: Data Awal Aplikasi Bayaran Madrasah
 * -----------------------------------------------------------------------------
 * Menyiapkan data awal default untuk:
 * 1. User Superadmin & Admin TU
 * 2. Tingkat Sekolah (MI, MTs, MA)
 * 3. Kelas Default
 * 4. Kategori Diskon (Anak Yatim, Anak Guru, Beasiswa)
 * 5. Metode Pembayaran (Cash, Transfer, Tabungan)
 * 6. Kategori Pengeluaran (Gaji, Operasional, ATK, Maintenance)
 */

async function main() {
  console.log('🌱 Starting database seeding process...');

  // 1. Seed Users (Superadmin & Admin TU)
  const passwordHash = await bcrypt.hash('admin123', 10);

  const [superadmin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, 'superadmin@madrasah.id'))
    .limit(1);

  if (!superadmin) {
    await db.insert(usersTable).values([
      {
        name: 'Super Administrator',
        email: 'superadmin@madrasah.id',
        passwordHash,
        role: 'SUPERADMIN',
      },
      {
        name: 'Admin TU Kasir',
        email: 'tu@madrasah.id',
        passwordHash,
        role: 'ADMIN_TU',
      },
      {
        name: 'Kepala Sekolah MI',
        email: 'kepala@madrasah.id',
        passwordHash,
        role: 'KEPALA_SEKOLAH',
      },
      {
        name: 'Pengurus Yayasan',
        email: 'yayasan@madrasah.id',
        passwordHash,
        role: 'YAYASAN',
      },
    ]);
    console.log('✅ Default users created:');
    console.log('   - superadmin@madrasah.id / admin123 (SUPERADMIN)');
    console.log('   - tu@madrasah.id / admin123 (ADMIN_TU)');
  }

  // 2. Seed Levels (MI, MTs, MA)
  const existingLevels = await db.select().from(levelsTable);
  let miLevelId = '';
  let mtsLevelId = '';
  let maLevelId = '';

  if (existingLevels.length === 0) {
    const [mi] = await db.insert(levelsTable).values({ name: 'Madrasah Ibtidaiyah', code: 'MI' }).returning();
    const [mts] = await db.insert(levelsTable).values({ name: 'Madrasah Tsanawiyah', code: 'MTS' }).returning();
    const [ma] = await db.insert(levelsTable).values({ name: 'Madrasah Aliyah', code: 'MA' }).returning();

    miLevelId = mi.id;
    mtsLevelId = mts.id;
    maLevelId = ma.id;
    console.log('✅ Default Levels created (MI, MTs, MA)');
  } else {
    miLevelId = existingLevels.find((l) => l.code === 'MI')?.id || existingLevels[0].id;
    mtsLevelId = existingLevels.find((l) => l.code === 'MTS')?.id || existingLevels[0].id;
    maLevelId = existingLevels.find((l) => l.code === 'MA')?.id || existingLevels[0].id;
  }

  // 3. Seed Classes
  const existingClasses = await db.select().from(classesTable);
  let defaultClassId = '';
  if (existingClasses.length === 0) {
    const [c1] = await db.insert(classesTable).values({ name: '1-A', levelId: miLevelId }).returning();
    await db.insert(classesTable).values({ name: '7-A', levelId: mtsLevelId });
    await db.insert(classesTable).values({ name: '10-IPA-1', levelId: maLevelId });

    defaultClassId = c1.id;
    console.log('✅ Default Classes created');
  } else {
    defaultClassId = existingClasses[0].id;
  }

  // 4. Seed Discount Categories
  const existingDiscounts = await db.select().from(discountCategoriesTable);
  let yatimDiscountId = '';
  if (existingDiscounts.length === 0) {
    const [yatim] = await db.insert(discountCategoriesTable).values({ name: 'Anak Yatim (Gratis 100%)', amount: '100.00' }).returning();
    await db.insert(discountCategoriesTable).values({ name: 'Anak Guru (Diskon 50%)', amount: '50.00' });
    await db.insert(discountCategoriesTable).values({ name: 'Beasiswa Yayasan (Diskon 75%)', amount: '75.00' });

    yatimDiscountId = yatim.id;
    console.log('✅ Default Discount Categories created');
  } else {
    yatimDiscountId = existingDiscounts[0].id;
  }

  // 5. Seed Default Students
  const existingStudents = await db.select().from(studentsTable);
  if (existingStudents.length === 0) {
    const [student1] = await db
      .insert(studentsTable)
      .values({
        nis: '2026001',
        name: 'Ahmad Fauzi',
        classId: defaultClassId,
        discountId: yatimDiscountId,
        parentName: 'Bapak Fauzi',
        parentPhone: '081234567890',
      })
      .returning();

    await db.insert(savingAccountsTable).values({
      studentId: student1.id,
      accountNumber: 'TAB/2026/2026001',
      balance: '150000.00',
    });

    const [student2] = await db
      .insert(studentsTable)
      .values({
        nis: '2026002',
        name: 'Siti Nurhaliza',
        classId: defaultClassId,
        parentName: 'Ibu Nurhaliza',
        parentPhone: '081987654321',
      })
      .returning();

    await db.insert(savingAccountsTable).values({
      studentId: student2.id,
      accountNumber: 'TAB/2026/2026002',
      balance: '50000.00',
    });

    console.log('✅ Sample Students & Saving accounts created (Ahmad Fauzi & Siti Nurhaliza)');
  }

  // 6. Seed Payment Methods
  const existingMethods = await db.select().from(paymentMethodsTable);
  if (existingMethods.length === 0) {
    await db.insert(paymentMethodsTable).values([
      { code: 'CASH', name: 'Tunai (Kasir)' },
      { code: 'TRANSFER', name: 'Transfer Bank / QRIS' },
      { code: 'SAVINGS', name: 'Saldo Tabungan Siswa' },
    ]);
    console.log('✅ Payment Methods created');
  }

  // 7. Seed Expense Categories
  const existingExpCategories = await db.select().from(expenseCategoriesTable);
  if (existingExpCategories.length === 0) {
    await db.insert(expenseCategoriesTable).values([
      { name: 'Gaji Guru & Staf', description: 'Honorarium bulanan tenaga pengajar' },
      { name: 'Operasional & Utility', description: 'Tagihan Listrik, Air, Internet' },
      { name: 'Pemeliharaan Gedung', description: 'Perbaikan sarana prasarana sekolah' },
      { name: 'ATK & Cetak', description: 'Pengadaan kertas, tinta, dan form' },
    ]);
    console.log('✅ Expense Categories created');
  }

  // 8. Seed Fee Template
  const existingTemplates = await db.select().from(feeTemplatesTable);
  if (existingTemplates.length === 0) {
    await db.insert(feeTemplatesTable).values({
      name: 'SPP Bulanan MI 2025/2026',
      academicYear: '2025/2026',
      levelId: miLevelId,
      baseAmount: '200000.00',
      category: 'SPP',
    });
    console.log('✅ Default Fee Template created (SPP MI Rp 200.000)');
  }

  console.log('🎉 Seeding completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
