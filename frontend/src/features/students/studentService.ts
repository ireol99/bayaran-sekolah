import { api } from '../../lib/api-client';

export interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  level: 'MI' | 'MTS' | 'MA';
  className: string;
  classId?: string;
  discountCategory: string;
  discountAmount: number;
  savingsBalance?: number;
  parentPhone: string;
  parentName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'MOVED';
}

export interface LevelItem {
  id: string;
  name: string;
  code: string;
}

export interface ClassItem {
  id: string;
  name: string;
  levelId: string;
}

export interface DiscountCategoryItem {
  id: string;
  name: string;
  amount: number;
  isActive: boolean;
}

export interface AcademicYearItem {
  id: string;
  name: string;
  isCurrent: boolean;
  createdAt?: string;
}

export const studentService = {
  // Siswa CRUD
  async getAll(): Promise<Student[]> {
    const response = await api.get<Student[]>('/students');
    return response.data;
  },

  async getById(id: string): Promise<Student> {
    const response = await api.get<Student>(`/students/${id}`);
    return response.data;
  },

  async create(data: Partial<Student>): Promise<Student> {
    const response = await api.post<Student>('/students', data);
    return response.data;
  },

  async update(id: string, data: Partial<Student>): Promise<Student> {
    const response = await api.put<Student>(`/students/${id}`, data);
    return response.data;
  },

  async toggleStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<Student> {
    const response = await api.patch<Student>(`/students/${id}/status`, { status });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/students/${id}`);
  },

  async importBatch(students: Omit<Student, 'id' | 'discountAmount' | 'status'>[]): Promise<void> {
    await api.post('/students/import', { items: students });
  },

  async promoteBatch(studentIds: string[], targetClassName: string, targetLevel?: string): Promise<void> {
    await api.post('/students/promote', { studentIds, targetClassName, targetLevel });
  },

  // Levels, Classes & Discounts API
  async getLevels(): Promise<LevelItem[]> {
    const response = await api.get<LevelItem[]>('/academic/levels');
    return response.data;
  },

  async createLevel(data: { name: string; code: string }): Promise<LevelItem> {
    const response = await api.post<LevelItem>('/academic/levels', data);
    return response.data;
  },

  async deleteLevel(id: string): Promise<void> {
    await api.delete(`/academic/levels/${id}`);
  },

  async getClasses(): Promise<ClassItem[]> {
    const response = await api.get<ClassItem[]>('/academic/classes');
    return response.data;
  },

  async createClass(data: { name: string; levelId: string }): Promise<ClassItem> {
    const response = await api.post<ClassItem>('/academic/classes', data);
    return response.data;
  },

  async deleteClass(id: string): Promise<void> {
    await api.delete(`/academic/classes/${id}`);
  },

  async getDiscounts(): Promise<DiscountCategoryItem[]> {
    const response = await api.get<DiscountCategoryItem[]>('/academic/discounts');
    return response.data;
  },

  async createDiscount(data: { name: string; amount: number; isActive?: boolean }): Promise<DiscountCategoryItem> {
    const response = await api.post<DiscountCategoryItem>('/academic/discounts', data);
    return response.data;
  },

  async updateDiscount(id: string, data: { name?: string; amount?: number; isActive?: boolean }): Promise<DiscountCategoryItem> {
    const response = await api.put<DiscountCategoryItem>(`/academic/discounts/${id}`, data);
    return response.data;
  },

  async deleteDiscount(id: string): Promise<void> {
    await api.delete(`/academic/discounts/${id}`);
  },

  // Academic Years API
  async getAcademicYears(): Promise<AcademicYearItem[]> {
    const response = await api.get<AcademicYearItem[]>('/academic/years');
    return response.data;
  },

  async createAcademicYear(data: { name: string; isCurrent?: boolean }): Promise<AcademicYearItem> {
    const response = await api.post<AcademicYearItem>('/academic/years', data);
    return response.data;
  },

  async setCurrentAcademicYear(id: string): Promise<AcademicYearItem> {
    const response = await api.patch<AcademicYearItem>(`/academic/years/${id}/set-current`, {});
    return response.data;
  },

  async deleteAcademicYear(id: string): Promise<void> {
    await api.delete(`/academic/years/${id}`);
  },
};
