import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { savingAccountsTable, savingTransactionsTable, invoicesTable, transactionsTable, auditTrailsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '../../common/utils/response';
import { authPlugin } from '../../common/middlewares/auth.middleware';

/**
 * -----------------------------------------------------------------------------
 * MODULE 5: Student Savings Module (Tabungan Siswa)
 * -----------------------------------------------------------------------------
 * Menangani Setor, Tarik, & Pembayaran Tagihan via Saldo Tabungan.
 */

export const savingsModule = new Elysia({ prefix: '/api/v1/savings' })
  .use(authPlugin)

  // ===========================================================================
  // 1. INFO TABUNGAN SISWA & MUTASI
  // ===========================================================================
  .get('/:studentId', async ({ params }) => {
    const [account] = await db
      .select()
      .from(savingAccountsTable)
      .where(eq(savingAccountsTable.studentId, params.studentId))
      .limit(1);

    if (!account) {
      return errorResponse('Akun tabungan untuk siswa ini belum ada.');
    }

    const history = await db
      .select()
      .from(savingTransactionsTable)
      .where(eq(savingTransactionsTable.accountId, account.id));

    return successResponse('Info saldo & mutasi tabungan', {
      account,
      history,
    });
  })

  // ===========================================================================
  // 2. SETOR TABUNGAN (DEPOSIT)
  // ===========================================================================
  .post(
    '/deposit',
    async ({ body, getAuthUser }) => {
      const user = await getAuthUser();
      const { studentId, amount, description } = body;

      const depositAmount = Number(amount);
      if (depositAmount <= 0) {
        return errorResponse('Nominal setoran harus lebih besar dari 0.');
      }

      // Ambil akun tabungan
      const [account] = await db
        .select()
        .from(savingAccountsTable)
        .where(eq(savingAccountsTable.studentId, studentId))
        .limit(1);

      if (!account) {
        return errorResponse('Akun tabungan tidak ditemukan.');
      }

      const currentBalance = Number(account.balance);
      const newBalance = currentBalance + depositAmount;

      // Update Saldo
      await db
        .update(savingAccountsTable)
        .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
        .where(eq(savingAccountsTable.id, account.id));

      // Catat Mutasi
      const [mutation] = await db
        .insert(savingTransactionsTable)
        .values({
          accountId: account.id,
          studentId: studentId,
          type: 'DEPOSIT',
          amount: depositAmount.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: description || 'Setor Tabungan',
          createdById: user.id,
        })
        .returning();

      return successResponse('Setor tabungan berhasil.', {
        accountNumber: account.accountNumber,
        previousBalance: currentBalance,
        depositAmount,
        newBalance,
        mutation,
      });
    },
    {
      body: t.Object({
        studentId: t.String(),
        amount: t.Number({ minimum: 1 }),
        description: t.Optional(t.String()),
      }),
    }
  )

  // ===========================================================================
  // 3. TARIK TABUNGAN (WITHDRAWAL - VALIDATION NO NEGATIVE BALANCE)
  // ===========================================================================
  .post(
    '/withdraw',
    async ({ body, getAuthUser }) => {
      const user = await getAuthUser();
      const { studentId, amount, description } = body;

      const withdrawAmount = Number(amount);
      if (withdrawAmount <= 0) {
        return errorResponse('Nominal penarikan harus lebih besar dari 0.');
      }

      const [account] = await db
        .select()
        .from(savingAccountsTable)
        .where(eq(savingAccountsTable.studentId, studentId))
        .limit(1);

      if (!account) {
        return errorResponse('Akun tabungan tidak ditemukan.');
      }

      const currentBalance = Number(account.balance);

      // Aturan Bisnis: Saldo tidak boleh bernilai negatif!
      if (currentBalance < withdrawAmount) {
        return errorResponse(
          `Saldo tabungan tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString()}, Penarikan: Rp ${withdrawAmount.toLocaleString()}`
        );
      }

      const newBalance = currentBalance - withdrawAmount;

      // Update Saldo
      await db
        .update(savingAccountsTable)
        .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
        .where(eq(savingAccountsTable.id, account.id));

      // Catat Mutasi
      const [mutation] = await db
        .insert(savingTransactionsTable)
        .values({
          accountId: account.id,
          studentId: studentId,
          type: 'WITHDRAWAL',
          amount: withdrawAmount.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: description || 'Tarik Tabungan',
          createdById: user.id,
        })
        .returning();

      return successResponse('Penarikan tabungan berhasil.', {
        accountNumber: account.accountNumber,
        previousBalance: currentBalance,
        withdrawAmount,
        newBalance,
        mutation,
      });
    },
    {
      body: t.Object({
        studentId: t.String(),
        amount: t.Number({ minimum: 1 }),
        description: t.Optional(t.String()),
      }),
    }
  )

  // ===========================================================================
  // 4. BAYAR TAGIHAN SEKOLAH MENGGUNAKAN SALDO TABUNGAN
  // ===========================================================================
  .post(
    '/pay-invoice',
    async ({ body, getAuthUser }) => {
      const user = await getAuthUser();
      const { invoiceId, amount } = body;

      // 1. Ambil Invoice
      const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);
      if (!invoice) {
        return errorResponse('Tagihan tidak ditemukan.');
      }

      const payAmount = Number(amount);
      const remaining = Number(invoice.remainingAmount);

      if (payAmount <= 0 || payAmount > remaining) {
        return errorResponse('Nominal pembayaran via tabungan tidak valid.');
      }

      // 2. Ambil Tabungan Siswa
      const [account] = await db
        .select()
        .from(savingAccountsTable)
        .where(eq(savingAccountsTable.studentId, invoice.studentId))
        .limit(1);

      if (!account) {
        return errorResponse('Siswa ini belum memiliki akun tabungan.');
      }

      const currentBalance = Number(account.balance);
      if (currentBalance < payAmount) {
        return errorResponse(`Saldo tabungan (Rp ${currentBalance.toLocaleString()}) kurang untuk membayar tagihan (Rp ${payAmount.toLocaleString()}).`);
      }

      // 3. Potong Saldo Tabungan
      const newBalance = currentBalance - payAmount;
      await db
        .update(savingAccountsTable)
        .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
        .where(eq(savingAccountsTable.id, account.id));

      // Catat mutasi tabungan
      await db.insert(savingTransactionsTable).values({
        accountId: account.id,
        studentId: invoice.studentId,
        type: 'PAYMENT',
        amount: payAmount.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        referenceNo: invoice.invoiceNumber,
        description: `Pembayaran Invoice ${invoice.invoiceNumber} via Tabungan`,
        createdById: user.id,
      });

      // 4. Catat Transaksi Pembayaran Kasir (Method: SAVINGS)
      const newPaid = Number(invoice.paidAmount) + payAmount;
      const newRemaining = Number(invoice.finalAmount) - newPaid;
      const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

      const transactionNum = `TRX/SAV/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

      await db.insert(transactionsTable).values({
        transactionNumber: transactionNum,
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        cashierId: user.id,
        amount: payAmount.toFixed(2),
        paymentMethod: 'SAVINGS',
        type: 'PAYMENT',
        notes: 'Pembayaran otomatis via Saldo Tabungan Siswa',
      });

      // 5. Update Status Tagihan
      await db
        .update(invoicesTable)
        .set({
          paidAmount: newPaid.toFixed(2),
          remainingAmount: newRemaining.toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoicesTable.id, invoice.id));

      // Audit Trail
      await db.insert(auditTrailsTable).values({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'PAYMENT_VIA_SAVINGS',
        module: 'SAVINGS',
        details: {
          invoiceNumber: invoice.invoiceNumber,
          amountPaid: payAmount,
          remainingSavings: newBalance,
        },
      });

      return successResponse('Tagihan berhasil dibayar menggunakan saldo tabungan.', {
        invoiceNumber: invoice.invoiceNumber,
        paidAmount: payAmount,
        invoiceStatus: newStatus,
        remainingSavingsBalance: newBalance,
      });
    },
    {
      body: t.Object({
        invoiceId: t.String(),
        amount: t.Number({ minimum: 1 }),
      }),
    }
  );
