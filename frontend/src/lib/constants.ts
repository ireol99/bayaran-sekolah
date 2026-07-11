/**
 * App-wide constants
 */

export const APP_NAME = 'Bayaran Madrasah';
export const APP_DESCRIPTION = 'Sistem Manajemen Keuangan Sekolah Madrasah Terpadu';

/**
 * Academic levels
 */
export const LEVELS = [
  { code: 'MI', name: 'Madrasah Ibtidaiyah', short: 'MI' },
  { code: 'MTS', name: 'Madrasah Tsanawiyah', short: 'MTs' },
  { code: 'MA', name: 'Madrasah Aliyah', short: 'MA' },
] as const;

/**
 * User roles
 */
export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN_TU: 'ADMIN_TU',
  KEPALA_SEKOLAH: 'KEPALA_SEKOLAH',
  YAYASAN: 'YAYASAN',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

/**
 * Invoice statuses
 */
export const INVOICE_STATUS = {
  UNPAID: 'UNPAID',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

/**
 * Transaction types
 */
export const TRANSACTION_TYPE = {
  PAYMENT: 'PAYMENT',
  VOID: 'VOID',
} as const;

/**
 * Payment methods
 */
export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'TRANSFER', label: 'Transfer Bank' },
  { value: 'SAVINGS', label: 'Tabungan Siswa' },
] as const;

/**
 * Saving transaction types
 */
export const SAVING_TX_TYPES = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
  PAYMENT: 'PAYMENT',
} as const;

/**
 * Month names (Indonesian)
 */
export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April',
  'Mei', 'Juni', 'Juli', 'Agustus',
  'September', 'Oktober', 'November', 'Desember',
] as const;

/**
 * Default academic year
 */
export const DEFAULT_ACADEMIC_YEAR = '2025/2026';

/**
 * Pagination defaults
 */
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * Navigation menu items with RBAC
 */
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'],
  },
  {
    id: 'students',
    label: 'Data Siswa',
    path: '/students',
    icon: 'GraduationCap',
    roles: ['SUPERADMIN', 'ADMIN_TU'],
    children: [
      { id: 'student-list', label: 'Daftar Siswa', path: '/students', icon: 'Users', roles: ['SUPERADMIN', 'ADMIN_TU'] },
      { id: 'student-import', label: 'Import Siswa', path: '/students/import', icon: 'Upload', roles: ['SUPERADMIN', 'ADMIN_TU'] },
      { id: 'class-promotion', label: 'Kenaikan Kelas', path: '/students/promotion', icon: 'ArrowUpCircle', roles: ['SUPERADMIN', 'ADMIN_TU'] },
      { id: 'levels-classes', label: 'Tingkat & Kelas', path: '/students/levels', icon: 'Layers', roles: ['SUPERADMIN', 'ADMIN_TU'] },
      { id: 'discount-categories', label: 'Kategori Diskon', path: '/students/discounts', icon: 'BadgePercent', roles: ['SUPERADMIN', 'ADMIN_TU'] },
    ],
  },
  {
    id: 'billing',
    label: 'Tagihan',
    path: '/billing',
    icon: 'Receipt',
    roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'],
    children: [
      { id: 'billing-list', label: 'Daftar Tagihan', path: '/billing', icon: 'Receipt', roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'] },
      { id: 'billing-types', label: 'Jenis Tagihan', path: '/billing/types', icon: 'Tag', roles: ['SUPERADMIN', 'ADMIN_TU'] },
      { id: 'academic-years', label: 'Tahun Ajaran', path: '/billing/years', icon: 'Calendar', roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'] },
    ],
  },
  {
    id: 'pos',
    label: 'POS Kasir',
    path: '/pos',
    icon: 'ShoppingCart',
    roles: ['SUPERADMIN', 'ADMIN_TU'],
    children: [
      { id: 'pos-cashier', label: 'Kasir', path: '/pos', icon: 'Monitor', roles: ['SUPERADMIN', 'ADMIN_TU'] },
      { id: 'pos-history', label: 'Riwayat Transaksi', path: '/pos/history', icon: 'History', roles: ['SUPERADMIN', 'ADMIN_TU'] },
    ],
  },
  {
    id: 'savings',
    label: 'Tabungan',
    path: '/savings',
    icon: 'Coins',
    roles: ['SUPERADMIN', 'ADMIN_TU'],
  },
  {
    id: 'expenses',
    label: 'Pengeluaran',
    path: '/expenses',
    icon: 'Wallet',
    roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'],
    children: [
      { id: 'expense-list', label: 'Daftar Pengeluaran', path: '/expenses', icon: 'FileText', roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'] },
      { id: 'expense-add', label: 'Input Pengeluaran', path: '/expenses/new', icon: 'FilePlus', roles: ['SUPERADMIN', 'ADMIN_TU'] },
      { id: 'expense-categories', label: 'Kategori', path: '/expenses/categories', icon: 'Tag', roles: ['SUPERADMIN', 'ADMIN_TU'] },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifikasi',
    path: '/notifications',
    icon: 'Bell',
    roles: ['SUPERADMIN', 'ADMIN_TU'],
  },
  {
    id: 'reports',
    label: 'Laporan',
    path: '/reports',
    icon: 'BarChart3',
    roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'],
    children: [
      { id: 'audit-trail', label: 'Audit Trail', path: '/reports/audit', icon: 'Shield', roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'] },
      { id: 'financial-report', label: 'Laporan Keuangan', path: '/reports/financial', icon: 'TrendingUp', roles: ['SUPERADMIN', 'ADMIN_TU', 'KEPALA_SEKOLAH', 'YAYASAN'] },
    ],
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    path: '/settings',
    icon: 'Settings',
    roles: ['SUPERADMIN', 'YAYASAN'],
    children: [
      { id: 'user-management', label: 'Manajemen User', path: '/settings/users', icon: 'UserCog', roles: ['SUPERADMIN'] },
      { id: 'role-permissions', label: 'Hak Akses', path: '/settings/permissions', icon: 'ShieldAlert', roles: ['SUPERADMIN'] },
      { id: 'madrasah-profile', label: 'Profil Madrasah', path: '/settings/profile', icon: 'Building2', roles: ['SUPERADMIN', 'YAYASAN'] },
      { id: 'api-gateway', label: 'Gateway WhatsApp', path: '/settings/gateway', icon: 'Cpu', roles: ['SUPERADMIN'] },
      { id: 'database-backup', label: 'Backup & Reset DB', path: '/settings/backup', icon: 'Database', roles: ['SUPERADMIN'] },
    ],
  },
];
