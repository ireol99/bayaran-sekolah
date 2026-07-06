/**
 * -----------------------------------------------------------------------------
 * COMMON ERROR: Custom Application Errors
 * -----------------------------------------------------------------------------
 * Kelas-kelas error ini digunakan di seluruh Use Case untuk menangani kegagalan
 * logika bisnis secara terstruktur dan dapat ditangkap oleh Elysia Error Middleware.
 */

export class ApplicationError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Data tidak ditemukan') {
    super(message, 404);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Autentikasi gagal atau token tidak valid') {
    super(message, 401);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Anda tidak memiliki hak akses untuk fitur ini') {
    super(message, 403);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string = 'Validasi data gagal', details?: any) {
    super(message, 422, details);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string = 'Data sudah ada atau bentrok') {
    super(message, 499); // Custom conflict code / 409
  }
}
