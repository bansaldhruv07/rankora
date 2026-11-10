import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { clearSession, issueSession, requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/security.js'
import { PasswordReset } from '../models/PasswordReset.js'
import { User } from '../models/User.js'
import { accessSummary } from '../services/entitlements.js'
import { readAttribution } from '../services/growth/attribution.js'
import { attachFromSavedCode } from '../services/growth/referrals.js'
import { sendMail } from '../services/mailer.js'
import { revokeUserSessions } from '../services/viewerSessions.js'
import { AppError, conflict, forbidden, unauthorized } from '../utils/AppError.js'
import { randomToken, sha256Hex } from '../utils/crypto.js'
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
    // A friend link followed before sign-up is attached now. It never blocks registration if anything goes wrong.
    await attachFromSavedCode(user, readAttribution(req).refCode).catch(() => {})
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
    if (user.suspendedAt) throw forbidden('This account has been suspended. Please contact support.')
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

const RESET_MINUTES = 30

// Always answers the same way, so it cannot be used to discover which emails have accounts.
router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email: address } = parse(z.object({ email }), req.body)
    const user = await User.findOne({ email: address })
    if (user && !user.suspendedAt) {
      await PasswordReset.deleteMany({ user: user._id, usedAt: null })
      const token = randomToken(32)
      await PasswordReset.create({ user: user._id, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60000) })
      const link = `${env.frontendOrigin}/reset-password?token=${token}`
      await sendMail({
        to: user.email,
        subject: 'Reset your JEEdge password',
        text: `Hi ${user.name},

Use this link to choose a new password. It works once and expires in ${RESET_MINUTES} minutes:

${link}

If you did not ask for this, you can ignore this email; your password has not changed.
`,
      }).catch(() => {})
    }
    ok(res, { sent: true })
  }),
)

router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password: newPassword } = parse(z.object({ token: z.string().min(20).max(100), password }), req.body)
    // One atomic claim: a token can be used exactly once even under concurrent requests.
    const claim = await PasswordReset.findOneAndUpdate(
      { tokenHash: sha256Hex(token), usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
    )
    if (!claim) throw new AppError(400, 'BAD_REQUEST', 'This reset link is invalid or has expired. Request a new one.')
    const user = await User.findById(claim.user).select('+tokenVersion')
    if (!user) throw new AppError(400, 'BAD_REQUEST', 'This reset link is invalid or has expired. Request a new one.')
    user.passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds)
    user.tokenVersion += 1
    await user.save()
    await revokeUserSessions(user._id, 'password reset')
    ok(res, { reset: true })
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
    const { name, phone } = parse(z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().max(20).optional() }), req.body)
    req.user.name = name
    if (phone !== undefined) {
      const digits = phone.replace(/\D/g, '')
      if (digits && (digits.length < 7 || digits.length > 15)) throw new AppError(400, 'BAD_REQUEST', 'Enter a valid phone number')
      req.user.phone = digits || undefined
    }
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
