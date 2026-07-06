import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { feeTemplatesTable, invoicesTable, studentsTable, discountCategoriesTable } from '../../db/schema';
import { eq, and, like, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '../../common/utils/response';
import { authPlugin } from '../../common/middlewares/auth.middleware';

/**
 * -----------------------------------------------------------------------------
 * MODULE 3: Smart Billing Engine (Frozen Price Pattern)
 * -----------------------------------------------------------------------------
 * Pembuatan Master Template Tagihan & Bulk Invoice Generator.
 */

export const billingModule = new Elysia({ prefix: '/api/v1/billing' })
  .use(authPlugin)

  // ===========================================================================
  // 1. FEE TEMPLATES (MASTER HARGA TAGIHAN)
  // ===========================================================================
  .get('/templates', async () => {
    const templates = await db.select().from(feeTemplatesTable);
    return successResponse('Daftar master harga tagihan', templates);
  })

  .post(
    '/templates',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const [template] = await db
        .insert(feeTemplatesTable)
        .values({
          name: body.name,
          academicYear: body.academicYear,
          levelId: body.levelId,
          baseAmount: body.baseAmount.toString(),
          category: body.category as any,
        })
        .returning();
      return successResponse('Master harga tagihan berhasil dibuat', template);
    },
    {
      body: t.Object({
        name: t.String(),
        academicYear: t.String(),
        levelId: t.String(),
        baseAmount: t.Number({ minimum: 0 }),
        category: t.Union([t.Literal('SPP'), t.Literal('BUILDING'), t.Literal('EXAM'), t.Literal('UNIFORM'), t.Literal('OTHER')]),
      }),
    }
  )

  // ===========================================================================
  // 2. BULK INVOICE GENERATOR (LOGIKA FROZEN PRICE)
  // ===========================================================================
  .post(
    '/generate',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      const { feeTemplateId, period, studentIds } = body;

      // 1. Ambil Fee Template
      const [template] = await db.select().from(feeTemplatesTable).where(eq(feeTemplatesTable.id, feeTemplateId)).limit(1);
      if (!template) {
        return errorResponse('Fee Template tidak ditemukan.');
      }

      const baseAmountNum = Number(template.baseAmount);
      let generatedCount = 0;
      const skippedList: string[] = [];

      // 2. Ambil daftar siswa (bisa spesifik ID atau semua siswa aktif)
      let targetStudents = [];
      if (studentIds && studentIds.length > 0) {
        targetStudents = await db.select().from(studentsTable);
        targetStudents = targetStudents.filter((s) => studentIds.includes(s.id));
      } else {
        targetStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, 'ACTIVE'));
      }

      // Ambil seluruh master diskon untuk lookup cepat
      const allDiscounts = await db.select().from(discountCategoriesTable);
      const discountMap = new Map(allDiscounts.map((d) => [d.id, Number(d.amount)]));

      const currentYearStr = new Date().getFullYear().toString();
      const [latestInvoice] = await db
        .select({ invoiceNumber: invoicesTable.invoiceNumber })
        .from(invoicesTable)
        .where(like(invoicesTable.invoiceNumber, `${currentYearStr}%`))
        .orderBy(desc(invoicesTable.invoiceNumber))
        .limit(1);

      let nextSequence = 1;
      if (latestInvoice && latestInvoice.invoiceNumber.length >= 9) {
        const seqStr = latestInvoice.invoiceNumber.substring(4);
        const parsedSeq = parseInt(seqStr, 10);
        if (!isNaN(parsedSeq)) {
          nextSequence = parsedSeq + 1;
        }
      }

      // 3. Iterasi dan buat Tagihan per Siswa dengan Frozen Price
      for (const student of targetStudents) {
        // Cek apakah tagihan untuk periode dan template ini sudah pernah dibuat untuk siswa ini
        const [existingInvoice] = await db
          .select()
          .from(invoicesTable)
          .where(
            and(
              eq(invoicesTable.studentId, student.id),
              eq(invoicesTable.feeTemplateId, feeTemplateId),
              eq(invoicesTable.period, period)
            )
          )
          .limit(1);

        if (existingInvoice) {
          skippedList.push(`Siswa ${student.name} (NIS: ${student.nis}) sudah memiliki tagihan untuk periode ${period}`);
          continue;
        }

        // Hitung nominal diskon siswa (jika siswa memiliki kategori diskon)
        let discVal = 0;
        if (student.discountId && discountMap.has(student.discountId)) {
          discVal = discountMap.get(student.discountId) || 0;
        }

        let discountAmountNum = 0;
        if (discVal > 0) {
          if (discVal <= 100) {
            discountAmountNum = (baseAmountNum * discVal) / 100;
          } else {
            discountAmountNum = Math.min(baseAmountNum, discVal);
          }
        }

        // Kalkulasi Final Price (FROZEN)
        const finalAmountNum = Math.max(0, baseAmountNum - discountAmountNum);

        // Generate Nomor Invoice Unik (Format: 4 digit tahun + 5 digit sequence)
        const invoiceNum = `${currentYearStr}${nextSequence.toString().padStart(5, '0')}`;
        nextSequence++;

        await db.insert(invoicesTable).values({
          invoiceNumber: invoiceNum,
          studentId: student.id,
          feeTemplateId: template.id,
          academicYear: template.academicYear,
          period: period,
          baseAmount: baseAmountNum.toFixed(2),
          discountAmount: discountAmountNum.toFixed(2),
          finalAmount: finalAmountNum.toFixed(2),
          paidAmount: '0.00',
          remainingAmount: finalAmountNum.toFixed(2),
          status: 'UNPAID',
        });

        generatedCount++;
      }

      return successResponse(`Pembuatan tagihan massal selesai. ${generatedCount} tagihan berhasil terbit.`, {
        generatedCount,
        skippedList,
      });
    },
    {
      body: t.Object({
        feeTemplateId: t.String(),
        period: t.String(), // Contoh: "Juli 2026"
        studentIds: t.Optional(t.Array(t.String())), // Kosongkan untuk semua siswa
      }),
    }
  )

  // ===========================================================================
  // 3. DAFTAR INVOICE (TAGIHAN)
  // ===========================================================================
  .get('/invoices', async ({ query }) => {
    const studentId = query.studentId;
    const status = query.status;

    let invoices = await db.select().from(invoicesTable);

    if (studentId) {
      invoices = invoices.filter((i) => i.studentId === studentId);
    }
    if (status) {
      invoices = invoices.filter((i) => i.status === status);
    }

    return successResponse('Daftar tagihan', invoices);
  });
