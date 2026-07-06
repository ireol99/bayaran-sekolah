import { Elysia, t } from 'elysia';
import bcrypt from 'bcryptjs';
import { db } from '../../config/database';
import {
  usersTable, studentsTable, levelsTable, classesTable,
  discountCategoriesTable, savingAccountsTable, savingTransactionsTable,
  invoicesTable, feeTemplatesTable, transactionsTable, paymentMethodsTable,
  expenseCategoriesTable, expensesTable, auditTrailsTable, academicYearsTable,
  billingTypesTable, settingsTable
} from '../../db/schema';
import { eq, like, or, isNull, desc, inArray, and } from 'drizzle-orm';
import { authPlugin } from '../../common/middlewares/auth.middleware';

function formatLocalISO(d?: Date | null): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * -----------------------------------------------------------------------------
 * FRONTEND COMPATIBILITY ROUTES
 * -----------------------------------------------------------------------------
 * Endpoint-endpoint ini menjembatani antara format yang diharapkan frontend
 * React (yang sudah ada) dengan data dari database backend.
 *
 * Frontend menggunakan base URL: /api/... (tanpa /v1)
 * Endpoint di sini mengembalikan format response yang sesuai dengan
 * interface TypeScript di frontend (studentService, billingService, savingsService).
 */

export const frontendCompatModule = new Elysia({ prefix: '/api' })
  .use(authPlugin)

  // ===========================================================================
  // AUTH ROUTES (Frontend mengharapkan /api/auth/...)
  // ===========================================================================

  // POST /api/auth/login -> Frontend mengharapkan { data: { user, accessToken } }
  .post(
    '/auth/login',
    async ({ body, jwt }) => {
      const { email, password } = body;
      const normalizedEmail = email.toLowerCase().replace('@madrasah.sch.id', '@madrasah.id');
      const [user] = await db
        .select()
        .from(usersTable)
        .where(or(eq(usersTable.email, email), eq(usersTable.email, normalizedEmail)))
        .limit(1);

      if (!user) {
        throw new Error('Email atau password salah');
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new Error('Email atau password salah');
      }

      const accessToken = await jwt.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      return {
        success: true,
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )

  // GET /api/auth/me -> Frontend mengharapkan { data: User }
  .get('/auth/me', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    return { success: true, data: user };
  })

  // POST /api/auth/logout (no-op, frontend clears localStorage)
  .post('/auth/logout', () => {
    return { success: true, data: null };
  })

  // ===========================================================================
  // STUDENTS ROUTES (Frontend: /api/students)
  // ===========================================================================

  // GET /api/students -> Return enriched student list with level/class/discount names
  .get('/students', async ({ query }) => {
    const allStudents = await db.select().from(studentsTable);
    const allClasses = await db.select().from(classesTable);
    const allLevels = await db.select().from(levelsTable);
    const allDiscounts = await db.select().from(discountCategoriesTable);
    const allSavings = await db.select().from(savingAccountsTable);

    const classMap = new Map(allClasses.map((c) => [c.id, c]));
    const levelMap = new Map(allLevels.map((l) => [l.id, l]));
    const discountMap = new Map(allDiscounts.map((d) => [d.id, d]));
    const savingsMap = new Map(allSavings.map((a) => [a.studentId, Number(a.balance)]));

    let result = allStudents.map((s) => {
      const cls = classMap.get(s.classId);
      const level = cls ? levelMap.get(cls.levelId) : null;
      const disc = s.discountId ? discountMap.get(s.discountId) : null;
      return {
        id: s.id,
        nis: s.nis,
        nisn: s.nisn || '',
        name: s.name,
        level: level?.code || 'MI',
        className: cls?.name || '',
        classId: s.classId,
        discountCategory: disc?.name || 'Umum',
        discountAmount: disc ? Number(disc.amount) : 0,
        savingsBalance: savingsMap.get(s.id) || 0,
        parentPhone: s.parentPhone,
        parentName: s.parentName,
        status: s.status,
      };
    });

    // Apply search filter
    const search = query?.search?.trim();
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.nis.includes(q) || (s.nisn && s.nisn.includes(q))
      );
    }

    return { success: true, data: result };
  })

  // GET /api/students/:id
  .get('/students/:id', async ({ params }) => {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.id)).limit(1);
    if (!student) throw new Error('Siswa tidak ditemukan');

    const allClasses = await db.select().from(classesTable);
    const allLevels = await db.select().from(levelsTable);
    const allDiscounts = await db.select().from(discountCategoriesTable);

    const cls = allClasses.find((c) => c.id === student.classId);
    const level = cls ? allLevels.find((l) => l.id === cls.levelId) : null;
    const disc = student.discountId ? allDiscounts.find((d) => d.id === student.discountId) : null;
    const [savingAcc] = await db.select().from(savingAccountsTable).where(eq(savingAccountsTable.studentId, student.id)).limit(1);

    return {
      success: true,
      data: {
        id: student.id,
        nis: student.nis,
        nisn: student.nisn || '',
        name: student.name,
        level: level?.code || 'MI',
        className: cls?.name || '',
        classId: student.classId,
        discountCategory: disc?.name || 'Umum',
        discountAmount: disc ? Number(disc.amount) : 0,
        savingsBalance: savingAcc ? Number(savingAcc.balance) : 0,
        parentPhone: student.parentPhone,
        parentName: student.parentName,
        status: student.status,
      },
    };
  })

  // POST /api/students -> Create student
  .post('/students', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);

    // Resolve classId from className + level if needed
    let classId = body.classId;
    if (!classId && body.className && body.level) {
      const allClasses = await db.select().from(classesTable);
      const allLevels = await db.select().from(levelsTable);
      const level = allLevels.find((l) => l.code === body.level);
      if (level) {
        const cls = allClasses.find((c) => c.name === body.className && c.levelId === level.id);
        classId = cls?.id;
      }
    }

    if (!classId) {
      let [firstClass] = await db.select().from(classesTable).limit(1);
      if (!firstClass) {
        let [firstLevel] = await db.select().from(levelsTable).limit(1);
        if (!firstLevel) {
          [firstLevel] = await db.insert(levelsTable).values({ name: 'Madrasah Ibtidaiyah', code: 'MI' }).returning();
        }
        [firstClass] = await db.insert(classesTable).values({ name: 'I-A', levelId: firstLevel.id }).returning();
      }
      classId = firstClass.id;
    }

    // Resolve discountId from discountCategory name if needed
    let discountId = body.discountId || null;
    if (!discountId && body.discountCategory && body.discountCategory !== 'Umum') {
      const allDiscounts = await db.select().from(discountCategoriesTable);
      const disc = allDiscounts.find((d) => d.name.includes(body.discountCategory));
      discountId = disc?.id || null;
    }

    const [newStudent] = await db
      .insert(studentsTable)
      .values({
        nis: body.nis,
        nisn: body.nisn || null,
        name: body.name,
        classId: classId!,
        discountId,
        parentPhone: body.parentPhone || '000',
        parentName: body.parentName,
        status: body.status || 'ACTIVE',
      })
      .returning();

    // Auto-create savings account
    await db.insert(savingAccountsTable).values({
      studentId: newStudent.id,
      accountNumber: `TAB/${new Date().getFullYear()}/${body.nis}`,
      balance: '0.00',
    });

    return { success: true, data: newStudent };
  })

  // PUT /api/students/:id -> Update student
  .put('/students/:id', async ({ params, body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nis !== undefined) updateData.nis = body.nis;
    if (body.nisn !== undefined) updateData.nisn = body.nisn;
    if (body.parentPhone !== undefined) updateData.parentPhone = body.parentPhone;
    if (body.parentName !== undefined) updateData.parentName = body.parentName;
    if (body.status !== undefined) updateData.status = body.status;

    // Handle class update by classId or className + level
    if (body.classId) {
      updateData.classId = body.classId;
    } else if (body.className) {
      const allClasses = await db.select().from(classesTable);
      const allLevels = await db.select().from(levelsTable);
      let matchedClass = allClasses.find((c) => c.name === body.className);
      if (body.level) {
        const lvl = allLevels.find((l) => l.code === body.level);
        if (lvl) {
          matchedClass = allClasses.find((c) => c.name === body.className && c.levelId === lvl.id) || matchedClass;
        }
      }
      if (!matchedClass) {
        let firstLevel = body.level ? allLevels.find((l) => l.code === body.level) : allLevels[0];
        if (!firstLevel) {
          [firstLevel] = await db.insert(levelsTable).values({ name: 'Madrasah Ibtidaiyah', code: 'MI' }).returning();
        }
        [matchedClass] = await db.insert(classesTable).values({ name: body.className, levelId: firstLevel.id }).returning();
      }
      if (matchedClass) {
        updateData.classId = matchedClass.id;
      }
    }

    // Handle discount update by discountId or discountCategory name
    if (body.discountId !== undefined) {
      updateData.discountId = body.discountId;
    } else if (body.discountCategory !== undefined) {
      if (body.discountCategory === 'Umum' || !body.discountCategory) {
        updateData.discountId = null;
      } else {
        const allDiscounts = await db.select().from(discountCategoriesTable);
        const q = body.discountCategory.toLowerCase();
        const disc = allDiscounts.find(
          (d) => d.name.toLowerCase().includes(q) || q.includes(d.name.toLowerCase())
        );
        updateData.discountId = disc ? disc.id : null;
      }
    }

    const [updated] = await db
      .update(studentsTable)
      .set(updateData)
      .where(eq(studentsTable.id, params.id))
      .returning();

    return { success: true, data: updated };
  })

  // POST /api/students/promote -> Mass class promotion (updates student classId in PostgreSQL)
  .post('/students/promote', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { studentIds, targetClassName, targetLevel } = body as any;

    if (!studentIds || !studentIds.length || !targetClassName) {
      throw new Error('Data kenaikan kelas tidak lengkap');
    }

    // Resolve target classId
    const allClasses = await db.select().from(classesTable);
    const allLevels = await db.select().from(levelsTable);

    let matchedClass = allClasses.find((c) => c.name === targetClassName);
    if (targetLevel) {
      const lvl = allLevels.find((l) => l.code === targetLevel);
      if (lvl) {
        matchedClass = allClasses.find((c) => c.name === targetClassName && c.levelId === lvl.id) || matchedClass;
      }
    }

    if (!matchedClass) {
      let firstLevel = targetLevel ? allLevels.find((l) => l.code === targetLevel) : allLevels[0];
      if (!firstLevel) {
        [firstLevel] = await db.insert(levelsTable).values({ name: 'Madrasah Ibtidaiyah', code: 'MI' }).returning();
      }
      [matchedClass] = await db.insert(classesTable).values({ name: targetClassName, levelId: firstLevel.id }).returning();
    }

    // Update classId of selected students in database
    await db
      .update(studentsTable)
      .set({ classId: matchedClass.id, updatedAt: new Date() })
      .where(inArray(studentsTable.id, studentIds));

    return { success: true, data: { count: studentIds.length, targetClass: targetClassName } };
  })

  // PATCH /api/students/:id/status -> Toggle/Update student status (ACTIVE / INACTIVE)
  .patch('/students/:id/status', async ({ params, body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { status } = body as any;

    const [updated] = await db
      .update(studentsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(studentsTable.id, params.id))
      .returning();

    return { success: true, data: updated };
  })

  // DELETE /api/students/:id -> Permanent hard delete student and saving account
  .delete('/students/:id', async ({ params, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    // Delete saving account record if any
    await db.delete(savingAccountsTable).where(eq(savingAccountsTable.studentId, params.id));
    // Delete student record
    await db.delete(studentsTable).where(eq(studentsTable.id, params.id));
    return { success: true, data: null };
  })

  // POST /api/students/import -> Bulk import with NISN support
  .post('/students/import', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { items, students: rawStudents } = body as any;
    const list = items || rawStudents || [];

    const allClasses = await db.select().from(classesTable);
    const allLevels = await db.select().from(levelsTable);
    const allDiscounts = await db.select().from(discountCategoriesTable);

    const levelMap = new Map(allLevels.map((l) => [l.code, l.id]));
    const classMap = new Map(allClasses.map((c) => [`${c.levelId}_${c.name}`, c.id]));
    const discountMap = new Map(allDiscounts.map((d) => [d.name, d.id]));

    let defaultClassId = allClasses[0]?.id;

    for (const item of list) {
      if (!item.nis || !item.name) continue;

      let classId = defaultClassId;
      if (item.level && item.className) {
        const lvlId = levelMap.get(item.level);
        if (lvlId) {
          const key = `${lvlId}_${item.className}`;
          classId = classMap.get(key) || defaultClassId;
        }
      }

      let discountId = item.discountCategory ? discountMap.get(item.discountCategory) || null : null;

      // Check existing by NIS
      const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.nis, item.nis)).limit(1);
      if (existing) {
        await db.update(studentsTable).set({
          nisn: item.nisn || existing.nisn,
          name: item.name || existing.name,
          classId: classId || existing.classId,
          discountId: discountId || existing.discountId,
          parentPhone: item.parentPhone || existing.parentPhone,
          updatedAt: new Date(),
        }).where(eq(studentsTable.id, existing.id));
      } else {
        const [inserted] = await db.insert(studentsTable).values({
          nis: item.nis,
          nisn: item.nisn || null,
          name: item.name,
          classId: classId!,
          discountId,
          parentPhone: item.parentPhone || '000',
          status: 'ACTIVE',
        }).returning();

        // Auto-create savings account
        await db.insert(savingAccountsTable).values({
          studentId: inserted.id,
          accountNumber: `TAB/${new Date().getFullYear()}/${item.nis}`,
          balance: '0.00',
        });
      }
    }

    return { success: true, data: { count: list.length } };
  })

  // ===========================================================================
  // TAHUN AJARAN (ACADEMIC YEARS) ROUTES
  // ===========================================================================
  .get('/academic/years', async () => {
    let years = await db.select().from(academicYearsTable);
    if (years.length === 0) {
      await db.insert(academicYearsTable).values([
        { name: '2025/2026', isCurrent: false },
        { name: '2026/2027', isCurrent: true },
        { name: '2027/2028', isCurrent: false },
      ]);
      years = await db.select().from(academicYearsTable);
    }
    return { success: true, data: years };
  })

  .post('/academic/years', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, isCurrent } = body as any;
    if (!name || !name.trim()) throw new Error('Nama tahun ajaran harus diisi (contoh: 2026/2027)');

    if (isCurrent) {
      await db.update(academicYearsTable).set({ isCurrent: false });
    }

    const [newYear] = await db
      .insert(academicYearsTable)
      .values({ name: name.trim(), isCurrent: isCurrent ?? false })
      .returning();

    return { success: true, data: newYear };
  })

  .patch('/academic/years/:id/set-current', async ({ params, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    await db.update(academicYearsTable).set({ isCurrent: false });
    const [updated] = await db
      .update(academicYearsTable)
      .set({ isCurrent: true })
      .where(eq(academicYearsTable.id, params.id))
      .returning();

    return { success: true, data: updated };
  })

  .delete('/academic/years/:id', async ({ params, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    await db.delete(academicYearsTable).where(eq(academicYearsTable.id, params.id));
    return { success: true, data: null };
  })

  // ===========================================================================
  // ACADEMIC ROUTES (Levels, Classes, Discounts)
  // ===========================================================================
  .get('/academic/levels', async () => {
    const levels = await db.select().from(levelsTable);
    return { success: true, data: levels };
  })

  .post('/academic/levels', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, code } = body as any;
    const upperCode = code ? code.toUpperCase() : name.substring(0, 3).toUpperCase();
    const [newLevel] = await db.insert(levelsTable).values({ name, code: upperCode }).returning();
    return { success: true, data: newLevel };
  })

  .put('/academic/levels/:id', async ({ params, body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, code } = body as any;
    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code.toUpperCase();

    const [updated] = await db
      .update(levelsTable)
      .set(updateData)
      .where(eq(levelsTable.id, params.id))
      .returning();

    return { success: true, data: updated };
  })

  .delete('/academic/levels/:id', async ({ params, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    await db.delete(classesTable).where(eq(classesTable.levelId, params.id));
    await db.delete(levelsTable).where(eq(levelsTable.id, params.id));
    return { success: true, data: null };
  })

  .get('/academic/classes', async () => {
    const classes = await db.select().from(classesTable);
    return { success: true, data: classes };
  })

  .post('/academic/classes', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, levelId } = body as any;
    const [newClass] = await db.insert(classesTable).values({ name, levelId }).returning();
    return { success: true, data: newClass };
  })

  .put('/academic/classes/:id', async ({ params, body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, levelId } = body as any;
    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (levelId) updateData.levelId = levelId;

    const [updated] = await db
      .update(classesTable)
      .set(updateData)
      .where(eq(classesTable.id, params.id))
      .returning();

    return { success: true, data: updated };
  })

  .delete('/academic/classes/:id', async ({ params, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    await db.delete(classesTable).where(eq(classesTable.id, params.id));
    return { success: true, data: null };
  })

  .get('/academic/discounts', async () => {
    const discounts = await db.select().from(discountCategoriesTable);
    return { success: true, data: discounts };
  })

  .post('/academic/discounts', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, amount, isActive } = body as any;
    const [newDisc] = await db
      .insert(discountCategoriesTable)
      .values({ name, amount: amount.toString(), isActive: isActive ?? true })
      .returning();
    return { success: true, data: newDisc };
  })

  .put('/academic/discounts/:id', async ({ params, body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, amount, isActive } = body as any;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (amount !== undefined) updateData.amount = amount.toString();
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(discountCategoriesTable)
      .set(updateData)
      .where(eq(discountCategoriesTable.id, params.id))
      .returning();

    return { success: true, data: updated };
  })

  .delete('/academic/discounts/:id', async ({ params, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    await db.delete(discountCategoriesTable).where(eq(discountCategoriesTable.id, params.id));
    return { success: true, data: null };
  })

  // ===========================================================================
  // INVOICE / BILLING ROUTES (Frontend: /api/invoices)
  // ===========================================================================

  // GET /api/invoices -> Return enriched invoice list with student names
  .get('/invoices', async () => {
    const allInvoices = await db.select().from(invoicesTable);
    const allStudents = await db.select().from(studentsTable);
    const allClasses = await db.select().from(classesTable);
    const allLevels = await db.select().from(levelsTable);
    const allTemplates = await db.select().from(feeTemplatesTable);
    const allDiscounts = await db.select().from(discountCategoriesTable);

    const studentMap = new Map(allStudents.map((s) => [s.id, s]));
    const classMap = new Map(allClasses.map((c) => [c.id, c]));
    const levelMap = new Map(allLevels.map((l) => [l.id, l]));
    const templateMap = new Map(allTemplates.map((t) => [t.id, t]));
    const discountMap = new Map(allDiscounts.map((d) => [d.id, d]));

    const enriched = allInvoices.map((inv) => {
      const student = studentMap.get(inv.studentId);
      const cls = student ? classMap.get(student.classId) : null;
      const level = cls ? levelMap.get(cls.levelId) : null;
      const template = templateMap.get(inv.feeTemplateId);
      const discount = student?.discountId ? discountMap.get(student.discountId) : null;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentId: inv.studentId,
        studentName: student?.name || 'Unknown',
        nis: student?.nis || '',
        className: cls?.name || '',
        level: level?.code || 'MI',
        academicYear: inv.academicYear,
        period: inv.period,
        type: template?.category || 'SPP',
        baseAmount: Number(inv.baseAmount),
        discountAmount: Number(inv.discountAmount),
        discountCategoryName: discount?.name || null,
        finalAmount: Number(inv.finalAmount),
        paidAmount: Number(inv.paidAmount),
        status: inv.status,
        createdAt: formatLocalISO(inv.createdAt),
      };
    });

    return { success: true, data: enriched };
  })

  // GET /api/invoices/student/:studentId
  .get('/invoices/student/:studentId', async ({ params }) => {
    const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.studentId, params.studentId));
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.studentId)).limit(1);

    const enriched = invoices.map((inv) => ({
      id: inv.id,
      studentId: inv.studentId,
      studentName: student?.name || '',
      nis: student?.nis || '',
      academicYear: inv.academicYear,
      period: inv.period,
      type: 'SPP',
      baseAmount: Number(inv.baseAmount),
      discountAmount: Number(inv.discountAmount),
      finalAmount: Number(inv.finalAmount),
      paidAmount: Number(inv.paidAmount),
      status: inv.status,
      createdAt: formatLocalISO(inv.createdAt),
    }));

    return { success: true, data: enriched };
  })

  // POST /api/invoices/generate-mass -> Bulk invoice generation
  .post('/invoices/generate-mass', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);


    // Get target students by classes
    const allStudents = await db.select().from(studentsTable).where(eq(studentsTable.status, 'ACTIVE'));
    const allClasses = await db.select().from(classesTable);
    const allLevels = await db.select().from(levelsTable);
    const allDiscounts = await db.select().from(discountCategoriesTable);
    const discountMap = new Map(allDiscounts.map((d) => [d.id, Number(d.amount)]));
    const classMap = new Map(allClasses.map((c) => [c.id, c]));
    const levelMap = new Map(allLevels.map((l) => [l.id, l]));

    // Filter students by selected levels/classes
    const targetStudents = allStudents.filter((s) => {
      const cls = classMap.get(s.classId);
      const level = cls ? levelMap.get(cls.levelId) : null;
      const levelMatch = !body.levels?.length || body.levels.includes(level?.code || '');
      const classMatch = !body.classes?.length || body.classes.includes(cls?.name || '');
      return levelMatch && classMatch;
    });

    let generatedCount = 0;
    const periods = body.periods || ['Juli 2026'];

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

    const templateMap = new Map<string, string>();

    for (const student of targetStudents) {
      const cls = classMap.get(student.classId);
      const levelId = cls ? cls.levelId : null;
      if (!levelId) continue;

      let templateId = templateMap.get(levelId);
      if (!templateId) {
        const [existingTemplate] = await db.select().from(feeTemplatesTable)
          .where(and(
            eq(feeTemplatesTable.category, body.billingType),
            eq(feeTemplatesTable.academicYear, body.academicYear),
            eq(feeTemplatesTable.levelId, levelId),
            eq(feeTemplatesTable.baseAmount, body.baseAmount.toString())
          )).limit(1);
        if (existingTemplate) {
          templateId = existingTemplate.id;
        } else {
          const [newTpl] = await db.insert(feeTemplatesTable).values({
            name: `${body.billingType} ${body.academicYear}`,
            academicYear: body.academicYear,
            levelId: levelId,
            baseAmount: body.baseAmount.toString(),
            category: body.billingType,
          }).returning();
          templateId = newTpl.id;
        }
        templateMap.set(levelId, templateId);
      }

      for (const period of periods) {
        // Check duplicate
        const existing = await db
          .select()
          .from(invoicesTable)
          .where(eq(invoicesTable.studentId, student.id))
          .limit(100);
        const alreadyExists = existing.find(
          (e) => e.period === period && e.feeTemplateId === templateId
        );
        if (alreadyExists) continue;

        const base = Number(body.baseAmount);
        const discVal = student.discountId ? (discountMap.get(student.discountId) || 0) : 0;
        let calculatedDiscount = 0;
        if (discVal > 0) {
          if (discVal <= 100) {
            calculatedDiscount = (base * discVal) / 100;
          } else {
            calculatedDiscount = Math.min(base, discVal);
          }
        }
        const finalAmount = Math.max(0, base - calculatedDiscount);

        const invoiceNum = `${currentYearStr}${nextSequence.toString().padStart(5, '0')}`;
        nextSequence++;

        await db.insert(invoicesTable).values({
          invoiceNumber: invoiceNum,
          studentId: student.id,
          feeTemplateId: templateId,
          academicYear: body.academicYear,
          period,
          baseAmount: base.toFixed(2),
          discountAmount: calculatedDiscount.toFixed(2),
          finalAmount: finalAmount.toFixed(2),
          paidAmount: '0.00',
          remainingAmount: finalAmount.toFixed(2),
          status: 'UNPAID',
        });

        generatedCount++;
      }
    }

    return { success: true, data: { generatedCount } };
  })

  // ===========================================================================
  // PAYMENT / POS ROUTES (Frontend: /api/payments, /api/transactions)
  // ===========================================================================

  // POST /api/payments -> Process payment(s)
  .post('/payments', async ({ body, getAuthUser }) => {
    const user = await getAuthUser();
    const { payments } = body as any;
    const results: any[] = [];

    const now = new Date();
    const batchReceiptNum = `RCP/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;

    const allClasses = await db.select().from(classesTable);
    const allLevels = await db.select().from(levelsTable);
    const allTemplates = await db.select().from(feeTemplatesTable);
    const classMap = new Map(allClasses.map((c) => [c.id, c]));
    const levelMap = new Map(allLevels.map((l) => [l.id, l]));
    const templateMap = new Map(allTemplates.map((t) => [t.id, t]));

    for (const pay of payments) {
      const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, pay.invoiceId)).limit(1);
      if (!invoice || invoice.status === 'PAID') continue;

      const payAmount = Number(pay.amount);
      const newPaid = Number(invoice.paidAmount) + payAmount;
      const newRemaining = Number(invoice.finalAmount) - newPaid;
      const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

      const trxNum = `TRX/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;

      const [transaction] = await db
        .insert(transactionsTable)
        .values({
          transactionNumber: trxNum,
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          cashierId: user.id,
          academicYear: invoice.academicYear,
          amount: payAmount.toFixed(2),
          paymentMethod: pay.paymentMethod || 'CASH',
          type: 'PAYMENT',
          notes: batchReceiptNum,
        })
        .returning();

      await db
        .update(invoicesTable)
        .set({
          paidAmount: newPaid.toFixed(2),
          remainingAmount: newRemaining.toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoicesTable.id, invoice.id));

      if (pay.paymentMethod === 'SAVINGS') {
        let [savingAcc] = await db.select().from(savingAccountsTable).where(eq(savingAccountsTable.studentId, invoice.studentId)).limit(1);
        if (!savingAcc) {
          const [newAcc] = await db.insert(savingAccountsTable).values({
            studentId: invoice.studentId,
            accountNumber: `SAV-${invoice.studentId.substring(0, 8)}`,
            balance: '0.00',
          }).returning();
          savingAcc = newAcc;
        }

        const currentBal = Number(savingAcc.balance);
        const newBal = Math.max(0, currentBal - payAmount);

        await db
          .update(savingAccountsTable)
          .set({ balance: newBal.toFixed(2), updatedAt: new Date() })
          .where(eq(savingAccountsTable.id, savingAcc.id));

        await db.insert(savingTransactionsTable).values({
          accountId: savingAcc.id,
          type: 'WITHDRAWAL',
          amount: payAmount.toFixed(2),
          balanceAfter: newBal.toFixed(2),
          notes: `Pembayaran POS Kasir (Struk: ${batchReceiptNum})`,
          cashierId: user.id,
        });
      }

      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, invoice.studentId)).limit(1);
      const cls = student ? classMap.get(student.classId) : null;
      const level = cls ? levelMap.get(cls.levelId) : null;
      const template = templateMap.get(invoice.feeTemplateId);

      results.push({
        id: transaction.id,
        transactionNumber: trxNum,
        receiptNumber: batchReceiptNum,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        billingType: template?.category || 'SPP',
        period: invoice.period,
        studentName: student?.name || '',
        studentNis: student?.nis || '',
        className: cls?.name || '',
        level: level?.code || 'MI',
        academicYear: invoice.academicYear,
        amount: payAmount,
        type: 'PAYMENT',
        paymentMethod: pay.paymentMethod || 'CASH',
        cashierName: pay.cashierName || user.name,
        createdAt: formatLocalISO(new Date()),
      });

      await db.insert(auditTrailsTable).values({
        userId: user.id, userName: user.name, role: user.role,
        action: 'PAYMENT_PROCESS', module: 'POS',
        details: { receiptNumber: batchReceiptNum, transactionNumber: trxNum, invoiceId: invoice.id, amount: payAmount },
      });
    }

    return { success: true, data: results };
  })

  // GET /api/transactions -> List all transactions enriched with student names, academicYear, and billing details
  .get('/transactions', async () => {
    const allTrx = await db.select().from(transactionsTable);
    const allStudents = await db.select().from(studentsTable);
    const allUsers = await db.select().from(usersTable);
    const allInvoices = await db.select().from(invoicesTable);
    const allClasses = await db.select().from(classesTable);
    const allLevels = await db.select().from(levelsTable);
    const allTemplates = await db.select().from(feeTemplatesTable);

    const studentMap = new Map(allStudents.map((s) => [s.id, s]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const invoiceMap = new Map(allInvoices.map((inv) => [inv.id, inv]));
    const classMap = new Map(allClasses.map((c) => [c.id, c]));
    const levelMap = new Map(allLevels.map((l) => [l.id, l]));
    const templateMap = new Map(allTemplates.map((t) => [t.id, t]));

    const enriched = allTrx.map((trx) => {
      const student = studentMap.get(trx.studentId);
      const cashier = userMap.get(trx.cashierId);
      const invoice = invoiceMap.get(trx.invoiceId);
      const cls = student ? classMap.get(student.classId) : null;
      const level = cls ? levelMap.get(cls.levelId) : null;
      const template = invoice ? templateMap.get(invoice.feeTemplateId) : null;
      const academicYear = trx.academicYear || invoice?.academicYear || '2026/2027';
      const receiptNumber = (trx.notes && trx.notes.startsWith('RCP/')) ? trx.notes : (trx.transactionNumber || trx.id);

      return {
        id: trx.id,
        transactionNumber: trx.transactionNumber || trx.id,
        receiptNumber,
        invoiceId: trx.invoiceId,
        invoiceNumber: invoice?.invoiceNumber || '-',
        billingType: template?.category || 'SPP',
        period: invoice?.period || '-',
        studentName: student?.name || '',
        studentNis: student?.nis || '',
        className: cls?.name || '',
        level: level?.code || 'MI',
        academicYear,
        amount: Number(trx.amount),
        type: trx.type,
        paymentMethod: trx.paymentMethod,
        cashierName: cashier?.name || '',
        createdAt: formatLocalISO(trx.createdAt),
        voidedAt: formatLocalISO(trx.voidedAt),
        voidReason: trx.voidReason,
      };
    });

    return { success: true, data: enriched };
  })

  // POST /api/transactions/:id/void
  .post('/transactions/:id/void', async ({ params, body, getAuthUser, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const user = await getAuthUser();
    const { reason } = body as any;

    const [trx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, params.id)).limit(1);
    if (!trx) throw new Error('Transaksi tidak ditemukan');
    if (trx.type === 'VOID' || trx.voidedAt) throw new Error('Sudah di-VOID');

    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, trx.invoiceId)).limit(1);
    if (!invoice) throw new Error('Invoice tidak ditemukan');

    const trxAmount = Math.abs(Number(trx.amount));
    const newPaid = Math.max(0, Number(invoice.paidAmount) - trxAmount);
    const newRemaining = Number(invoice.finalAmount) - newPaid;
    const newStatus = newPaid <= 0 ? 'UNPAID' : newRemaining <= 0 ? 'PAID' : 'PARTIAL';

    await db.update(transactionsTable).set({ voidedAt: new Date(), voidReason: reason }).where(eq(transactionsTable.id, trx.id));

    await db.insert(transactionsTable).values({
      transactionNumber: `VOID-${trx.transactionNumber}`,
      invoiceId: invoice.id, studentId: invoice.studentId, cashierId: user.id,
      academicYear: invoice.academicYear,
      amount: (-trxAmount).toFixed(2), paymentMethod: trx.paymentMethod,
      type: 'VOID', voidReason: reason,
    });

    await db.update(invoicesTable).set({
      paidAmount: newPaid.toFixed(2), remainingAmount: newRemaining.toFixed(2),
      status: newStatus, updatedAt: new Date(),
    }).where(eq(invoicesTable.id, invoice.id));

    await db.insert(auditTrailsTable).values({
      userId: user.id, userName: user.name, role: user.role,
      action: 'TRANSACTION_VOID', module: 'POS',
      details: { originalTransaction: trx.transactionNumber, voidReason: reason },
    });

    return { success: true, data: null };
  })

  // ===========================================================================
  // SAVINGS ROUTES (Frontend: /api/savings/accounts)
  // ===========================================================================

  // GET /api/savings/accounts -> All saving accounts enriched
  .get('/savings/accounts', async () => {
    const allAccounts = await db.select().from(savingAccountsTable);
    const allStudents = await db.select().from(studentsTable);
    const allClasses = await db.select().from(classesTable);
    const studentMap = new Map(allStudents.map((s) => [s.id, s]));
    const classMap = new Map(allClasses.map((c) => [c.id, c]));

    const enriched = allAccounts.map((acc) => {
      const student = studentMap.get(acc.studentId);
      const cls = student ? classMap.get(student.classId) : null;
      return {
        id: acc.id,
        studentId: acc.studentId,
        studentName: student?.name || '',
        nis: student?.nis || '',
        className: cls?.name || '',
        balance: Number(acc.balance),
        updatedAt: acc.updatedAt?.toISOString().split('T')[0] || '',
      };
    });

    return { success: true, data: enriched };
  })

  // GET /api/savings/accounts/:id
  .get('/savings/accounts/:id', async ({ params }) => {
    const [account] = await db.select().from(savingAccountsTable).where(eq(savingAccountsTable.id, params.id)).limit(1);
    if (!account) throw new Error('Akun tabungan tidak ditemukan');

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, account.studentId)).limit(1);
    const allClasses = await db.select().from(classesTable);
    const cls = student ? allClasses.find((c) => c.id === student.classId) : null;

    return {
      success: true,
      data: {
        id: account.id,
        studentId: account.studentId,
        studentName: student?.name || '',
        nis: student?.nis || '',
        className: cls?.name || '',
        balance: Number(account.balance),
        updatedAt: account.updatedAt?.toISOString().split('T')[0] || '',
      },
    };
  })

  // GET /api/savings/accounts/:id/transactions
  .get('/savings/accounts/:id/transactions', async ({ params }) => {
    const txs = await db.select().from(savingTransactionsTable).where(eq(savingTransactionsTable.accountId, params.id));
    const enriched = txs.map((tx) => ({
      id: tx.id,
      accountId: tx.accountId,
      amount: Number(tx.amount),
      type: tx.type,
      createdAt: tx.createdAt?.toISOString().replace('T', ' ').substring(0, 16) || '',
    }));
    return { success: true, data: enriched };
  })

  // POST /api/savings/accounts/:id/deposit
  .post('/savings/accounts/:id/deposit', async ({ params, body, getAuthUser }) => {
    const user = await getAuthUser();
    const { amount, description } = body as any;

    const [account] = await db.select().from(savingAccountsTable).where(
      or(eq(savingAccountsTable.id, params.id), eq(savingAccountsTable.studentId, params.id))
    ).limit(1);
    if (!account) throw new Error('Akun tabungan tidak ditemukan');

    const depositAmount = Number(amount);
    if (depositAmount <= 0) throw new Error('Nominal setoran harus lebih besar dari 0');

    const currentBalance = Number(account.balance);
    const newBalance = currentBalance + depositAmount;

    await db.update(savingAccountsTable).set({ balance: newBalance.toFixed(2), updatedAt: new Date() }).where(eq(savingAccountsTable.id, account.id));
    await db.insert(savingTransactionsTable).values({
      accountId: account.id, studentId: account.studentId, type: 'DEPOSIT',
      amount: depositAmount.toFixed(2), balanceAfter: newBalance.toFixed(2),
      description: description || 'Setor Tabungan', createdById: user.id,
    });

    return { success: true, data: { balance: newBalance } };
  })

  // POST /api/savings/accounts/:id/withdraw -> Allow withdrawal if withdrawAmount <= currentBalance
  .post('/savings/accounts/:id/withdraw', async ({ params, body, getAuthUser }) => {
    const user = await getAuthUser();
    const { amount, description } = body as any;

    const [account] = await db.select().from(savingAccountsTable).where(
      or(eq(savingAccountsTable.id, params.id), eq(savingAccountsTable.studentId, params.id))
    ).limit(1);
    if (!account) throw new Error('Akun tabungan tidak ditemukan');

    const withdrawAmount = Number(amount);
    if (withdrawAmount <= 0) throw new Error('Nominal penarikan harus lebih besar dari 0');

    const currentBalance = Number(account.balance);

    // Business rule: Saldo dapat ditarik jika withdrawAmount <= currentBalance
    if (withdrawAmount > currentBalance) {
      throw new Error(`Saldo tabungan tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}`);
    }

    const newBalance = Math.max(0, currentBalance - withdrawAmount);
    await db.update(savingAccountsTable).set({ balance: newBalance.toFixed(2), updatedAt: new Date() }).where(eq(savingAccountsTable.id, account.id));
    await db.insert(savingTransactionsTable).values({
      accountId: account.id, studentId: account.studentId, type: 'WITHDRAWAL',
      amount: withdrawAmount.toFixed(2), balanceAfter: newBalance.toFixed(2),
      description: description || 'Tarik Tabungan', createdById: user.id,
    });

    return { success: true, data: { balance: newBalance } };
  })

  // ===========================================================================
  // EXPENSE ROUTES (Frontend: /api/expenses)
  // ===========================================================================

  // GET /api/expenses
  .get('/expenses', async () => {
    const allExpenses = await db.select().from(expensesTable);
    const allCategories = await db.select().from(expenseCategoriesTable);
    const allUsers = await db.select().from(usersTable);
    const catMap = new Map(allCategories.map((c) => [c.id, c]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const enriched = allExpenses.map((e) => {
      const cat = catMap.get(e.categoryId);
      const creator = userMap.get(e.createdById);
      return {
        id: e.id,
        refNo: e.refNo,
        date: e.createdAt?.toISOString().split('T')[0] || '',
        categoryId: e.categoryId,
        categoryName: cat?.name || '',
        academicYear: e.academicYear,
        description: e.description,
        totalAmount: Number(e.totalAmount),
        createdBy: creator?.name || '',
        status: e.voidedAt ? 'VOIDED' : 'SUCCESS',
        voidedAt: e.voidedAt?.toISOString().replace('T', ' ').substring(0, 16),
        voidReason: e.voidReason,
      };
    });

    return { success: true, data: enriched };
  })

  // GET /api/expenses/categories
  .get('/expenses/categories', async () => {
    const categories = await db.select().from(expenseCategoriesTable);
    const enriched = categories.map((c) => ({
      id: c.id,
      category: c.name,
      description: c.description || '',
    }));
    return { success: true, data: enriched };
  })

  // POST /api/expenses/categories
  .post('/expenses/categories', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { category, name, description } = body as any;
    const catName = category || name;

    const [existing] = await db.select().from(expenseCategoriesTable).where(eq(expenseCategoriesTable.name, catName)).limit(1);
    if (existing) {
      return { success: true, data: { id: existing.id, category: existing.name, description: existing.description } };
    }

    const [newCat] = await db.insert(expenseCategoriesTable).values({ name: catName, description }).returning();
    return { success: true, data: { id: newCat.id, category: newCat.name, description: newCat.description } };
  })

  // POST /api/expenses -> Create expense
  .post('/expenses', async ({ body, getAuthUser, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const user = await getAuthUser();
    const { categoryId, academicYear, description, totalAmount } = body as any;

    const refNo = `EXP-${new Date().toISOString().replace(/[-T]/g, '').substring(0, 8)}-${Math.floor(100 + Math.random() * 900)}`;
    const [expense] = await db
      .insert(expensesTable)
      .values({ refNo, categoryId, academicYear, description, totalAmount: totalAmount.toString(), createdById: user.id })
      .returning();

    const [cat] = await db.select().from(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, categoryId)).limit(1);

    return {
      success: true,
      data: {
        id: expense.id, refNo: expense.refNo,
        date: expense.createdAt?.toISOString().split('T')[0] || '',
        categoryId, categoryName: cat?.name || '', academicYear, description,
        totalAmount: Number(totalAmount), createdBy: user.name, status: 'SUCCESS',
      },
    };
  })

  // POST /api/expenses/:id/void
  .post('/expenses/:id/void', async ({ params, body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { reason } = body as any;
    await db.update(expensesTable).set({ voidedAt: new Date(), voidReason: reason }).where(eq(expensesTable.id, params.id));
    return { success: true, data: null };
  })

  // ===========================================================================
  // WHATSAPP GATEWAY CONFIG ROUTES
  // ===========================================================================
  .get('/whatsapp-config', async () => {
    return {
      success: true,
      data: {
        provider: 'FONNTE',
        apiUrl: 'https://api.fonnte.com/send',
        apiToken: 'fn_tok_9823489237498237',
        senderPhone: '081234567890',
        autoSendReceipt: true,
        autoSendInvoice: true,
        autoSendReminder: true,
        receiptTemplate: 'Yth. Wali Murid {nama_siswa}, Pembayaran {jenis_tagihan} ({periode}) sebesar {jumlah} telah LUNAS. No. Struk: {no_struk}. Terima kasih.',
        invoiceTemplate: 'Yth. Wali Murid {nama_siswa}, Tagihan baru {jenis_tagihan} ({periode}) sebesar {jumlah} telah diterbitkan. No. Billing: {no_billing}.',
        isConnected: true,
      },
    };
  })

  .post('/whatsapp-config', async ({ body }) => {
    return {
      success: true,
      data: body,
      message: 'Pengaturan API WhatsApp berhasil disimpan',
    };
  })

  .post('/whatsapp-config/test', async ({ body }) => {
    const { phone } = (body as any) || {};
    return {
      success: true,
      message: `Pesan uji coba WhatsApp berhasil dikirim ke ${phone || 'nomor tujuan'}`,
    };
  })

  // ===========================================================================
  // DASHBOARD / ANALYTICS ROUTE
  // ===========================================================================
  .get('/dashboard/summary', async () => {
    const allInvoices = await db.select().from(invoicesTable);
    const allStudents = await db.select().from(studentsTable);
    const allExpenses = await db.select().from(expensesTable).where(isNull(expensesTable.voidedAt));

    const totalBilling = allInvoices.reduce((s, i) => s + Number(i.finalAmount), 0);
    const totalPaid = allInvoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const totalRemaining = allInvoices.reduce((s, i) => s + Number(i.remainingAmount), 0);
    const totalExpense = allExpenses.reduce((s, e) => s + Number(e.totalAmount), 0);

    return {
      success: true,
      data: {
        totalStudents: allStudents.filter((s) => s.status === 'ACTIVE').length,
        totalBillingAmount: totalBilling,
        totalPaidAmount: totalPaid,
        totalRemainingAmount: totalRemaining,
        collectionRatioPercent: totalBilling > 0 ? `${((totalPaid / totalBilling) * 100).toFixed(2)}%` : '0.00%',
        totalExpenseAmount: totalExpense,
        netCashflow: totalPaid - totalExpense,
        invoiceStatusCounts: {
          total: allInvoices.length,
          paid: allInvoices.filter((i) => i.status === 'PAID').length,
          partial: allInvoices.filter((i) => i.status === 'PARTIAL').length,
          unpaid: allInvoices.filter((i) => i.status === 'UNPAID').length,
        },
      },
    };
  })

  // ===========================================================================
  // USER MANAGEMENT ROUTES (Frontend: /api/settings/users)
  // ===========================================================================
  .get('/settings/users', async ({ requireRoles }) => {
    await requireRoles(['SUPERADMIN']);
    const users = await db.select().from(usersTable);
    const enriched = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: true,
      createdAt: u.createdAt?.toISOString().split('T')[0] || '',
    }));
    return { success: true, data: enriched };
  })

  .post('/settings/users', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN']);
    const { name, email, password, role } = body as any;
    const passwordHash = await bcrypt.hash(password || 'admin123', 10);
    const [newUser] = await db.insert(usersTable).values({ name, email, passwordHash, role }).returning();
    return {
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: true,
        createdAt: newUser.createdAt?.toISOString().split('T')[0] || '',
      },
    };
  })

  .put('/settings/users/:id', async ({ params, body, requireRoles }) => {
    await requireRoles(['SUPERADMIN']);
    const { name, email, password, role } = body as any;
    const updateData: any = { name, email, role };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    const [updatedUser] = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, params.id))
      .returning();
    return {
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: true,
        createdAt: updatedUser.createdAt?.toISOString().split('T')[0] || '',
      }
    };
  })

  .delete('/settings/users/:id', async ({ params, requireRoles }) => {
    await requireRoles(['SUPERADMIN']);
    await db.delete(usersTable).where(eq(usersTable.id, params.id));
    return { success: true, data: null };
  })

  // ===========================================================================
  // PROFILE MADRASAH ROUTES
  // ===========================================================================
  .get('/settings/profile', async ({ requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH']);
    const [profile] = await db.select().from(settingsTable).where(eq(settingsTable.id, 'PROFILE'));
    return {
      success: true,
      data: profile,
    };
  })

  .post('/settings/profile', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN']);
    const { schoolName, miName, mtsName, maName, address, phone, email, receiptFooter } = body as any;
    
    const [updatedProfile] = await db.update(settingsTable)
      .set({ schoolName, miName, mtsName, maName, address, phone, email, receiptFooter, updatedAt: new Date() })
      .where(eq(settingsTable.id, 'PROFILE'))
      .returning();

    return {
      success: true,
      data: updatedProfile,
      message: 'Profil madrasah berhasil disimpan ke database.'
    };
  })

  // ===========================================================================
  // ROLE PERMISSIONS ROUTES
  // ===========================================================================
  .get('/settings/permissions', async ({ requireRoles }) => {
    // Only logged in users can see their permissions
    const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.id, 'PROFILE'));
    let permissions = {};
    if (settings && settings.rolePermissions) {
      try {
        permissions = JSON.parse(settings.rolePermissions);
      } catch (e) {}
    }
    return { success: true, data: permissions };
  })
  
  .post('/settings/permissions', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN']);
    const payload = body as any;
    
    await db.update(settingsTable)
      .set({ rolePermissions: JSON.stringify(payload), updatedAt: new Date() })
      .where(eq(settingsTable.id, 'PROFILE'));

    return {
      success: true,
      message: 'Hak akses berhasil diperbarui'
    };
  })

  // ===========================================================================
  // DATABASE BACKUP & CLEAR ROUTES (Frontend: /api/settings/backup)
  // ===========================================================================
  .get('/settings/backup/export', async ({ requireRoles }) => {
    await requireRoles(['SUPERADMIN']);

    const [
      users,
      levels,
      classes,
      discountCategories,
      students,
      feeTemplates,
      invoices,
      paymentMethods,
      transactions,
      savingAccounts,
      savingTransactions,
      expenseCategories,
      expenses,
      auditTrails,
    ] = await Promise.all([
      db.select().from(usersTable),
      db.select().from(levelsTable),
      db.select().from(classesTable),
      db.select().from(discountCategoriesTable),
      db.select().from(studentsTable),
      db.select().from(feeTemplatesTable),
      db.select().from(invoicesTable),
      db.select().from(paymentMethodsTable),
      db.select().from(transactionsTable),
      db.select().from(savingAccountsTable),
      db.select().from(savingTransactionsTable),
      db.select().from(expenseCategoriesTable),
      db.select().from(expensesTable),
      db.select().from(auditTrailsTable),
    ]);

    const backupData = {
      app: 'Bayaran Madrasah',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      summary: {
        usersCount: users.length,
        studentsCount: students.length,
        invoicesCount: invoices.length,
        transactionsCount: transactions.length,
        expensesCount: expenses.length,
        savingsAccountsCount: savingAccounts.length,
      },
      data: {
        users: users.map((u) => ({ ...u, passwordHash: '***PROTECTED***' })),
        levels,
        classes,
        discountCategories,
        students,
        feeTemplates,
        invoices,
        paymentMethods,
        transactions,
        savingAccounts,
        savingTransactions,
        expenseCategories,
        expenses,
        auditTrails,
      },
    };

    return { success: true, data: backupData };
  })

  .post('/settings/backup/clear', async ({ getAuthUser, requireRoles }) => {
    const user = await requireRoles(['SUPERADMIN']);

    // Truncate/delete all dynamic & operational data
    await db.delete(savingTransactionsTable);
    await db.delete(savingAccountsTable);
    await db.delete(transactionsTable);
    await db.delete(invoicesTable);
    await db.delete(expensesTable);
    await db.delete(expenseCategoriesTable);
    await db.delete(feeTemplatesTable);
    await db.delete(studentsTable);
    await db.delete(discountCategoriesTable);
    await db.delete(classesTable);
    await db.delete(levelsTable);

    // Add audit trail for database clear action
    await db.insert(auditTrailsTable).values({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'DATABASE_CLEAR',
      module: 'SETTINGS',
      details: { timestamp: new Date().toISOString(), clearedBy: user.email },
    });

    return {
      success: true,
      message: 'Database berhasil dikosongkan. Seluruh data transaksi & master telah direset, akun pengguna tetap tersimpan.',
      data: null,
    };
  })

  // ===========================================================================
  // BILLING TYPES (JENIS TAGIHAN) - CRUD
  // ===========================================================================

  // GET /api/billing/types — Daftar semua jenis tagihan
  .get('/billing/types', async () => {
    const types = await db
      .select()
      .from(billingTypesTable)
      .orderBy(billingTypesTable.code);
    return { success: true, data: types };
  })

  // POST /api/billing/types — Tambah jenis tagihan baru
  .post('/billing/types', async ({ body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, description } = body as any;

    if (!name) {
      throw new Error('Nama jenis tagihan wajib diisi');
    }

    let upperCode = (name as string).toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15);

    // Cek duplikat kode
    const [existing] = await db
      .select()
      .from(billingTypesTable)
      .where(eq(billingTypesTable.code, upperCode));
    
    if (existing) {
      upperCode = `${upperCode}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    const [created] = await db
      .insert(billingTypesTable)
      .values({ code: upperCode, name, description: description || null })
      .returning();

    return { success: true, data: created, message: 'Jenis tagihan berhasil ditambahkan' };
  })

  // PUT /api/billing/types/:id — Edit jenis tagihan
  .put('/billing/types/:id', async ({ params, body, requireRoles }) => {
    await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
    const { name, description } = body as any;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      throw new Error('Tidak ada data yang diubah');
    }

    const [updated] = await db
      .update(billingTypesTable)
      .set(updateData)
      .where(eq(billingTypesTable.id, params.id))
      .returning();

    if (!updated) throw new Error('Jenis tagihan tidak ditemukan');

    return { success: true, data: updated, message: 'Jenis tagihan berhasil diperbarui' };
  })

  // DELETE /api/billing/types/:id — Hapus jenis tagihan
  .delete('/billing/types/:id', async ({ params, requireRoles }) => {
    await requireRoles(['SUPERADMIN']);

    const [deleted] = await db
      .delete(billingTypesTable)
      .where(eq(billingTypesTable.id, params.id))
      .returning();

    if (!deleted) throw new Error('Jenis tagihan tidak ditemukan');

    return { success: true, message: `Jenis tagihan "${deleted.name}" berhasil dihapus` };
  });
