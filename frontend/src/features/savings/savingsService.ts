import { api } from '../../lib/api-client';

export interface SavingAccount {
  id: string;
  studentId: string;
  studentName: string;
  nis: string;
  className: string;
  balance: number;
  updatedAt: string;
}

export interface SavingTransaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAW' | 'PAYMENT';
  createdAt: string;
}

export interface Expense {
  id: string;
  refNo: string;
  date: string;
  categoryId: string;
  categoryName: string;
  academicYear: string;
  description: string;
  totalAmount: number;
  createdBy: string;
  status: 'SUCCESS' | 'VOIDED';
  voidedAt?: string;
  voidReason?: string;
}

export interface ExpenseCategory {
  id: string;
  category: string;
  description: string;
}

export const savingsService = {
  // SAVINGS
  async getAccounts(): Promise<SavingAccount[]> {
    const response = await api.get<SavingAccount[]>('/savings/accounts');
    return response.data;
  },

  async getAccountById(id: string): Promise<SavingAccount> {
    const response = await api.get<SavingAccount>(`/savings/accounts/${id}`);
    return response.data;
  },

  async getTransactions(accountId: string): Promise<SavingTransaction[]> {
    const response = await api.get<SavingTransaction[]>(`/savings/accounts/${accountId}/transactions`);
    return response.data;
  },

  async deposit(accountId: string, amount: number): Promise<void> {
    await api.post(`/savings/accounts/${accountId}/deposit`, { amount });
  },

  async withdraw(accountId: string, amount: number): Promise<void> {
    await api.post(`/savings/accounts/${accountId}/withdraw`, { amount });
  },

  // EXPENSES
  async getExpenses(): Promise<Expense[]> {
    const response = await api.get<Expense[]>('/expenses');
    return response.data;
  },

  async getCategories(): Promise<ExpenseCategory[]> {
    const response = await api.get<ExpenseCategory[]>('/expenses/categories');
    return response.data;
  },

  async addCategory(category: string, description: string): Promise<ExpenseCategory> {
    const response = await api.post<ExpenseCategory>('/expenses/categories', { category, description });
    return response.data;
  },

  async createExpense(data: Omit<Expense, 'id' | 'refNo' | 'status'>): Promise<Expense> {
    const response = await api.post<Expense>('/expenses', data);
    return response.data;
  },

  async voidExpense(id: string, reason: string): Promise<void> {
    await api.post(`/expenses/${id}/void`, { reason });
  },
};
