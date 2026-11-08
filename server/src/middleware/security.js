import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

const limiter = (windowMs, max, code) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, code, 'Too many requests, please try again later')),
  })

export const apiLimiter = limiter(15 * 60 * 1000, env.rateLimitMax, 'RATE_LIMITED')
export const authLimiter = limiter(15 * 60 * 1000, env.authRateLimitMax, 'AUTH_RATE_LIMITED')
export const adminAuthLimiter = limiter(15 * 60 * 1000, Math.max(5, Math.floor(env.authRateLimitMax / 2)), 'AUTH_RATE_LIMITED')
export const readerSessionLimiter = limiter(15 * 60 * 1000, Math.max(60, env.rateLimitMax / 5), 'RATE_LIMITED')
// A page of PDF.js range requests is many small fetches, so streaming has its own, higher ceiling.
// Abuse is bounded per session by bytes served instead (see routes/reader.js).
export const readerStreamLimiter = limiter(15 * 60 * 1000, env.rateLimitMax * 13, 'RATE_LIMITED')
export const publicWriteLimiter = limiter(60 * 60 * 1000, Math.max(20, env.rateLimitMax / 15), 'RATE_LIMITED')
// The teacher stats page is public (addressed by a secret token), so guessing tokens is rate limited.
export const statsLimiter = limiter(15 * 60 * 1000, 40, 'RATE_LIMITED')
export const paymentLimiter = limiter(15 * 60 * 1000, Math.max(30, env.rateLimitMax / 5), 'PAYMENT_RATE_LIMITED')

// Cookie auth + SameSite=None needs CSRF protection: browsers cannot attach a custom header
// cross-origin without a CORS preflight, which only the configured frontend origin passes.
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])
export function requireCustomHeader(req, _res, next) {
  if (SAFE.has(req.method) || req.path.startsWith('/webhooks/')) return next()
  if (req.get('x-requested-with') !== 'rankora') {
    return next(new AppError(403, 'CSRF_REJECTED', 'Missing required request header'))
  }
  next()
}
