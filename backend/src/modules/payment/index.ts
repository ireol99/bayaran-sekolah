import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { studentsTable, invoicesTable, transactionsTable, auditTrailsTable } from '../../db/schema';
import { eq, like, or } from 'drizzle-orm';
import { successResponse, errorResponse } from '../../common/utils/response';
import { authPlugin } from '../../common/middlewares/auth.middleware';

/**
 * -----------------------------------------------------------------------------
 * MODULE 4: POS Cashier & Flexible Payment Module (No-Delete Policy)
 * -----------------------------------------------------------------------------
 * Fitur pencarian cepat kasir, pembayaran cicilan/parsial, cetak struk, & VOID.
 */

export const paymentModule = new Elysia({ prefix: '/api/v1/pos' })
  .use(authPlugin)

  // ===========================================================================
  // 1. PENCARIAN CEPAT KASIR (BY NIS / NAMA)
  // ===========================================================================
  .get('/search', async ({ query }) => {
    const keyword = query.q?.trim();
    if (!keyword) {
      return errorResponse('Harap masukkan keyword pencarian (NIS atau Nama).');
    }

    // Cari siswa
    const matchedStudents = await db
      .select()
      .from(studentsTable)
      .where(or(like(studentsTable.name, `%${keyword}%`), like(studentsTable.nis, `%${keyword}%`)))
      .limit(10);

    if (matchedStudents.length === 0) {
      return successResponse('Siswa tidak ditemukan', []);
    }

    // Ambil tagihan aktif per siswa
    const results = [];
    for (const student of matchedStudents) {
      const invoices = await db
        .select()
        .from(invoicesTable)
        .where(eq(invoicesTable.studentId, student.id));

      results.push({
        student,
        invoices,
      });
    }

    return successResponse('Hasil pencarian kasir', results);
  })

  // ===========================================================================
  // 2. PROSES PEMBAYARAN KASIR (FLEXIBLE / PARTIAL PAYMENT)
  // ===========================================================================
  .post(
    '/pay',
    async ({ body, getAuthUser }) => {
      const user = await getAuthUser();
      const { invoiceId, amount, paymentMethod, notes } = body;

      // 1. Ambil Tagihan
      const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);
      if (!invoice) {
        return errorResponse('Tagihan tidak ditemukan.');
      }

      if (invoice.status === 'PAID') {
        return errorResponse('Tagihan ini sudah lunas 100%.');
      }

      const currentRemaining = Number(invoice.remainingAmount);
      const payAmount = Number(amount);

      if (payAmount <= 0) {
        return errorResponse('Nominal pembayaran harus lebih besar dari 0.');
      }

      if (payAmount > currentRemaining) {
        return errorResponse(`Nominal pembayaran (Rp ${payAmount.toLocaleString()}) melebihi sisa tagihan (Rp ${currentRemaining.toLocaleString()}).`);
      }

      // 2. Hitung Status Baru & Akumulasi Pembayaran
      const newPaid = Number(invoice.paidAmount) + payAmount;
      const newRemaining = Number(invoice.finalAmount) - newPaid;
      const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

      // 3. Simpan Record Transaksi
      const transactionNum = `TRX/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;

      const [transaction] = await db
        .insert(transactionsTable)
        .values({
          transactionNumber: transactionNum,
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          cashierId: user.id,
          amount: payAmount.toFixed(2),
          paymentMethod: paymentMethod || 'CASH',
          type: 'PAYMENT',
          notes: notes || 'Pembayaran Kasir',
        })
        .returning();

      // 4. Update Status Tagihan (Invoice)
      await db
        .update(invoicesTable)
        .set({
          paidAmount: newPaid.toFixed(2),
          remainingAmount: newRemaining.toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoicesTable.id, invoice.id));

      // 5. Catat Audit Trail
      await db.insert(auditTrailsTable).values({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'PAYMENT_PROCESS',
        module: 'POS',
        details: {
          transactionNumber: transactionNum,
          invoiceId: invoice.id,
          amount: payAmount,
          paymentMethod,
        },
      });

      return successResponse('Pembayaran berhasil diproses.', {
        transaction,
        invoiceStatus: newStatus,
        remainingAmount: newRemaining,
      });
    },
    {
      body: t.Object({
        invoiceId: t.String(),
        amount: t.Number({ minimum: 1 }),
        paymentMethod: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )

  // ===========================================================================
  // 3. PEMBATALAN TRANSAKSI (VOID - NO DELETE POLICY)
  // ===========================================================================
  .post(
    '/void',
    async ({ body, getAuthUser, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const user = await getAuthUser();
      const { transactionId, voidReason } = body;

      // 1. Ambil Transaksi Asli
      const [trx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId)).limit(1);
      if (!trx) {
        return errorResponse('Transaksi tidak ditemukan.');
      }

      if (trx.type === 'VOID' || trx.voidedAt) {
        return errorResponse('Transaksi ini sudah pernah dibatalkan (VOID).');
      }

      // 2. Ambil Tagihan Terkait
      const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, trx.invoiceId)).limit(1);
      if (!invoice) {
        return errorResponse('Tagihan terkait tidak ditemukan.');
      }

      const trxAmount = Number(trx.amount);
      const newPaid = Math.max(0, Number(invoice.paidAmount) - trxAmount);
      const newRemaining = Number(invoice.finalAmount) - newPaid;
      let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
      if (newPaid > 0 && newRemaining > 0) {
        newStatus = 'PARTIAL';
      } else if (newRemaining <= 0 && newPaid > 0) {
        newStatus = 'PAID';
      }

      // 3. Tandai transaksi lama sebagai VOID
      await db
        .update(transactionsTable)
        .set({
          voidedAt: new Date(),
          voidReason,
        })
        .where(eq(transactionsTable.id, trx.id));

      // 4. Buat record transaksi pembalik bertipe VOID (nominal minus)
      const voidTrxNum = `VOID-${trx.transactionNumber}`;
      await db.insert(transactionsTable).values({
        transactionNumber: voidTrxNum,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        cashierId: user.id,
        amount: (-trxAmount).toFixed(2),
        paymentMethod: trx.paymentMethod,
        type: 'VOID',
        voidReason,
        notes: `Pembatalan dari transaksi ${trx.transactionNumber}`,
      });

      // 5. Kembalikan sisa tagihan di Invoice
      await db
        .update(invoicesTable)
        .set({
          paidAmount: newPaid.toFixed(2),
          remainingAmount: newRemaining.toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoicesTable.id, invoice.id));

      // 6. Catat Audit Trail Pembatalan
      await db.insert(auditTrailsTable).values({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'TRANSACTION_VOID',
        module: 'POS',
        details: {
          originalTransaction: trx.transactionNumber,
          voidReason,
          refundAmount: trxAmount,
        },
      });

      return successResponse('Transaksi berhasil di-VOID.', {
        refundedAmount: trxAmount,
        invoiceStatus: newStatus,
        remainingAmount: newRemaining,
      });
    },
    {
      body: t.Object({
        transactionId: t.String(),
        voidReason: t.String({ minLength: 3 }),
      }),
    }
  )

  // ===========================================================================
  // 4. RECEIPT DATA FOR THERMAL PRINTER (58mm / 80mm)
  // ===========================================================================
  .get('/receipt/:transactionId', async ({ params }) => {
    const [trx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, params.transactionId)).limit(1);
    if (!trx) {
      return errorResponse('Transaksi tidak ditemukan.');
    }

    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, trx.invoiceId)).limit(1);
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, trx.studentId)).limit(1);

    return successResponse('Data Struk Pembayaran', {
      header: {
        schoolName: 'MADRASAH TERPADU EDU-PAY',
        address: 'Jl. Pendidikan No. 45, Indonesia',
        phone: '0812-3456-7890',
      },
      transaction: {
        number: trx.transactionNumber,
        date: trx.createdAt,
        paymentMethod: trx.paymentMethod,
        amount: Number(trx.amount),
      },
      invoice: {
        number: invoice?.invoiceNumber,
        period: invoice?.period,
        finalAmount: Number(invoice?.finalAmount),
        paidAmount: Number(invoice?.paidAmount),
        remainingAmount: Number(invoice?.remainingAmount),
        status: invoice?.status,
      },
      student: {
        name: student?.name,
        nis: student?.nis,
      },
    });
  });
