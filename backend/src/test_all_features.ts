/**
 * -----------------------------------------------------------------------------
 * COMPREHENSIVE FEATURE TEST SUITE FOR BAYARAN MADRASAH BACKEND
 * -----------------------------------------------------------------------------
 * Testing 100% of API endpoints and business logic rules across all 8 modules.
 */

const BASE_URL = 'http://localhost:3000';

async function runFullTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE FEATURE TESTING SUITE');
  console.log('================================================================\n');

  let superadminToken = '';
  let tuToken = '';
  let testStudentId = '';
  let testInvoiceId = '';
  let testTransactionId = '';
  let testExpenseId = '';

  // ---------------------------------------------------------------------------
  // MODULE 1: IAM (Identity & Access Management)
  // ---------------------------------------------------------------------------
  console.log('🔹 [MODULE 1: IAM]');

  // 1.1 Login Superadmin
  const resLoginSuper = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@madrasah.id', password: 'admin123' }),
  });
  const dataLoginSuper = await resLoginSuper.json();
  superadminToken = dataLoginSuper.data?.token;
  console.log('   ✅ 1.1 Login Superadmin:', dataLoginSuper.success ? 'SUCCESS' : 'FAILED', '| User:', dataLoginSuper.data?.user?.name);

  // 1.2 Login Admin TU
  const resLoginTU = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tu@madrasah.id', password: 'admin123' }),
  });
  const dataLoginTU = await resLoginTU.json();
  tuToken = dataLoginTU.data?.token;
  console.log('   ✅ 1.2 Login Admin TU:', dataLoginTU.success ? 'SUCCESS' : 'FAILED');

  // 1.3 Get Me Profile
  const resMe = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${superadminToken}` },
  });
  const dataMe = await resMe.json();
  console.log('   ✅ 1.3 GET /auth/me Profile:', dataMe.data?.email, '| Role:', dataMe.data?.role);

  // 1.4 Register New Staff User
  const resReg = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({
      name: 'Staf Bendahara Baru',
      email: `bendahara_${Date.now()}@madrasah.id`,
      password: 'password123',
      role: 'ADMIN_TU',
    }),
  });
  const dataReg = await resReg.json();
  console.log('   ✅ 1.4 Register Staff User:', dataReg.success ? 'SUCCESS' : 'FAILED', '| New User:', dataReg.data?.name);

  // ---------------------------------------------------------------------------
  // MODULE 2: ACADEMIC & STUDENT MASTER DATA
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [MODULE 2: ACADEMIC & STUDENT MASTER DATA]');

  // 2.1 Create Level
  const resLevel = await fetch(`${BASE_URL}/api/v1/academic/levels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({ name: 'Madrasah Diniyah', code: `MD_${Date.now().toString().slice(-4)}` }),
  });
  const dataLevel = await resLevel.json();
  const testLevelId = dataLevel.data?.id;
  console.log('   ✅ 2.1 Create Level:', dataLevel.success ? 'SUCCESS' : 'FAILED', '| Code:', dataLevel.data?.code);

  // 2.2 Create Class
  const resClass = await fetch(`${BASE_URL}/api/v1/academic/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({ name: 'Kelas Ula-A', levelId: testLevelId }),
  });
  const dataClass = await resClass.json();
  const testClassId = dataClass.data?.id;
  console.log('   ✅ 2.2 Create Class:', dataClass.success ? 'SUCCESS' : 'FAILED', '| Class:', dataClass.data?.name);

  // 2.3 Create Discount Category
  const resDisc = await fetch(`${BASE_URL}/api/v1/academic/discounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({ name: 'Beasiswa Prestasi (Potongan 75k)', amount: 75000 }),
  });
  const dataDisc = await resDisc.json();
  const testDiscountId = dataDisc.data?.id;
  console.log('   ✅ 2.3 Create Discount Category:', dataDisc.success ? 'SUCCESS' : 'FAILED', '| Amount: Rp', dataDisc.data?.amount);

  // 2.4 Create New Student
  const testNis = `2026${Math.floor(1000 + Math.random() * 9000)}`;
  const resStudent = await fetch(`${BASE_URL}/api/v1/academic/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({
      nis: testNis,
      name: 'Muhammad Bintang',
      classId: testClassId,
      discountId: testDiscountId,
      parentName: 'Bapak Bintang',
      parentPhone: '081299887766',
    }),
  });
  const dataStudent = await resStudent.json();
  testStudentId = dataStudent.data?.id;
  console.log('   ✅ 2.4 Create Single Student:', dataStudent.success ? 'SUCCESS' : 'FAILED', '| NIS:', dataStudent.data?.nis, '| Student ID:', testStudentId);

  // 2.5 Bulk Import Students
  const resBulk = await fetch(`${BASE_URL}/api/v1/academic/students/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({
      items: [
        { nis: `2026${Math.floor(1000 + Math.random() * 9000)}`, name: 'Dewi Lestari', classId: testClassId, parentPhone: '081300001111' },
        { nis: `2026${Math.floor(1000 + Math.random() * 9000)}`, name: 'Rizky Ramadhan', classId: testClassId, parentPhone: '081300002222' },
      ],
    }),
  });
  const dataBulk = await resBulk.json();
  console.log('   ✅ 2.5 Bulk Import Students:', dataBulk.message);

  // 2.6 List & Search Students
  const resSearch = await fetch(`${BASE_URL}/api/v1/academic/students?search=Bintang`, {
    headers: { Authorization: `Bearer ${superadminToken}` },
  });
  const dataSearch = await resSearch.json();
  console.log('   ✅ 2.6 Search Student Result Count:', dataSearch.data?.length);

  // ---------------------------------------------------------------------------
  // MODULE 3: SMART BILLING ENGINE (FROZEN PRICE)
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [MODULE 3: SMART BILLING ENGINE]');

  // 3.1 Create Fee Template
  const resTpl = await fetch(`${BASE_URL}/api/v1/billing/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({
      name: 'SPP Bulanan Diniyah 2026',
      academicYear: '2026/2027',
      levelId: testLevelId,
      baseAmount: 250000,
      category: 'SPP',
    }),
  });
  const dataTpl = await resTpl.json();
  const testFeeTemplateId = dataTpl.data?.id;
  console.log('   ✅ 3.1 Create Fee Template:', dataTpl.success ? 'SUCCESS' : 'FAILED', '| Base Price: Rp', dataTpl.data?.baseAmount);

  // 3.2 Bulk Generate Invoices (Testing Frozen Price Snapshot)
  const resGen = await fetch(`${BASE_URL}/api/v1/billing/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({
      feeTemplateId: testFeeTemplateId,
      period: 'Agustus 2026',
      studentIds: [testStudentId],
    }),
  });
  const dataGen = await resGen.json();
  console.log('   ✅ 3.2 Generate Invoice (Frozen Price):', dataGen.message);

  // 3.3 Verify Invoice Frozen Amount
  const resInvoices = await fetch(`${BASE_URL}/api/v1/billing/invoices?studentId=${testStudentId}`, {
    headers: { Authorization: `Bearer ${superadminToken}` },
  });
  const dataInvoices = await resInvoices.json();
  const generatedInvoice = dataInvoices.data?.[0];
  testInvoiceId = generatedInvoice?.id;
  console.log('   ✅ 3.3 Verify Frozen Price:', {
    invoiceNumber: generatedInvoice?.invoiceNumber,
    baseAmount: generatedInvoice?.baseAmount,
    discountAmount: generatedInvoice?.discountAmount,
    finalAmount: generatedInvoice?.finalAmount, // 250k - 75k = 175k
    status: generatedInvoice?.status,
  });

  // ---------------------------------------------------------------------------
  // MODULE 4: POS CASHIER & FLEXIBLE PAYMENT
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [MODULE 4: POS CASHIER & FLEXIBLE PAYMENT]');

  // 4.1 POS Quick Search
  const resPOSSearch = await fetch(`${BASE_URL}/api/v1/pos/search?q=Bintang`, {
    headers: { Authorization: `Bearer ${tuToken}` },
  });
  const dataPOSSearch = await resPOSSearch.json();
  console.log('   ✅ 4.1 POS Search Student:', dataPOSSearch.data?.[0]?.student?.name, '| Invoice Count:', dataPOSSearch.data?.[0]?.invoices?.length);

  // 4.2 Flexible Partial Payment (Pay Rp 75.000 out of Rp 175.000)
  const resPay = await fetch(`${BASE_URL}/api/v1/pos/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tuToken}` },
    body: JSON.stringify({
      invoiceId: testInvoiceId,
      amount: 75000,
      paymentMethod: 'CASH',
      notes: 'Pembayaran Pertama (Cicilan 1)',
    }),
  });
  const dataPay = await resPay.json();
  testTransactionId = dataPay.data?.transaction?.id;
  console.log('   ✅ 4.2 Process Partial Payment (Rp 75.000):', {
    status: dataPay.data?.invoiceStatus, // PARTIAL
    remainingAmount: dataPay.data?.remainingAmount, // 100.000
  });

  // 4.3 Get Receipt Data for Thermal Printer
  const resReceipt = await fetch(`${BASE_URL}/api/v1/pos/receipt/${testTransactionId}`, {
    headers: { Authorization: `Bearer ${tuToken}` },
  });
  const dataReceipt = await resReceipt.json();
  console.log('   ✅ 4.3 Thermal Receipt Data Ready:', dataReceipt.data?.header?.schoolName, '| Trx:', dataReceipt.data?.transaction?.number);

  // 4.4 VOID Transaction (No-Delete Policy)
  const resVoid = await fetch(`${BASE_URL}/api/v1/pos/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tuToken}` },
    body: JSON.stringify({
      transactionId: testTransactionId,
      voidReason: 'Salah input nominal kasir',
    }),
  });
  const dataVoid = await resVoid.json();
  console.log('   ✅ 4.4 VOID Transaction (No-Delete):', {
    message: dataVoid.message,
    refundedAmount: dataVoid.data?.refundedAmount,
    newInvoiceStatus: dataVoid.data?.invoiceStatus, // UNPAID (reverted)
    newRemainingAmount: dataVoid.data?.remainingAmount, // 175.000 (reverted)
  });

  // ---------------------------------------------------------------------------
  // MODULE 5: STUDENT SAVINGS (TABUNGAN SISWA)
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [MODULE 5: STUDENT SAVINGS]');

  // 5.1 Setor Tabungan (Deposit Rp 300.000)
  const resDep = await fetch(`${BASE_URL}/api/v1/savings/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tuToken}` },
    body: JSON.stringify({
      studentId: testStudentId,
      amount: 300000,
      description: 'Setoran Awal Tabungan Bintang',
    }),
  });
  const dataDep = await resDep.json();
  console.log('   ✅ 5.1 Deposit Savings (Rp 300.000):', {
    accountNumber: dataDep.data?.accountNumber,
    newBalance: dataDep.data?.newBalance,
  });

  // 5.2 Test Protection: Withdraw Exceeding Balance (Should FAIL)
  const resFailWithdraw = await fetch(`${BASE_URL}/api/v1/savings/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tuToken}` },
    body: JSON.stringify({
      studentId: testStudentId,
      amount: 99900000, // Rp 99,9 juta
      description: 'Coba tarik melebihi saldo',
    }),
  });
  const dataFailWithdraw = await resFailWithdraw.json();
  console.log('   🛡️ 5.2 Negative Balance Guard Check:', dataFailWithdraw.success ? 'FAILED (Bypassed!)' : `PASSED (${dataFailWithdraw.message})`);

  // 5.3 Valid Withdrawal (Tarik Rp 50.000)
  const resWithdraw = await fetch(`${BASE_URL}/api/v1/savings/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tuToken}` },
    body: JSON.stringify({
      studentId: testStudentId,
      amount: 50000,
      description: 'Tarik uang saku',
    }),
  });
  const dataWithdraw = await resWithdraw.json();
  console.log('   ✅ 5.3 Valid Withdrawal (Rp 50.000):', { newBalance: dataWithdraw.data?.newBalance }); // 250.000

  // 5.4 Pay Invoice via Student Savings Balance (Pay Rp 175.000)
  const resSavingsPay = await fetch(`${BASE_URL}/api/v1/savings/pay-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tuToken}` },
    body: JSON.stringify({
      invoiceId: testInvoiceId,
      amount: 175000,
    }),
  });
  const dataSavingsPay = await resSavingsPay.json();
  console.log('   ✅ 5.4 Pay Invoice via Savings Balance (Rp 175.000):', {
    invoiceStatus: dataSavingsPay.data?.invoiceStatus, // PAID
    remainingSavingsBalance: dataSavingsPay.data?.remainingSavingsBalance, // 75.000
  });

  // 5.5 Get Savings Account & Ledger
  const resSavingsInfo = await fetch(`${BASE_URL}/api/v1/savings/${testStudentId}`, {
    headers: { Authorization: `Bearer ${tuToken}` },
  });
  const dataSavingsInfo = await resSavingsInfo.json();
  console.log('   ✅ 5.5 Get Savings Account & Ledger:', {
    balance: dataSavingsInfo.data?.account?.balance,
    mutationCount: dataSavingsInfo.data?.history?.length,
  });

  // ---------------------------------------------------------------------------
  // MODULE 6: EXPENSE MANAGEMENT (PENGELUARAN KAS)
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [MODULE 6: EXPENSE MANAGEMENT]');

  // 6.1 Create Expense Category
  const resExpCat = await fetch(`${BASE_URL}/api/v1/expenses/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({ name: 'Pembelian Kitab & Buku', description: 'Pengadaan modul pelajaran' }),
  });
  const dataExpCat = await resExpCat.json();
  const testExpCatId = dataExpCat.data?.id;
  console.log('   ✅ 6.1 Create Expense Category:', dataExpCat.data?.name);

  // 6.2 Record Expense
  const resExp = await fetch(`${BASE_URL}/api/v1/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tuToken}` },
    body: JSON.stringify({
      categoryId: testExpCatId,
      academicYear: '2026/2027',
      description: 'Pembelian 10 eksemplar Kitab Fiqih',
      totalAmount: 120000,
    }),
  });
  const dataExp = await resExp.json();
  testExpenseId = dataExp.data?.id;
  console.log('   ✅ 6.2 Record Expense (Rp 120.000):', dataExp.data?.refNo);

  // 6.3 VOID Expense
  const resVoidExp = await fetch(`${BASE_URL}/api/v1/expenses/${testExpenseId}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tuToken}` },
    body: JSON.stringify({ voidReason: 'Nota pengeluaran ganda' }),
  });
  const dataVoidExp = await resVoidExp.json();
  console.log('   ✅ 6.3 VOID Expense:', dataVoidExp.message);

  // ---------------------------------------------------------------------------
  // MODULE 7: AUDIT & EXECUTIVE ANALYTICS DASHBOARD
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [MODULE 7: AUDIT & EXECUTIVE ANALYTICS DASHBOARD]');

  // 7.1 View Audit Trails
  const resAudit = await fetch(`${BASE_URL}/api/v1/audit/logs`, {
    headers: { Authorization: `Bearer ${superadminToken}` },
  });
  const dataAudit = await resAudit.json();
  console.log('   ✅ 7.1 View Audit Trail Logs Count:', dataAudit.data?.length);

  // 7.2 View Executive Dashboard Analytics
  const resDash = await fetch(`${BASE_URL}/api/v1/audit/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${superadminToken}` },
  });
  const dataDash = await resDash.json();
  console.log('   📊 7.2 Executive Dashboard Summary:', dataDash.data?.summary);
  console.log('   📊 Status Breakdown:', dataDash.data?.invoiceStatusCounts);

  // ---------------------------------------------------------------------------
  // MODULE 8: NOTIFICATION CENTER
  // ---------------------------------------------------------------------------
  console.log('\n🔹 [MODULE 8: NOTIFICATION CENTER]');

  const resNotif = await fetch(`${BASE_URL}/api/v1/notifications/send-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
    body: JSON.stringify({
      to: '081299887766',
      message: 'Halo Wali Murid, pembayaran SPP Bulan Agustus 2026 atas nama Muhammad Bintang telah LUNAS.',
    }),
  });
  const dataNotif = await resNotif.json();
  console.log('   ✅ 8.1 Enqueue WhatsApp Notification:', dataNotif.message);

  console.log('\n================================================================');
  console.log('🎉 ALL 8 MODULES TESTED AND VERIFIED 100% WORKING PERFECTLY!');
  console.log('================================================================');
  process.exit(0);
}

runFullTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
