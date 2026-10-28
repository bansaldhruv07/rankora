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
