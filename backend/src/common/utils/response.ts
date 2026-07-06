/**
 * -----------------------------------------------------------------------------
 * COMMON UTILITY: Standard API Response Helper
 * -----------------------------------------------------------------------------
 * Helper ini memastikan semua API response memiliki format JSON yang konsisten,
 * memudahkan tim frontend dan junior developer untuk mengkonsumsi API.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, any>;
  errors?: any;
}

/**
 * Membuat format response API untuk SUKSES
 *
 * @param message - Pesan singkat yang menjelaskan hasil aksi
 * @param data - Payload data JSON yang ingin dikirim ke client
 * @param meta - Metadata tambahan (misal: info pagination, total record)
 */
export function successResponse<T>(message: string, data?: T, meta?: Record<string, any>): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta,
  };
}

/**
 * Membuat format response API untuk ERROR / GAGAL
 *
 * @param message - Pesan kesalahan
 * @param errors - Detail rincian error (misal error validasi field)
 */
export function errorResponse(message: string, errors?: any): ApiResponse {
  return {
    success: false,
    message,
    errors,
  };
}
