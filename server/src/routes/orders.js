import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { paymentLimiter } from '../middleware/security.js'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { getProvider } from '../services/payments/index.js'
import { hasAccess } from '../services/entitlements.js'
import { badRequest, conflict, notFound } from '../utils/AppError.js'
import { asyncHandler, assertObjectId, ok, pageMeta, pageParams, parse } from '../utils/http.js'

const router = Router()
router.use(requireAuth)

const PENDING_REUSE_MS = 30 * 60 * 1000
const createSchema = z.object({ product: z.string().trim().regex(/^[a-z0-9-]{1,80}$/) })

const checkoutPayload = (order, user) => {
  const provider = getProvider()
  return {
    provider: provider.name,
    key: provider.publicKey,
    providerOrderId: order.providerOrderId,
    amountPaise: order.amountPaise,
    currency: order.currency,
    prefill: { name: user.name, email: user.email },
  }
}

// The price always comes from the database, never from the request.
router.post(
  '/',
  paymentLimiter,
  asyncHandler(async (req, res) => {
    const { product: slug } = parse(createSchema, req.body)
    const product = await Product.findOne({ slug, status: 'published' })
    if (!product) throw notFound('Product not found')
    if (product.pricePaise <= 0) throw badRequest('This product is free and cannot be purchased')
    if (product.kind === 'note' && (await hasAccess(req.user._id, product))) {
      throw conflict('You already have access to this product')
    }

    // Repeated clicks / retries reuse the open order instead of creating duplicates.
    const existing = await Order.findOne({
      user: req.user._id,
      product: product._id,
      status: 'pending',
      amountPaise: product.pricePaise,
      createdAt: { $gt: new Date(Date.now() - PENDING_REUSE_MS) },
    })
    if (existing) return ok(res, { order: existing.toPublic(), checkout: checkoutPayload(existing, req.user) })

    const order = await Order.create({
      user: req.user._id,
      product: product._id,
      productTitle: product.title,
      productKind: product.kind,
      planDays: product.planDays,
      amountPaise: product.pricePaise,
      currency: product.currency,
      provider: getProvider().name,
    })
    const remote = await getProvider().createOrder({
      amountPaise: order.amountPaise,
      currency: order.currency,
      receipt: String(order._id),
    })
    order.providerOrderId = remote.id
    await order.save()
    ok(res, { order: order.toPublic(), checkout: checkoutPayload(order, req.user) }, undefined, 201)
  }),
)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageParams(req.query)
    const filter = { user: req.user._id }
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ])
    ok(res, items.map((o) => o.toPublic()), pageMeta(page, limit, total))
  }),
)

// Always scoped by owner: another user's order id is indistinguishable from a missing one.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: assertObjectId(req.params.id), user: req.user._id })
    if (!order) throw notFound('Order not found')
    ok(res, order.toPublic())
  }),
)

router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const order = await Order.findOneAndUpdate(
      { _id: assertObjectId(req.params.id), user: req.user._id, status: 'pending' },
      { $set: { status: 'cancelled' } },
      { returnDocument: 'after' },
    )
    if (!order) throw notFound('No pending order found')
    ok(res, order.toPublic())
  }),
)

export default router
