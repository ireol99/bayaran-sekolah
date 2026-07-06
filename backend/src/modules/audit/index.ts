import { Elysia } from 'elysia';
import { db } from '../../config/database';
import { auditTrailsTable, invoicesTable, transactionsTable, expensesTable, studentsTable } from '../../db/schema';
import { isNull } from 'drizzle-orm';
import { successResponse } from '../../common/utils/response';
import { authPlugin } from '../../common/middlewares/auth.middleware';

/**
 * -----------------------------------------------------------------------------
 * MODULE 7: Audit Trail & Executive Analytics Dashboard
 * -----------------------------------------------------------------------------
 * Menyediakan Audit Trail Log dan Dashboard Analytics Kepala Sekolah & Yayasan.
 */

export const auditModule = new Elysia({ prefix: '/api/v1/audit' })
  .use(authPlugin)

  // ===========================================================================
  // 1. GET AUDIT LOGS
  // ===========================================================================
  .get('/logs', async ({ requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'KEPALA_SEKOLAH', 'YAYASAN']);
    const logs = await db.select().from(auditTrailsTable).limit(100);
    return successResponse('Daftar audit log aktivitas', logs);
  })

  // ===========================================================================
  // 2. DASHBOARD EXECUTIVE ANALYTICS (KEPALA SEKOLAH & YAYASAN)
  // ===========================================================================
  .get('/analytics/dashboard', async ({ requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN']);

    // 1. Total Tagihan Diterbitkan
    const allInvoices = await db.select().from(invoicesTable);
    const totalBillingAmount = allInvoices.reduce((acc, inv) => acc + Number(inv.finalAmount), 0);
    const totalPaidAmount = allInvoices.reduce((acc, inv) => acc + Number(inv.paidAmount), 0);
    const totalRemainingAmount = allInvoices.reduce((acc, inv) => acc + Number(inv.remainingAmount), 0);

    const collectionRatio = totalBillingAmount > 0 ? ((totalPaidAmount / totalBillingAmount) * 100).toFixed(2) : '0.00';

    // 2. Total Pengeluaran (yang belum di-VOID)
    const allExpenses = await db.select().from(expensesTable).where(isNull(expensesTable.voidedAt));
    const totalExpenseAmount = allExpenses.reduce((acc, exp) => acc + Number(exp.totalAmount), 0);

    // 3. Arus Kas Bersih (Net Cashflow)
    const netCashflow = totalPaidAmount - totalExpenseAmount;

    // 4. Jumlah Siswa
    const allStudents = await db.select().from(studentsTable);
    const totalStudents = allStudents.length;

    return successResponse('Ringkasan Executive Dashboard Analytics', {
      summary: {
        totalStudents,
        totalBillingAmount,
        totalPaidAmount,
        totalRemainingAmount,
        collectionRatioPercent: `${collectionRatio}%`,
        totalExpenseAmount,
        netCashflow,
      },
      invoiceStatusCounts: {
        total: allInvoices.length,
        paid: allInvoices.filter((i) => i.status === 'PAID').length,
        partial: allInvoices.filter((i) => i.status === 'PARTIAL').length,
        unpaid: allInvoices.filter((i) => i.status === 'UNPAID').length,
      },
    });
  });
