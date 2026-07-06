import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { UnauthorizedError, ForbiddenError } from '../errors/application-error';

/**
 * -----------------------------------------------------------------------------
 * MIDDLEWARE: Auth & Role Guard
 * -----------------------------------------------------------------------------
 * Middleware ini menangani verifikasi JWT token dan otorisasi Role-Based Access Control (RBAC).
 *
 * Peran (Roles) yang didukung:
 * - SUPERADMIN: Akses penuh ke seluruh modul
 * - ADMIN_TU: Operasional kasir, tagihan, tabungan, pengeluaran
 * - KEPALA_SEKOLAH: View-only dashboard & laporan eksekutif
 * - YAYASAN: View-only dashboard & laporan eksekutif global
 */

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN_TU' | 'KEPALA_SEKOLAH' | 'YAYASAN';
}

export const authPlugin = new Elysia({ name: 'auth-plugin' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'super-secret-key-madrasah-2026-bun',
    })
  )
  .derive({ as: 'global' }, ({ jwt, headers }) => {
    return {
      // Helper untuk memverifikasi user dari header Authorization Bearer
      getAuthUser: async (): Promise<UserPayload> => {
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedError('Header otorisasi tidak ditemukan. Harap sertakan Bearer Token.');
        }

        const token = authHeader.split(' ')[1];
        const payload = (await jwt.verify(token)) as unknown as UserPayload;

        if (!payload || !payload.id || !payload.role) {
          throw new UnauthorizedError('Token JWT tidak valid atau telah kadaluarsa.');
        }

        return payload;
      },

      // Guard untuk memeriksa apakah user memiliki salah satu role yang diizinkan
      requireRoles: async (allowedRoles: Array<UserPayload['role']>): Promise<UserPayload> => {
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedError('Header otorisasi tidak ditemukan.');
        }

        const token = authHeader.split(' ')[1];
        const payload = (await jwt.verify(token)) as unknown as UserPayload;

        if (!payload || !payload.id) {
          throw new UnauthorizedError('Token JWT tidak valid.');
        }

        if (!allowedRoles.includes(payload.role)) {
          throw new ForbiddenError(`Akses ditolak. Peran '${payload.role}' tidak memiliki izin untuk fitur ini.`);
        }

        return payload;
      },
    };
  });
