import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { growth } from '../../config/growth.js'
import { normalizeCode } from './codes.js'

// A visitor who arrives through /?t=CODE (teacher) or /?ref=CODE (friend) has that code remembered for
// ATTRIBUTION_DAYS in a signed, httpOnly cookie. It is only ever a hint: every discount is re-validated on the
// server when an order is priced, so tampering with it can never produce a discount that a typed code could not.
export const ATTRIBUTION_COOKIE = 'rk_attr'

const options = (maxAge) => ({
  httpOnly: true,
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/',
  ...(maxAge ? { maxAge } : {}),
})

const maxAgeMs = () => growth.ATTRIBUTION_DAYS * 86400000

export function readAttribution(req) {
  const token = req?.cookies?.[ATTRIBUTION_COOKIE]
  if (!token) return {}
  try {
    const p = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'], audience: 'attribution' })
    const fresh = (at) => Number.isFinite(at) && Date.now() - at < maxAgeMs()
    return {
      teacherCode: fresh(p.tAt) && p.t ? normalizeCode(p.t) : undefined,
      teacherAt: fresh(p.tAt) ? p.tAt : undefined,
      refCode: fresh(p.rAt) && p.r ? normalizeCode(p.r) : undefined,
      refAt: fresh(p.rAt) ? p.rAt : undefined,
    }
  } catch {
    return {}
  }
}

// Saves a code from a link. A newer teacher code replaces the old one; likewise for referral codes.
export function writeAttribution(req, res, { teacherCode, refCode }) {
  const current = readAttribution(req)
  const now = Date.now()
  const next = {
    t: teacherCode ?? current.teacherCode,
    tAt: teacherCode ? now : current.teacherAt,
    r: refCode ?? current.refCode,
    rAt: refCode ? now : current.refAt,
  }
  const token = jwt.sign(next, env.jwtSecret, { algorithm: 'HS256', audience: 'attribution', expiresIn: `${growth.ATTRIBUTION_DAYS}d` })
  res.cookie(ATTRIBUTION_COOKIE, token, options(maxAgeMs()))
}
