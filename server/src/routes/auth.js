import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { clearSession, issueSession, requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/security.js'
import { User } from '../models/User.js'
import { accessSummary } from '../services/entitlements.js'
import { AppError, conflict, unauthorized } from '../utils/AppError.js'
import { asyncHandler, ok, parse } from '../utils/http.js'

const router = Router()

const email = z.string().trim().toLowerCase().email().max(254)
const password = z.string().min(8, 'Password must be at least 8 characters').max(128)

const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email, password })
const loginSchema = z.object({ email, password: z.string().min(1).max(128) })
const passwordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password })

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.bcryptRounds)

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, password } = parse(registerSchema, req.body)
    if (await User.exists({ email })) throw conflict('An account with this email already exists')
    // role is never read from the request: self-registration always creates a student.
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, env.bcryptRounds) })
    const withVersion = await User.findById(user._id).select('+tokenVersion')
    issueSession(res, withVersion)
    ok(res, { user: user.toPublic() }, undefined, 201)
  }),
)

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body)
    const user = await User.findOne({ email }).select('+passwordHash +tokenVersion')
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !valid) throw unauthorized('Invalid email or password')
    user.lastLoginAt = new Date()
    await user.save()
    issueSession(res, user)
    ok(res, { user: user.toPublic(), access: await accessSummary(user._id) })
  }),
)

// Logout revokes the session everywhere by bumping tokenVersion, then clears the cookie.
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    if (req.cookies?.rk_token) {
      const { default: jwt } = await import('jsonwebtoken')
      const payload = jwt.decode(req.cookies.rk_token)
      if (payload?.sub) await User.updateOne({ _id: payload.sub, tokenVersion: payload.tv }, { $inc: { tokenVersion: 1 } }).catch(() => {})
    }
    clearSession(res)
    ok(res, { loggedOut: true })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { user: req.user.toPublic(), access: await accessSummary(req.user._id) })
  }),
)

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name } = parse(z.object({ name: z.string().trim().min(2).max(80) }), req.body)
    req.user.name = name
    await req.user.save()
    ok(res, { user: req.user.toPublic() })
  }),
)

router.post(
  '/change-password',
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = parse(passwordSchema, req.body)
    const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion')
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(400, 'BAD_REQUEST', 'Current password is incorrect')
    user.passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds)
    user.tokenVersion += 1
    await user.save()
    issueSession(res, user)
    ok(res, { changed: true })
  }),
)

export default router
