import { Elysia, t } from 'elysia';
import { redis } from '../../config/database';
import { successResponse } from '../../common/utils/response';
import { authPlugin } from '../../common/middlewares/auth.middleware';

/**
 * -----------------------------------------------------------------------------
 * MODULE 8: Notification Center (WhatsApp Task Queue)
 * -----------------------------------------------------------------------------
 * Antrian pengiriman pesan notifikasi WhatsApp menggunakan Redis Queue.
 */

export interface WhatsAppNotificationPayload {
  to: string; // Nomor telepon penerima (contoh: 081234567890)
  template: 'INVOICE_CREATED' | 'PAYMENT_SUCCESS' | 'VOID_ALERT';
  data: Record<string, any>;
}

/**
 * Helper untuk enqueue pesan WhatsApp ke Redis / Log
 */
export async function enqueueWhatsAppNotification(payload: WhatsAppNotificationPayload) {
  try {
    const queueData = JSON.stringify({
      ...payload,
      createdAt: new Date().toISOString(),
    });

    if (redis.status === 'ready') {
      await redis.lpush('queue:whatsapp_notifications', queueData);
      console.log(`📱 [WhatsApp Queue] Enqueued message to ${payload.to} (${payload.template})`);
    } else {
      console.log(`📱 [WhatsApp Simulated] Message sent to ${payload.to}:`, payload.data);
    }
  } catch (e: any) {
    console.error('⚠️ Failed to enqueue WhatsApp message:', e.message);
  }
}

export const notificationModule = new Elysia({ prefix: '/api/v1/notifications' })
  .use(authPlugin)

  // Test send notification endpoint
  .post(
    '/send-test',
    async ({ body, requireRoles }) => {
      await requireRoles(['SUPERADMIN', 'ADMIN_TU']);
      await enqueueWhatsAppNotification({
        to: body.to,
        template: 'INVOICE_CREATED',
        data: { message: body.message },
      });
      return successResponse('Notifikasi berhasil dimasukkan ke antrian pengiriman.');
    },
    {
      body: t.Object({
        to: t.String(),
        message: t.String(),
      }),
    }
  );
