import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { forbidden, unauthorized } from '../utils/AppError.js'
import { asyncHandler } from '../utils/http.js'

export const COOKIE_NAME = 'rk_token'

export function issueSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), tv: user.tokenVersion ?? 0 }, env.jwtSecret, {
    expiresIn: `${env.jwtExpiresDays}d`,
  })
  res.cookie(COOKIE_NAME, token, cookieOptions(env.jwtExpiresDays * 86400000))
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions())
}

function cookieOptions(maxAge) {
  return { httpOnly: true, secure: env.isProd || env.cookieSameSite === 'none', sameSite: env.cookieSameSite, path: '/', ...(maxAge ? { maxAge } : {}) }
}

async function loadUser(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    return null
  }
  const user = await User.findById(payload.sub).select('+tokenVersion')
  if (!user || user.tokenVersion !== payload.tv) return null
  return user
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req)
  if (!user) throw unauthorized()
  req.user = user
  next()
})

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = (await loadUser(req)) || undefined
  next()
})

export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(forbidden('Admin access required'))
  next()
}
