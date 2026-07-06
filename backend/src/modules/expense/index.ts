import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { expenseCategoriesTable, expensesTable, auditTrailsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '../../common/utils/response';
import { authPlugin } from '../../common/middlewares/auth.middleware';

/**
 * -----------------------------------------------------------------------------
 * MODULE 6: Expense Management (Pengeluaran Kas Madrasah)
 * -----------------------------------------------------------------------------
 * Pencatatan pengeluaran operasional per kategori & tahun akademik.
 */

export const expenseModule = new Elysia({ prefix: '/api/v1/expenses' })
  .use(authPlugin)

  // ===========================================================================
  // 1. KATEGORI PENGELUARAN
  // ===========================================================================
  .get('/categories', async () => {
    const categories = await db.select().from(expenseCategoriesTable);
    return successResponse('Daftar kategori pengeluaran', categories);
  })

  .post(
    '/categories',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const [category] = await db
        .insert(expenseCategoriesTable)
        .values({
          name: body.name,
          description: body.description,
        })
        .returning();
      return successResponse('Kategori pengeluaran berhasil dibuat', category);
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
      }),
    }
  )

  // ===========================================================================
  // 2. DAFTAR & CATAT PENGELUARAN
  // ===========================================================================
  .get('/', async () => {
    const expenses = await db.select().from(expensesTable);
    return successResponse('Daftar transaksi pengeluaran', expenses);
  })

  .post(
    '/',
    async ({ body, getAuthUser, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const user = await getAuthUser();

      const refNo = `EXP/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;

      const [expense] = await db
        .insert(expensesTable)
        .values({
          refNo,
          categoryId: body.categoryId,
          academicYear: body.academicYear,
          description: body.description,
          totalAmount: body.totalAmount.toString(),
          createdById: user.id,
        })
        .returning();

      await db.insert(auditTrailsTable).values({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'CREATE_EXPENSE',
        module: 'EXPENSE',
        details: { refNo, amount: body.totalAmount, description: body.description },
      });

      return successResponse('Pengeluaran berhasil dicatat', expense);
    },
    {
      body: t.Object({
        categoryId: t.String(),
        academicYear: t.String(),
        description: t.String(),
        totalAmount: t.Number({ minimum: 1 }),
      }),
    }
  )

  // ===========================================================================
  // 3. PEMBATALAN PENGELUARAN (VOID EXPENSE)
  // ===========================================================================
  .post(
    '/:id/void',
    async ({ params, body, getAuthUser, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const user = await getAuthUser();

      const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, params.id)).limit(1);
      if (!expense) {
        return errorResponse('Transaksi pengeluaran tidak ditemukan.');
      }

      if (expense.voidedAt) {
        return errorResponse('Pengeluaran ini sudah di-VOID sebelumnya.');
      }

      await db
        .update(expensesTable)
        .set({
          voidedAt: new Date(),
          voidReason: body.voidReason,
        })
        .where(eq(expensesTable.id, expense.id));

      await db.insert(auditTrailsTable).values({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'VOID_EXPENSE',
        module: 'EXPENSE',
        details: { refNo: expense.refNo, voidReason: body.voidReason },
      });

      return successResponse('Pengeluaran berhasil di-VOID.', { refNo: expense.refNo });
    },
    {
      body: t.Object({
        voidReason: t.String({ minLength: 3 }),
      }),
    }
  );
