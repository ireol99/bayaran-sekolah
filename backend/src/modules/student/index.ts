import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { levelsTable, classesTable, discountCategoriesTable, studentsTable, savingAccountsTable } from '../../db/schema';
import { eq, like, or } from 'drizzle-orm';
import { successResponse, errorResponse } from '../../common/utils/response';
import { authPlugin } from '../../common/middlewares/auth.middleware';

/**
 * -----------------------------------------------------------------------------
 * MODULE 2: Master Data Akademik & Siswa
 * -----------------------------------------------------------------------------
 * Menangani Data Tingkat (MI, MTs, MA), Kelas, Kategori Diskon, & Siswa.
 */

export const studentModule = new Elysia({ prefix: '/api/v1/academic' })
  .use(authPlugin)

  // ===========================================================================
  // 1. TINGKAT SEKOLAH (LEVELS: MI, MTs, MA)
  // ===========================================================================
  .get('/levels', async () => {
    const levels = await db.select().from(levelsTable);
    return successResponse('Daftar tingkat sekolah', levels);
  })

  .post(
    '/levels',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const [level] = await db
        .insert(levelsTable)
        .values({
          name: body.name,
          code: body.code.toUpperCase(),
        })
        .returning();
      return successResponse('Tingkat sekolah berhasil ditambahkan', level);
    },
    {
      body: t.Object({
        name: t.String(),
        code: t.String(),
      }),
    }
  )

  // ===========================================================================
  // 2. KELAS (CLASSES)
  // ===========================================================================
  .get('/classes', async () => {
    const classes = await db.select().from(classesTable);
    return successResponse('Daftar kelas', classes);
  })

  .post(
    '/classes',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const [newClass] = await db
        .insert(classesTable)
        .values({
          name: body.name,
          levelId: body.levelId,
        })
        .returning();
      return successResponse('Kelas berhasil ditambahkan', newClass);
    },
    {
      body: t.Object({
        name: t.String(),
        levelId: t.String(),
      }),
    }
  )

  // ===========================================================================
  // 3. KATEGORI DISKON (DISCOUNT CATEGORIES)
  // ===========================================================================
  .get('/discounts', async () => {
    const discounts = await db.select().from(discountCategoriesTable);
    return successResponse('Daftar kategori diskon', discounts);
  })

  .post(
    '/discounts',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const [discount] = await db
        .insert(discountCategoriesTable)
        .values({
          name: body.name,
          amount: body.amount.toString(),
          isActive: body.isActive ?? true,
        })
        .returning();
      return successResponse('Kategori diskon berhasil dibuat', discount);
    },
    {
      body: t.Object({
        name: t.String(),
        amount: t.Number({ minimum: 0 }),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  // ===========================================================================
  // 4. SISWA MASTER (STUDENTS)
  // ===========================================================================
  .get('/students', async ({ query }) => {
    const search = query.search?.trim();

    if (search) {
      const students = await db
        .select()
        .from(studentsTable)
        .where(or(like(studentsTable.name, `%${search}%`), like(studentsTable.nis, `%${search}%`)));
      return successResponse('Daftar siswa hasil pencarian', students);
    }

    const students = await db.select().from(studentsTable);
    return successResponse('Daftar seluruh siswa', students);
  })

  .post(
    '/students',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);

      // Cek apakah NIS sudah ada
      const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.nis, body.nis)).limit(1);
      if (existing) {
        return errorResponse(`NIS '${body.nis}' sudah terdaftar.`);
      }

      // 1. Simpan Siswa
      const [student] = await db
        .insert(studentsTable)
        .values({
          nis: body.nis,
          name: body.name,
          classId: body.classId,
          discountId: body.discountId || null,
          parentName: body.parentName,
          parentPhone: body.parentPhone,
        })
        .returning();

      // 2. Buat otomatis Akun Tabungan Siswa
      const accountNumber = `TAB/${new Date().getFullYear()}/${body.nis}`;
      await db.insert(savingAccountsTable).values({
        studentId: student.id,
        accountNumber,
        balance: '0.00',
      });

      return successResponse('Siswa & Akun Tabungan berhasil dibuat.', student);
    },
    {
      body: t.Object({
        nis: t.String(),
        name: t.String(),
        classId: t.String(),
        discountId: t.Optional(t.String()),
        parentName: t.Optional(t.String()),
        parentPhone: t.String(),
      }),
    }
  )

  // Import Massal Siswa dari JSON / Array
  .post(
    '/students/bulk-import',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const { items } = body;

      let importedCount = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.nis, item.nis)).limit(1);
          if (existing) {
            errors.push(`NIS ${item.nis} sudah ada (Dilewati)`);
            continue;
          }

          const [student] = await db
            .insert(studentsTable)
            .values({
              nis: item.nis,
              name: item.name,
              classId: item.classId,
              discountId: item.discountId || null,
              parentPhone: item.parentPhone,
            })
            .returning();

          await db.insert(savingAccountsTable).values({
            studentId: student.id,
            accountNumber: `TAB/${new Date().getFullYear()}/${item.nis}`,
            balance: '0.00',
          });

          importedCount++;
        } catch (e: any) {
          errors.push(`Gagal mengimpor NIS ${item.nis}: ${e.message}`);
        }
      }

      return successResponse(`Import selesai. ${importedCount} siswa berhasil diimpor.`, {
        importedCount,
        errors,
      });
    },
    {
      body: t.Object({
        items: t.Array(
          t.Object({
            nis: t.String(),
            name: t.String(),
            classId: t.String(),
            discountId: t.Optional(t.String()),
            parentPhone: t.String(),
          })
        ),
      }),
    }
  );
