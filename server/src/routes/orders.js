import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { paymentLimiter } from '../middleware/security.js'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { hasAccess } from '../services/entitlements.js'
import { getProvider } from '../services/payments/index.js'
import { PENDING_WINDOW_MS, quote } from '../services/pricing.js'
import { badRequest, conflict, notFound } from '../utils/AppError.js'
import { asyncHandler, assertObjectId, ok, pageMeta, pageParams, parse } from '../utils/http.js'

const router = Router()
router.use(requireAuth)

const createSchema = z.object({
  product: z.string().trim().regex(/^[a-z0-9-]{1,80}$/),
  coupon: z.string().trim().max(30).optional(),
})

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

// Refuses to sell what the student already has.
async function assertNotOwned(userId, product) {
  if (product.kind === 'note' && (await hasAccess(userId, product))) throw conflict('You already have access to this product')
  if (product.kind === 'bundle') {
    if (!product.bundleItems.length) throw conflict('This bundle is not available yet')
    const items = await Product.find({ _id: { $in: product.bundleItems }, kind: 'note' })
    const owned = await Promise.all(items.map((item) => hasAccess(userId, item)))
    if (owned.every(Boolean)) throw conflict('You already have access to everything in this bundle')
  }
}

// The price always comes from the database (and a validated coupon), never from the request.
router.post(
  '/',
  paymentLimiter,
  asyncHandler(async (req, res) => {
    const { product: slug, coupon: couponInput } = parse(createSchema, req.body)
    getProvider() // throws 503 when payments are not enabled, before anything is created
    const product = await Product.findOne({ slug, status: 'published' })
    if (!product) throw notFound('Product not found')
    if (product.pricePaise <= 0) throw badRequest('This product is free and cannot be purchased')
    await assertNotOwned(req.user._id, product)

    const couponCode = couponInput ? couponInput.toUpperCase() : undefined
    const open = { user: req.user._id, product: product._id, status: 'pending', createdAt: { $gt: new Date(Date.now() - PENDING_WINDOW_MS) } }

    // Repeated clicks / retries reuse the identical open order instead of creating duplicates.
    const existing = await Order.findOne({ ...open, listAmountPaise: product.pricePaise, couponCode: couponCode ?? null })
    if (existing) return ok(res, { order: existing.toPublic(), checkout: checkoutPayload(existing, req.user) })

    const priced = await quote({ product, couponCode, userId: req.user._id })
    // Any other open order for this item (different coupon or an old price) is superseded.
    await Order.updateMany(open, { $set: { status: 'cancelled' } })

    const order = await Order.create({
      user: req.user._id,
      product: product._id,
      productTitle: product.title,
      productSlug: product.slug,
      productKind: product.kind,
      planDays: product.planDays,
      listAmountPaise: priced.listPaise,
      discountPaise: priced.discountPaise,
      couponCode: priced.coupon?.code,
      amountPaise: priced.totalPaise,
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
