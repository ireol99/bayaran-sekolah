import { api } from '../../lib/api-client';

// ─── Interfaces ──────────────────────────────────────────────

export interface BillingType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  nis: string;
  className: string;
  level: 'MI' | 'MTS' | 'MA';
  academicYear: string;
  period: string;
  type: string;
  baseAmount: number;
  discountAmount: number;
  discountCategoryName: string | null;
  finalAmount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  createdAt: string;
}

export interface Transaction {
  id: string;
  transactionNumber?: string;
  receiptNumber?: string;
  invoiceId: string;
  invoiceNumber?: string;
  billingType?: string;
  period?: string;
  studentName: string;
  studentNis?: string;
  className?: string;
  level?: string;
  academicYear?: string;
  amount: number;
  type: 'PAYMENT' | 'VOID';
  paymentMethod: 'CASH' | 'TRANSFER' | 'SAVINGS';
  cashierName: string;
  createdAt: string;
  voidedAt?: string;
  voidReason?: string;
}

// ─── Service ─────────────────────────────────────────────────

export const billingService = {
  // ── Jenis Tagihan (Billing Types) ──────────────────────────
  async getBillingTypes(): Promise<BillingType[]> {
    const response = await api.get<BillingType[]>('/billing/types');
    return response.data;
  },

  async createBillingType(data: { name: string; description?: string }): Promise<BillingType> {
    const response = await api.post<BillingType>('/billing/types', data);
    return response.data;
  },

  async updateBillingType(id: string, data: { name?: string; description?: string }): Promise<BillingType> {
    const response = await api.put<BillingType>(`/billing/types/${id}`, data);
    return response.data;
  },

  async deleteBillingType(id: string): Promise<void> {
    await api.delete(`/billing/types/${id}`);
  },

  // ── Invoices ───────────────────────────────────────────────
  async getInvoices(): Promise<Invoice[]> {
    const response = await api.get<Invoice[]>('/invoices');
    return response.data;
  },

  async getInvoicesByStudent(studentId: string): Promise<Invoice[]> {
    const response = await api.get<Invoice[]>(`/invoices/student/${studentId}`);
    return response.data;
  },

  async generateMassBilling(data: {
    academicYear: string;
    levels: string[];
    classes: string[];
    billingType: string;
    baseAmount: number;
    periods: string[];
  }): Promise<void> {
    await api.post('/invoices/generate-mass', data);
  },

  // ── Payments & Transactions ────────────────────────────────
  async processPayment(payments: {
    invoiceId: string;
    amount: number;
    paymentMethod: 'CASH' | 'TRANSFER' | 'SAVINGS';
    cashierName: string;
  }[]): Promise<Transaction[]> {
    const response = await api.post<Transaction[]>('/payments', { payments });
    return response.data;
  },

  async getTransactions(): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>('/transactions');
    return response.data;
  },

  async voidTransaction(id: string, reason: string): Promise<void> {
    await api.post(`/transactions/${id}/void`, { reason });
  },
};
