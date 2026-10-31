import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { PERMISSIONS, clearAdminSession, issueAdminSession, requireStaff } from '../../middleware/auth.js'
import { adminAuthLimiter } from '../../middleware/security.js'
import { User } from '../../models/User.js'
import { audit } from '../../services/audit.js'
import { revokeUserSessions } from '../../services/viewerSessions.js'
import { unauthorized } from '../../utils/AppError.js'
import { asyncHandler, ok, parse } from '../../utils/http.js'

const router = Router()

// Compared against when the account is unknown or not staff, so timing and the message are identical.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.bcryptRounds)

const staffView = (user) => ({ ...user.toPublic(), permissions: PERMISSIONS[user.role] ?? [] })

// Staff sign in here, separately from the student site. A student account (even with the right
// password) never receives an admin session, and the role is read from the database, not the request.
router.post(
  '/login',
  adminAuthLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parse(z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(128) }), req.body)
    const user = await User.findOne({ email }).select('+passwordHash +tokenVersion')
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !valid || !PERMISSIONS[user.role] || user.suspendedAt) throw unauthorized('Invalid email or password')
    user.lastLoginAt = new Date()
    await user.save()
    issueAdminSession(res, user)
    req.user = user
    await audit(req, 'admin.login', { type: 'user', id: user._id, summary: `${user.email} signed in to the admin area` })
    ok(res, { user: staffView(user) })
  }),
)

router.get(
  '/me',
  requireStaff,
  asyncHandler(async (req, res) => ok(res, { user: staffView(req.user) })),
)

// Ends this and every other session of the account, so use a dedicated admin account.
router.post(
  '/logout',
  requireStaff,
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } })
    await revokeUserSessions(req.user._id, 'admin sign-out')
    clearAdminSession(res)
    await audit(req, 'admin.logout', { type: 'user', id: req.user._id })
    ok(res, { loggedOut: true })
  }),
)

export default router
