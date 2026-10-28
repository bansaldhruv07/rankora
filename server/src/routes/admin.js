import express, { Router } from 'express'
import { z } from 'zod'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { AccessLog } from '../models/AccessLog.js'
import { Order, ORDER_STATUSES } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { getProvider } from '../services/payments/index.js'
import { applyRefund } from '../services/settlement.js'
import { putObject } from '../services/storage.js'
import { badRequest, conflict, notFound } from '../utils/AppError.js'
import { asyncHandler, assertObjectId, escapeRegex, ok, pageMeta, pageParams, parse } from '../utils/http.js'

const router = Router()
router.use(requireAuth, requireAdmin)

const text = (max) => z.string().trim().max(max)
const productFields = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/),
  title: text(160).min(2),
  summary: text(1000),
  kind: z.enum(['note', 'plan']),
  subject: text(40),
  chapter: text(120),
  topic: text(120),
  type: z.enum(['notes', 'formula', 'pyq', 'mock', 'plan']),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  length: text(60),
  // Rupees with at most two decimals; stored as integer paise.
  price: z.number().min(0).max(100000).refine((n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'At most 2 decimals'),
  planDays: z.number().int().min(1).max(3660),
  contents: z.array(text(300)).max(50),
  includes: z.array(text(300)).max(50),
  sample: z.object({
    heading: text(200),
    points: z.array(text(500)).max(20),
    formulas: z.array(z.object({ label: text(120), expr: text(200) })).max(20),
  }),
  mockTestId: text(80),
  sortOrder: z.number().int().min(0).max(100000),
})

const createSchema = productFields.partial().required({ slug: true, title: true, price: true })
const updateSchema = productFields.omit({ slug: true }).partial()

function toDoc({ price, ...rest }) {
  return { ...rest, ...(price !== undefined ? { pricePaise: Math.round(price * 100) } : {}) }
}

async function findProduct(id) {
  const product = await Product.findById(assertObjectId(id)).select('+file')
  if (!product) throw notFound('Product not found')
  return product
}

router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = {}
    if (['draft', 'published'].includes(req.query.status)) filter.status = req.query.status
    const [items, total] = await Promise.all([
      Product.find(filter).select('+file').sort({ sortOrder: 1, createdAt: 1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ])
    ok(res, items.map((p) => p.toPublic({ admin: true })), pageMeta(page, limit, total))
  }),
)

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const data = toDoc(parse(createSchema, req.body))
    if (data.kind === 'plan' && !data.planDays) throw badRequest('planDays is required for plans')
    const product = await Product.create({ ...data, status: 'draft' })
    ok(res, product.toPublic({ admin: true }), undefined, 201)
  }),
)

router.patch(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    product.set(toDoc(parse(updateSchema, req.body)))
    await product.save()
    ok(res, product.toPublic({ admin: true }))
  }),
)

router.post(
  '/products/:id/publish',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    const needsFile = product.kind === 'note' && product.type !== 'mock'
    if (needsFile && !product.file?.key) throw conflict('Upload the PDF before publishing')
    if (product.kind === 'plan' && !product.planDays) throw conflict('Set planDays before publishing')
    product.status = 'published'
    await product.save()
    ok(res, product.toPublic({ admin: true }))
  }),
)

router.post(
  '/products/:id/unpublish',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    product.status = 'draft'
    await product.save()
    ok(res, product.toPublic({ admin: true }))
  }),
)

// Raw PDF body (Content-Type: application/pdf). Stored under a server-generated key.
router.put(
  '/products/:id/file',
  express.raw({ type: 'application/pdf', limit: '25mb' }),
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    const body = req.body
    if (!Buffer.isBuffer(body) || body.length < 8 || body.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw badRequest('Body must be a PDF (Content-Type: application/pdf)')
    }
    const key = `notes/${product._id}-${Date.now()}.pdf`
    await putObject(key, body)
    product.file = { key, originalName: `${product.slug}.pdf`, size: body.length, uploadedAt: new Date() }
    await product.save()
    ok(res, product.toPublic({ admin: true }))
  }),
)

const orderQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  email: z.string().trim().toLowerCase().max(254).optional(),
})

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const q = parse(orderQuery, req.query)
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = {}
    if (q.status) filter.status = q.status
    if (q.email) filter.user = { $in: await User.find({ email: new RegExp(`^${escapeRegex(q.email)}`) }).distinct('_id') }
    const [items, total] = await Promise.all([
      Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ])
    ok(
      res,
      items.map((o) => ({ ...o.toPublic(), user: { id: String(o.user._id), name: o.user.name, email: o.user.email } })),
      pageMeta(page, limit, total),
    )
  }),
)

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await Order.findById(assertObjectId(req.params.id)).populate('user', 'name email')
    if (!order) throw notFound('Order not found')
    const payments = await Payment.find({ order: order._id })
    ok(res, {
      ...order.toPublic(),
      user: { id: String(order.user._id), name: order.user.name, email: order.user.email },
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
  '/orders/:id/refund',
  asyncHandler(async (req, res) => {
    const { reason } = parse(z.object({ reason: text(300).default('admin refund') }), req.body ?? {})
    const order = await Order.findById(assertObjectId(req.params.id))
    if (!order) throw notFound('Order not found')
    if (order.status !== 'paid') throw conflict(`Only paid orders can be refunded (status: ${order.status})`)
    const payment = await Payment.findOne({ order: order._id, status: { $in: ['captured', 'partially_refunded'] } })
    if (!payment) throw conflict('No captured payment found for this order')

    const remaining = payment.amountPaise - payment.refundedPaise
    const refund = await getProvider().refund({ paymentId: payment.providerPaymentId, amountPaise: remaining, receipt: String(order._id) })
    await applyRefund({ payment, refundId: refund.id, amountPaise: remaining, reason })
    ok(res, (await Order.findById(order._id)).toPublic())
  }),
)

router.get(
  '/access-logs',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = {}
    if (['download', 'denied', 'rate_limited', 'suspicious'].includes(req.query.action)) filter.action = req.query.action
    const [items, total] = await Promise.all([
      AccessLog.find(filter).populate('user', 'email').populate('product', 'slug').sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessLog.countDocuments(filter),
    ])
    ok(
      res,
      items.map((l) => ({ id: String(l._id), action: l.action, user: l.user?.email, product: l.product?.slug, ip: l.ip, note: l.note, createdAt: l.createdAt })),
      pageMeta(page, limit, total),
    )
  }),
)

export default router
