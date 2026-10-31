import 'dotenv/config'
import { fileURLToPath } from 'node:url'

const isTest = process.env.NODE_ENV === 'test'
const isProd = process.env.NODE_ENV === 'production'

const int = (value, fallback) => (value === undefined || value === '' ? fallback : Number.parseInt(value, 10))

export const env = {
  isProd,
  isTest,
  port: int(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rankora',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresDays: int(process.env.JWT_EXPIRES_DAYS, 7),
  cookieSameSite: process.env.COOKIE_SAMESITE || (isProd ? 'none' : 'lax'),
  trustProxy: process.env.TRUST_PROXY === 'true',
  rateLimitMax: int(process.env.RATE_LIMIT_MAX, 300),
  authRateLimitMax: int(process.env.AUTH_RATE_LIMIT_MAX, 10),
  bcryptRounds: int(process.env.BCRYPT_ROUNDS, isTest ? 4 : 12),
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  paymentProvider: process.env.PAYMENT_PROVIDER || '',
  mockPaymentSecret: process.env.MOCK_PAYMENT_SECRET || 'rankora-mock-secret-not-for-production',
  storageDir: process.env.PRIVATE_STORAGE_DIR || fileURLToPath(new URL('../../storage/private', import.meta.url)),
  adminSessionHours: int(process.env.ADMIN_SESSION_HOURS, 8),
  maxPdfBytes: int(process.env.MAX_PDF_MB, 60) * 1024 * 1024,
  maxCoverBytes: int(process.env.MAX_COVER_MB, 2) * 1024 * 1024,
  reader: {
    idleMinutes: int(process.env.READER_SESSION_MINUTES, 30),
    maxHours: int(process.env.READER_MAX_SESSION_HOURS, 12),
    maxActiveSessions: int(process.env.READER_MAX_ACTIVE_SESSIONS, 3),
    hourlyOpenLimit: int(process.env.READER_HOURLY_OPEN_LIMIT, 30),
    derivedTtlHours: int(process.env.DERIVED_TTL_HOURS, 6),
  },
  smtpUrl: process.env.SMTP_URL || '',
  mailFrom: process.env.MAIL_FROM || 'Rankora <no-reply@localhost>',
  supportEmail: process.env.SUPPORT_EMAIL || '',
}

// With no keys: local development uses the sandbox ('mock'); production never does, it simply does not take
// payments yet ('disabled') until the Razorpay keys are added.
if (!env.paymentProvider) {
  env.paymentProvider = env.razorpay.keyId && env.razorpay.keySecret ? 'razorpay' : isProd ? 'disabled' : 'mock'
}

export function assertEnv() {
  const problems = []
  if (env.jwtSecret.length < 32) problems.push('JWT_SECRET must be set to at least 32 characters')
  if (isProd && env.paymentProvider === 'mock') problems.push('mock payment provider is not allowed in production')
  if (env.paymentProvider === 'razorpay') {
    if (!env.razorpay.keyId || !env.razorpay.keySecret) problems.push('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required')
    if (!env.razorpay.webhookSecret) problems.push('RAZORPAY_WEBHOOK_SECRET is required')
  }
  if (isProd && !env.frontendOrigin.startsWith('https://')) problems.push('FRONTEND_ORIGIN must be https in production')
  if (problems.length) throw new Error(`Invalid configuration:\n - ${problems.join('\n - ')}`)
}
