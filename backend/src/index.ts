import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { iamModule } from './modules/iam';
import { studentModule } from './modules/student';
import { billingModule } from './modules/billing';
import { paymentModule } from './modules/payment';
import { savingsModule } from './modules/savings';
import { expenseModule } from './modules/expense';
import { auditModule } from './modules/audit';
import { notificationModule } from './modules/notification';
import { frontendCompatModule } from './modules/frontend-compat';
import { ApplicationError } from './common/errors/application-error';
import { errorResponse } from './common/utils/response';

/**
 * -----------------------------------------------------------------------------
 * ENTRY POINT: Application Monolith Server (Elysia.js + Bun)
 * -----------------------------------------------------------------------------
 * Menggabungkan seluruh modul bisnis Clean Architecture ke dalam 1 server proses.
 */

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  // 1. CORS Middleware
  .use(
    cors({
      origin: true, // Izinkan permintaan dari frontend (localhost/domain)
      credentials: true,
    })
  )

  // 2. Swagger Interactive API Documentation (/swagger)
  .use(
    swagger({
      documentation: {
        info: {
          title: '📘 API Aplikasi Bayaran Madrasah (EduPay Central)',
          version: '1.0.0',
          description:
            'Dokumentasi API backend sistem pengelolaan keuangan sekolah berbasis Bun, Elysia.js, PostgreSQL, & Redis.',
        },
        tags: [
          { name: 'Auth', description: 'Autentikasi & Manajemen Pengguna (IAM)' },
          { name: 'Academic', description: 'Master Data Tingkat, Kelas, Diskon, & Siswa' },
          { name: 'Billing', description: 'Master Harga & Generator Tagihan (Frozen Price)' },
          { name: 'POS', description: 'Kasir Pembayaran, Cicilan, Cetak Struk, & VOID' },
          { name: 'Savings', description: 'Tabungan Siswa (Setor, Tarik, Bayar Tagihan)' },
          { name: 'Expenses', description: 'Pencatatan & Void Pengeluaran Kas' },
          { name: 'Audit', description: 'Audit Trail & Dashboard Eksekutif Analytics' },
        ],
      },
    })
  )

  // 3. Global Error Handler Middleware
  .onError(({ error, code }) => {
    console.error(`❌ [Server Error] ${code}:`, error.message);

    if (error instanceof ApplicationError) {
      return errorResponse(error.message, error.details);
    }

    if (code === 'VALIDATION') {
      return errorResponse('Validasi input data gagal. Harap periksa format field yang dikirim.', error.message);
    }

    if (code === 'NOT_FOUND') {
      return errorResponse('Endpoint API tidak ditemukan (404).');
    }

    return errorResponse(error.message || 'Terjadi kesalahan internal pada server.');
  })

  // 4. Root Health Check Endpoint
  .get('/', () => ({
    status: 'ONLINE',
    app: 'Aplikasi Bayaran Madrasah API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/swagger',
  }))

  // 5. Register Sub-Modul Bisnis (Modular Monolith Routing)
  .use(iamModule)
  .use(studentModule)
  .use(billingModule)
  .use(paymentModule)
  .use(savingsModule)
  .use(expenseModule)
  .use(auditModule)
  .use(notificationModule)
  .use(frontendCompatModule)

  // 6. Start HTTP Server
  .listen(port);

console.log(`🚀 Server Aplikasi Bayaran Madrasah berjalan di: http://localhost:${port}`);
console.log(`📑 Dokumentasi Swagger API docs di: http://localhost:${port}/swagger`);
