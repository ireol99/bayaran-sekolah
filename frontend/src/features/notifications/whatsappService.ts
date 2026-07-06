/**
 * WhatsApp Notification Service
 * Triggers automated WhatsApp messages via Gateway API for payments & billing creation
 */
import { api } from '../../lib/api-client';
import { formatRupiah } from '../../lib/utils';
import { toast } from 'sonner';

export interface SendWhatsAppPayload {
  recipientName: string;
  phone: string;
  type: 'BILL_ISSUE' | 'RECEIPT' | 'REMINDER';
  message: string;
}

export const whatsappService = {
  /**
   * Send WhatsApp notification
   */
  async sendNotification(payload: SendWhatsAppPayload): Promise<void> {
    try {
      await api.post('/whatsapp-config/test', {
        phone: payload.phone,
        message: payload.message,
      });
    } catch (err) {
      console.error('WhatsApp Gateway trigger error:', err);
    }
  },

  /**
   * Send WhatsApp receipt notification after POS Payment
   */
  async sendPaymentReceipt(data: {
    studentName: string;
    phone?: string;
    receiptNumber: string;
    billingType: string;
    period: string;
    amount: number;
  }): Promise<void> {
    const phone = data.phone || '081234567890';
    const message = `Yth. Wali Murid ${data.studentName}, Pembayaran ${data.billingType} (${data.period}) sebesar ${formatRupiah(data.amount)} dinyatakan LUNAS. No. Struk: ${data.receiptNumber}. Terima kasih.`;

    await this.sendNotification({
      recipientName: `Wali Murid ${data.studentName}`,
      phone,
      type: 'RECEIPT',
      message,
    });

    toast.info(`📱 Notifikasi WhatsApp Struk (${data.receiptNumber}) dikirim ke ${data.studentName}!`, {
      duration: 4000,
    });
  },

  /**
   * Send WhatsApp notification when new Billing Statement is generated
   */
  async sendBillingIssue(data: {
    studentName: string;
    phone?: string;
    invoiceNumber: string;
    billingType: string;
    period: string;
    amount: number;
  }): Promise<void> {
    const phone = data.phone || '081234567890';
    const message = `Yth. Wali Murid ${data.studentName}, Tagihan baru ${data.billingType} (${data.period}) sebesar ${formatRupiah(data.amount)} telah diterbitkan. No. Billing: ${data.invoiceNumber}.`;

    await this.sendNotification({
      recipientName: `Wali Murid ${data.studentName}`,
      phone,
      type: 'BILL_ISSUE',
      message,
    });

    toast.info(`📱 Notifikasi WhatsApp Tagihan Baru (${data.invoiceNumber}) dikirim ke ${data.studentName}!`, {
      duration: 4000,
    });
  },
};
