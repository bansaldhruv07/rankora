import { Router } from 'express'
import { z } from 'zod'
import { requirePermission } from '../../middleware/auth.js'
import { AccessLog } from '../../models/AccessLog.js'
import { Order } from '../../models/Order.js'
import { User } from '../../models/User.js'
import { ViewerSession } from '../../models/ViewerSession.js'
import { audit } from '../../services/audit.js'
import { revokeUserSessions } from '../../services/viewerSessions.js'
import { conflict, notFound } from '../../utils/AppError.js'
import { asyncHandler, assertObjectId, escapeRegex, ok, pageMeta, pageParams, parse } from '../../utils/http.js'

const router = Router()
router.use(requirePermission('users'))

const view = (u) => ({ ...u.toPublic(), suspended: Boolean(u.suspendedAt), lastLoginAt: u.lastLoginAt })

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = parse(z.object({ q: z.string().trim().max(80).optional() }), req.query)
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = {}
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i')
      filter.$or = [{ email: rx }, { name: rx }]
    }
    const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)])
    const spend = await Order.aggregate([
      { $match: { user: { $in: items.map((u) => u._id) }, status: 'paid' } },
      { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$amountPaise' } } },
    ])
    const spendBy = new Map(spend.map((s) => [String(s._id), s]))
    ok(
      res,
      items.map((u) => ({ ...view(u), orders: spendBy.get(String(u._id))?.orders ?? 0, spent: (spendBy.get(String(u._id))?.spent ?? 0) / 100 })),
      pageMeta(page, limit, total),
    )
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(assertObjectId(req.params.id))
    if (!user) throw notFound('User not found')
    const [orders, sessions, logs] = await Promise.all([
      Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20),
      ViewerSession.find({ user: user._id, status: 'active', expiresAt: { $gt: new Date() } }).populate('product', 'title').sort({ lastSeenAt: -1 }),
      AccessLog.find({ user: user._id }).populate('product', 'slug').sort({ createdAt: -1 }).limit(25),
    ])
    ok(res, {
      user: view(user),
      orders: orders.map((o) => o.toPublic()),
      activeSessions: sessions.map((s) => ({ id: String(s._id), product: s.product?.title, ip: s.ip, lastSeenAt: s.lastSeenAt })),
      recentAccess: logs.map((l) => ({ action: l.action, product: l.product?.slug, ip: l.ip, note: l.note, createdAt: l.createdAt })),
    })
  }),
)

async function target(req) {
  const user = await User.findById(assertObjectId(req.params.id))
  if (!user) throw notFound('User not found')
  // Staff accounts are managed outside the web UI, so a compromised or mistaken click cannot lock out the owner.
  if (user.role !== 'student') throw conflict('Staff accounts cannot be changed here')
  return user
}

// Signs the student out everywhere and closes every open reader.
router.post(
  '/:id/revoke-sessions',
  asyncHandler(async (req, res) => {
    const user = await target(req)
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } })
    await revokeUserSessions(user._id, 'revoked by admin')
    await audit(req, 'user.revoke-sessions', { type: 'user', id: user._id, summary: `Revoked all sessions of ${user.email}` })
    ok(res, { revoked: true })
  }),
)

router.post(
  '/:id/suspend',
  asyncHandler(async (req, res) => {
    const user = await target(req)
    await User.updateOne({ _id: user._id }, { $set: { suspendedAt: new Date() }, $inc: { tokenVersion: 1 } })
    await revokeUserSessions(user._id, 'account suspended')
    await audit(req, 'user.suspend', { type: 'user', id: user._id, summary: `Suspended ${user.email}` })
    ok(res, { suspended: true })
  }),
)

router.post(
  '/:id/unsuspend',
  asyncHandler(async (req, res) => {
    const user = await target(req)
    await User.updateOne({ _id: user._id }, { $unset: { suspendedAt: 1 } })
    await audit(req, 'user.unsuspend', { type: 'user', id: user._id, summary: `Reinstated ${user.email}` })
    ok(res, { suspended: false })
  }),
)

export default router
