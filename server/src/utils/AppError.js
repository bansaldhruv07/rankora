export class AppError extends Error {
  constructor(status, code, message, details, cause) {
    super(message, cause ? { cause } : undefined)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message = 'Invalid request', details) => new AppError(400, 'BAD_REQUEST', message, details)
export const unauthorized = (message = 'Authentication required') => new AppError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = 'You do not have access to this resource') => new AppError(403, 'FORBIDDEN', message)
export const notFound = (message = 'Not found') => new AppError(404, 'NOT_FOUND', message)
export const conflict = (message = 'Conflict') => new AppError(409, 'CONFLICT', message)
