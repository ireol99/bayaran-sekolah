import { Elysia, t } from 'elysia';
import bcrypt from 'bcryptjs';
import { db } from '../../config/database';
import { usersTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '../../common/utils/response';
import { authPlugin } from '../../common/middlewares/auth.middleware';

/**
 * -----------------------------------------------------------------------------
 * MODULE 1: Identity & Access Management (IAM) Controller
 * -----------------------------------------------------------------------------
 * Menangani Login, Register, Profile Me, dan Logout.
 */

export const iamModule = new Elysia({ prefix: '/api/v1/auth' })
  .use(authPlugin)

  // ---------------------------------------------------------------------------
  // 1. POST /api/v1/auth/login -> Login Pengguna
  // ---------------------------------------------------------------------------
  .post(
    '/login',
    async ({ body, jwt }) => {
      const { email, password } = body;

      // Cari user berdasarkan email
      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

      if (!user) {
        return errorResponse('Email atau password tidak sesuai.');
      }

      // Verifikasi password hash
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return errorResponse('Email atau password tidak sesuai.');
      }

      // Generate JWT Access Token
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      return successResponse('Login berhasil', {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 4 }),
      }),
      detail: { tags: ['Auth'], summary: 'Login user & dapatkan JWT token' },
    }
  )

  // ---------------------------------------------------------------------------
  // 2. POST /api/v1/auth/register -> Buat User Baru (Khusus Admin/Superadmin)
  // ---------------------------------------------------------------------------
  .post(
    '/register',
    async ({ body, requireRoles }) => {
      // Hanya SUPERADMIN yang boleh mendaftarkan user baru
      await requireRoles(['SUPERADMIN']);

      const { name, email, password, role } = body;

      // Cek apakah email sudah terdaftar
      const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
      if (existing) {
        return errorResponse('Email sudah digunakan oleh akun lain.');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Simpan user baru
      const [newUser] = await db
        .insert(usersTable)
        .values({
          name,
          email,
          passwordHash,
          role: role as any,
        })
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          createdAt: usersTable.createdAt,
        });

      return successResponse('Pengguna baru berhasil didaftarkan.', newUser);
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
        role: t.Union([t.Literal('SUPERADMIN'), t.Literal('ADMIN_TU'), t.Literal('KEPALA_SEKOLAH'), t.Literal('YAYASAN')]),
      }),
      detail: { tags: ['Auth'], summary: 'Registrasi user baru (Superadmin only)' },
    }
  )

  // ---------------------------------------------------------------------------
  // 3. GET /api/v1/auth/me -> Cek Profil User Aktif
  // ---------------------------------------------------------------------------
  .get(
    '/me',
    async ({ getAuthUser }) => {
      const user = await getAuthUser();
      return successResponse('Profil pengguna aktif', user);
    },
    {
      detail: { tags: ['Auth'], summary: 'Dapatkan profil akun dari JWT Token' },
    }
  );
