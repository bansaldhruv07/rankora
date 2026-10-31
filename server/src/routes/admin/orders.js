import { Router } from 'express'
import { z } from 'zod'
import { requirePermission } from '../../middleware/auth.js'
import { Order, ORDER_STATUSES } from '../../models/Order.js'
import { Payment } from '../../models/Payment.js'
import { User } from '../../models/User.js'
import { audit } from '../../services/audit.js'
import { getProvider } from '../../services/payments/index.js'
import { applyRefund } from '../../services/settlement.js'
import { conflict, notFound } from '../../utils/AppError.js'
import { asyncHandler, assertObjectId, escapeRegex, ok, pageMeta, pageParams, parse } from '../../utils/http.js'

const router = Router()

const orderQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  email: z.string().trim().toLowerCase().max(254).optional(),
  product: z.string().trim().max(80).optional(),
})

const withUser = (o) => ({ ...o.toPublic(), user: { id: String(o.user._id), name: o.user.name, email: o.user.email } })

router.get(
  '/',
  requirePermission('orders'),
  asyncHandler(async (req, res) => {
    const q = parse(orderQuery, req.query)
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = {}
    if (q.status) filter.status = q.status
    if (q.product) filter.productSlug = q.product
    if (q.email) filter.user = { $in: await User.find({ email: new RegExp(`^${escapeRegex(q.email)}`) }).distinct('_id') }
    const [items, total] = await Promise.all([
      Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ])
    ok(res, items.map(withUser), pageMeta(page, limit, total))
  }),
)

router.get(
  '/:id',
  requirePermission('orders'),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(assertObjectId(req.params.id)).populate('user', 'name email')
    if (!order) throw notFound('Order not found')
    const payments = await Payment.find({ order: order._id })
    ok(res, {
      ...withUser(order),
      payments: payments.map((p) => ({
        id: String(p._id),
        providerPaymentId: p.providerPaymentId,
        amount: p.amountPaise / 100,
        refunded: p.refundedPaise / 100,
        status: p.status,
        source: p.source,
      })),
    })
  }),
)

// Full refund: refunds at the gateway, marks the order refunded and revokes the entitlement.
router.post(
  '/:id/refund',
  requirePermission('refund'),
  asyncHandler(async (req, res) => {
    const { reason } = parse(z.object({ reason: z.string().trim().max(300).default('admin refund') }), req.body ?? {})
    const order = await Order.findById(assertObjectId(req.params.id))
    if (!order) throw notFound('Order not found')
    if (order.status !== 'paid') throw conflict(`Only paid orders can be refunded (status: ${order.status})`)
    const payment = await Payment.findOne({ order: order._id, status: { $in: ['captured', 'partially_refunded'] } })
    if (!payment) throw conflict('No captured payment found for this order')

    const remaining = payment.amountPaise - payment.refundedPaise
    const refund = await getProvider().refund({ paymentId: payment.providerPaymentId, amountPaise: remaining, receipt: String(order._id) })
    await applyRefund({ payment, refundId: refund.id, amountPaise: remaining, reason })
    await audit(req, 'order.refund', { type: 'order', id: order._id, summary: `Refunded ${order.productTitle} (₹${remaining / 100})`, meta: { reason } })
    ok(res, (await Order.findById(order._id)).toPublic())
  }),
)

export default router
