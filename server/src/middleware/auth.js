import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { forbidden, unauthorized } from '../utils/AppError.js'
import { asyncHandler } from '../utils/http.js'

export const COOKIE_NAME = 'rk_token'
export const ADMIN_COOKIE_NAME = 'rk_admin'

// Staff roles and what each may do. Roles live only in the database and are never read from a request.
export const PERMISSIONS = {
  admin: ['content', 'pricing', 'orders', 'refund', 'users', 'audit', 'support'],
  editor: ['content', 'support'],
}

const cookieBase = (maxAge) => ({
  httpOnly: true,
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  ...(maxAge ? { maxAge } : {}),
})
const studentCookie = (maxAge) => ({ ...cookieBase(maxAge), path: '/' })
// The admin cookie is only ever sent to admin endpoints.
const adminCookie = (maxAge) => ({ ...cookieBase(maxAge), path: '/api/admin' })

export function issueSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), tv: user.tokenVersion ?? 0 }, env.jwtSecret, { algorithm: 'HS256', expiresIn: `${env.jwtExpiresDays}d` })
  res.cookie(COOKIE_NAME, token, studentCookie(env.jwtExpiresDays * 86400000))
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, studentCookie())
}

export function issueAdminSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), tv: user.tokenVersion ?? 0, aud: 'admin' }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: `${env.adminSessionHours}h`,
  })
  res.cookie(ADMIN_COOKIE_NAME, token, adminCookie(env.adminSessionHours * 3600000))
}

export function clearAdminSession(res) {
  res.clearCookie(ADMIN_COOKIE_NAME, adminCookie())
}

async function loadUser(token, { admin }) {
  if (!token) return null
  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] })
  } catch {
    return null
  }
  // A student token cannot act as an admin token, or the other way round.
  if (admin ? payload.aud !== 'admin' : payload.aud !== undefined) return null
  const user = await User.findById(payload.sub).select('+tokenVersion')
  if (!user || user.tokenVersion !== payload.tv || user.suspendedAt) return null
  return user
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req.cookies?.[COOKIE_NAME], { admin: false })
  if (!user) throw unauthorized()
  req.user = user
  next()
})

// For routes where a cookie is needed only in some modes (the reader stream).
export const studentFromRequest = (req) => loadUser(req.cookies?.[COOKIE_NAME], { admin: false })

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = (await loadUser(req.cookies?.[COOKIE_NAME], { admin: false })) || undefined
  next()
})

// Staff authentication: a separate cookie, a separate token audience, and the role is re-read from
// the database on every request, so demoting or suspending an account takes effect immediately.
export const requireStaff = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req.cookies?.[ADMIN_COOKIE_NAME], { admin: true })
  if (!user) throw unauthorized('Admin sign-in required')
  if (!PERMISSIONS[user.role]) throw forbidden('Admin access required')
  req.user = user
  next()
})

export const can = (user, permission) => PERMISSIONS[user?.role]?.includes(permission) ?? false

export const requirePermission = (permission) => (req, _res, next) =>
  can(req.user, permission) ? next() : next(forbidden('You do not have permission to do that'))
