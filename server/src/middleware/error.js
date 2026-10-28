import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import { logger } from '../utils/logger.js'

export const notFoundHandler = (req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found'))

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let { status, code, message, details } = normalise(err)

  if (status >= 500) {
    logger.error('request failed', { method: req.method, path: req.path, error: err.message, stack: env.isProd ? undefined : err.stack })
    if (env.isProd) message = 'Something went wrong'
  }
  res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } })
}

function normalise(err) {
  if (err instanceof AppError) return err
  if (err.type === 'entity.parse.failed') return { status: 400, code: 'BAD_REQUEST', message: 'Malformed JSON body' }
  if (err.type === 'entity.too.large') return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' }
  if (err.name === 'CastError') return { status: 404, code: 'NOT_FOUND', message: 'Not found' }
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    return { status: 400, code: 'BAD_REQUEST', message: 'Validation failed', details }
  }
  if (err.code === 11000) return { status: 409, code: 'CONFLICT', message: 'A record with these details already exists' }
  if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
    return { status: 503, code: 'DB_UNAVAILABLE', message: 'Service temporarily unavailable' }
  }
  return { status: 500, code: 'INTERNAL', message: err.message }
}
