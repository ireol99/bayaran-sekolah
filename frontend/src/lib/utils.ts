/**
 * Utility functions for Bayaran Madrasah
 */

/**
 * Format number as Indonesian Rupiah currency
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with dots separator (e.g., 1.500.000)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format date to Indonesian locale string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  });
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format timestamp (YYYY-MM-DD HH:mm:ss)
 */
export function formatTimestamp(date?: Date | string | null): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Short date format (e.g., 04 Jul 2026)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get initials from a name (e.g., "Ahmad Fauzi" → "AF")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Get Indonesian month names
 */
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April',
  'Mei', 'Juni', 'Juli', 'Agustus',
  'September', 'Oktober', 'November', 'Desember',
] as const;

/**
 * Calculate invoice status based on paid amount vs total
 */
export function getInvoiceStatus(paidAmount: number, totalAmount: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paidAmount <= 0) return 'UNPAID';
  if (paidAmount >= totalAmount) return 'PAID';
  return 'PARTIAL';
}

/**
 * Calculate collection ratio percentage
 */
export function getCollectionRatio(collected: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((collected / total) * 100);
}

/**
 * Debounce a value (typically used for search inputs)
 */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/**
 * Classname utility — joins class names, filtering falsy values
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generate a display-friendly academic year format
 * e.g., "2025/2026"
 */
export function formatAcademicYear(year: number): string {
  return `${year}/${year + 1}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Role labels for display
 */
export const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN_TU: 'Admin TU',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  YAYASAN: 'Yayasan',
};

/**
 * Payment status config
 */
export const STATUS_CONFIG = {
  UNPAID: { label: 'Belum Bayar', variant: 'danger' as const, icon: '🔴' },
  PARTIAL: { label: 'Sebagian', variant: 'warning' as const, icon: '🟡' },
  PAID: { label: 'Lunas', variant: 'success' as const, icon: '🟢' },
  VOIDED: { label: 'Void', variant: 'danger' as const, icon: '❌' },
} as const;

/**
 * Level labels
 */
export const LEVEL_LABELS: Record<string, string> = {
  MI: 'Madrasah Ibtidaiyah (MI)',
  MTS: 'Madrasah Tsanawiyah (MTs)',
  MA: 'Madrasah Aliyah (MA)',
};
