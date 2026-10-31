import { Router } from 'express'
import { z } from 'zod'
import { requirePermission } from '../../middleware/auth.js'
import { AccessLog, ACCESS_ACTIONS } from '../../models/AccessLog.js'
import { AuditLog } from '../../models/AuditLog.js'
import { Order } from '../../models/Order.js'
import { Payment } from '../../models/Payment.js'
import { Product } from '../../models/Product.js'
import { User } from '../../models/User.js'
import { ViewerSession } from '../../models/ViewerSession.js'
import { asyncHandler, assertObjectId, ok, pageMeta, pageParams, parse } from '../../utils/http.js'

const router = Router()
const DAY = 86400000

const money = (paise) => (paise ?? 0) / 100

// Everything on the dashboard is computed from orders, payments and product counters; nothing is estimated.
router.get(
  '/stats',
  requirePermission('orders'),
  asyncHandler(async (req, res) => {
    const { days } = parse(z.object({ days: z.coerce.number().int().min(7).max(180).default(30) }), req.query)
    const since = new Date(Date.now() - days * DAY)
    const recentPendingSince = new Date(Date.now() - 7 * DAY)

    const [
      students,
      paidAgg,
      paymentAgg,
      refundedOrders,
      ordersCreated,
      bestSelling,
      mostViewed,
      viewTotals,
      revenueByDay,
      recentTransactions,
      recentRegistrations,
      unfinished,
      readerOpens,
      productCounts,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Order.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: '$user', n: { $sum: 1 } } }, { $group: { _id: null, customers: { $sum: 1 }, purchases: { $sum: '$n' } } }]),
      Payment.aggregate([{ $group: { _id: null, gross: { $sum: '$amountPaise' }, refunded: { $sum: '$refundedPaise' } } }]),
      Order.countDocuments({ status: 'refunded' }),
      Order.countDocuments({ status: { $in: ['paid', 'failed', 'refunded', 'pending'] } }),
      Order.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$product', title: { $first: '$productTitle' }, slug: { $first: '$productSlug' }, sales: { $sum: 1 }, revenue: { $sum: '$amountPaise' } } },
        { $sort: { sales: -1, revenue: -1 } },
        { $limit: 5 },
      ]),
      Product.find({ kind: 'note', viewCount: { $gt: 0 } }).sort({ viewCount: -1 }).limit(5).select('title slug viewCount'),
      Product.aggregate([{ $match: { kind: { $in: ['note', 'bundle'] } } }, { $group: { _id: null, views: { $sum: '$viewCount' } } }]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, revenue: { $sum: { $subtract: ['$amountPaise', '$refundedPaise'] } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.find({ status: { $in: ['paid', 'refunded'] } }).populate('user', 'name email').sort({ updatedAt: -1 }).limit(8),
      User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(8).select('name email createdAt'),
      Order.find({ status: { $in: ['pending', 'failed'] }, createdAt: { $gte: recentPendingSince } }).populate('user', 'name email').sort({ createdAt: -1 }).limit(8),
      AccessLog.countDocuments({ action: 'open', createdAt: { $gte: since } }),
      Product.aggregate([{ $group: { _id: { status: '$status', kind: '$kind' }, n: { $sum: 1 } } }]),
    ])

    const { customers = 0, purchases = 0 } = paidAgg[0] ?? {}
    const { gross = 0, refunded = 0 } = paymentAgg[0] ?? {}
    const views = viewTotals[0]?.views ?? 0
    const paidOrFunnel = purchases + refundedOrders

    // Fill days with no sales so the chart's x-axis is continuous.
    const byDay = new Map(revenueByDay.map((d) => [d._id, d]))
    const series = []
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = new Date(Date.now() - i * DAY + 5.5 * 3600000).toISOString().slice(0, 10)
      series.push({ date: key, revenue: money(byDay.get(key)?.revenue ?? 0), orders: byDay.get(key)?.count ?? 0 })
    }

    const orderView = (o) => ({ ...o.toPublic(), user: { id: String(o.user?._id), name: o.user?.name, email: o.user?.email } })
    ok(res, {
      totals: {
        students,
        payingCustomers: customers,
        purchases,
        revenue: money(gross - refunded),
        grossRevenue: money(gross),
        refunded: money(refunded),
        refundedOrders,
        readerOpens,
      },
      conversion: {
        // Purchases per unique product-page visit (visits are de-duplicated per visitor and note for 30 minutes).
        viewToPurchase: views ? Math.round((paidOrFunnel / views) * 1000) / 10 : null,
        // Of the checkouts that were started, how many ended in a payment.
        checkoutCompletion: ordersCreated ? Math.round((paidOrFunnel / ordersCreated) * 1000) / 10 : null,
        views,
      },
      revenueByDay: series,
      bestSelling: bestSelling.map((b) => ({ id: String(b._id), title: b.title, slug: b.slug, sales: b.sales, revenue: money(b.revenue) })),
      mostViewed: mostViewed.map((p) => ({ id: String(p._id), title: p.title, slug: p.slug, views: p.viewCount })),
      recentTransactions: recentTransactions.map(orderView),
      recentRegistrations: recentRegistrations.map((u) => ({ id: String(u._id), name: u.name, email: u.email, createdAt: u.createdAt })),
      unfinishedPayments: unfinished.map(orderView),
      catalog: productCounts.map((c) => ({ status: c._id.status, kind: c._id.kind, count: c.n })),
      days,
    })
  }),
)

router.get(
  '/access-logs',
  requirePermission('orders'),
  asyncHandler(async (req, res) => {
    const q = parse(z.object({ action: z.enum(ACCESS_ACTIONS).optional(), user: z.string().optional(), product: z.string().optional() }), req.query)
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = {}
    if (q.action) filter.action = q.action
    if (q.user) filter.user = assertObjectId(q.user)
    if (q.product) filter.product = assertObjectId(q.product)
    const [items, total] = await Promise.all([
      AccessLog.find(filter).populate('user', 'email').populate('product', 'slug title').sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessLog.countDocuments(filter),
    ])
    ok(
      res,
      items.map((l) => ({ id: String(l._id), action: l.action, user: l.user?.email, userId: l.user ? String(l.user._id) : null, product: l.product?.slug, ip: l.ip, note: l.note, createdAt: l.createdAt })),
      pageMeta(page, limit, total),
    )
  }),
)

router.get(
  '/audit-logs',
  requirePermission('audit'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const [items, total] = await Promise.all([AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit), AuditLog.countDocuments()])
    ok(
      res,
      items.map((l) => ({ id: String(l._id), actor: l.actorEmail, action: l.action, entityType: l.entityType, entityId: l.entityId, summary: l.summary, ip: l.ip, createdAt: l.createdAt })),
      pageMeta(page, limit, total),
    )
  }),
)

router.get(
  '/viewer-sessions',
  requirePermission('users'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = { status: 'active', expiresAt: { $gt: new Date() } }
    const [items, total] = await Promise.all([
      ViewerSession.find(filter).populate('user', 'email').populate('product', 'slug title').sort({ lastSeenAt: -1 }).skip(skip).limit(limit),
      ViewerSession.countDocuments(filter),
    ])
    ok(
      res,
      items.map((s) => ({ id: String(s._id), mode: s.mode, user: s.user?.email, product: s.product?.title, ip: s.ip, startedAt: s.createdAt, lastSeenAt: s.lastSeenAt, megabytesServed: Math.round(s.bytesServed / 1048576) })),
      pageMeta(page, limit, total),
    )
  }),
)

router.post(
  '/viewer-sessions/:id/revoke',
  requirePermission('users'),
  asyncHandler(async (req, res) => {
    const result = await ViewerSession.updateOne({ _id: assertObjectId(req.params.id), status: 'active' }, { $set: { status: 'revoked', revokedReason: 'revoked by admin' } })
    ok(res, { revoked: result.modifiedCount === 1 })
  }),
)

export default router
