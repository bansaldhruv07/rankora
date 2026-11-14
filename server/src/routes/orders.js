import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { paymentLimiter } from '../middleware/security.js'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { loadCart } from '../services/cart.js'
import { hasAccess } from '../services/entitlements.js'
import { readAttribution } from '../services/growth/attribution.js'
import { creditBalance, reservedCredit } from '../services/growth/credit.js'
import { normalizeCode } from '../services/growth/codes.js'
import { attachReferral } from '../services/growth/referrals.js'
import { getProvider } from '../services/payments/index.js'
import { PENDING_WINDOW_MS, growthOrderFields, quote, quoteCart } from '../services/pricing.js'
import { cartItemsSchema } from './cart.js'
import { badRequest, conflict, notFound } from '../utils/AppError.js'
import { asyncHandler, assertObjectId, ok, pageMeta, pageParams, parse } from '../utils/http.js'

const router = Router()
router.use(requireAuth)

// One product by slug, or several notes bought together as a cart.
const createSchema = z
  .object({
    product: z.string().trim().regex(/^[a-z0-9-]{1,80}$/).optional(),
    items: cartItemsSchema.optional(),
    coupon: z.string().trim().max(30).optional(),
    useCredit: z.boolean().optional(),
  })
  .refine((body) => Boolean(body.product) !== Boolean(body.items), { message: 'Send either product or items' })

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

// The friend discount is attached to the account the first time an order uses it, and only one unpaid order
// at a time may carry it, so two open orders can never both take the discount.
async function referralFor(user, priced) {
  if (priced.source !== 'referral') return undefined
  const referral = priced.referral ?? (await attachReferral(user, priced.referrer))
  await Order.updateMany({ user: user._id, status: 'pending', discountSource: 'referral' }, { $set: { status: 'cancelled' } })
  return referral?._id
}

// Store credit held by unpaid orders may never exceed the balance, even if two checkouts race.
async function assertCreditHeld(order) {
  if (!order.creditPaise) return
  const [balance, held] = await Promise.all([creditBalance(order.user), reservedCredit(order.user)])
  if (held > balance) {
    await Order.updateOne({ _id: order._id }, { $set: { status: 'cancelled' } })
    throw conflict('Your store credit changed. Please try again.')
  }
}

// What the student asked for, so a repeated click can reuse the open order before anything is priced again.
const offerKey = (input, attribution) =>
  [normalizeCode(input.coupon), input.useCredit ? 'credit' : '', attribution.teacherCode ?? '', attribution.refCode ?? ''].join('|')

// Several notes in one order. Priced here from the database, exactly as the cart quote shows.
async function createCartOrder(req, res, products, input) {
  const attribution = readAttribution(req)
  const key = offerKey(input, attribution)
  const listPaise = products.reduce((sum, p) => sum + p.pricePaise, 0)
  const ids = products.map((p) => p._id)
  const window = { $gt: new Date(Date.now() - PENDING_WINDOW_MS) }

  // Repeated clicks / retries reuse the identical open order instead of creating duplicates.
  const existing = await Order.findOne({
    user: req.user._id,
    productKind: 'cart',
    status: 'pending',
    createdAt: window,
    listAmountPaise: listPaise,
    offerKey: key,
    items: { $size: ids.length },
    'items.product': { $all: ids },
  })
  if (existing) return ok(res, { order: existing.toPublic(), checkout: checkoutPayload(existing, req.user) })

  const priced = await quoteCart({ products, code: input.coupon, user: req.user, attribution, useCredit: input.useCredit })

  await Order.updateMany({ user: req.user._id, productKind: 'cart', status: 'pending', createdAt: window }, { $set: { status: 'cancelled' } })
  const referralId = await referralFor(req.user, priced)
  const order = await Order.create({
    user: req.user._id,
    product: products[0]._id,
    productTitle: `${products[0].title} + ${products.length - 1} more`,
    productKind: 'cart',
    items: products.map((p) => ({ product: p._id, title: p.title, slug: p.slug, listPaise: p.pricePaise })),
    listAmountPaise: priced.listPaise,
    discountPaise: priced.discountPaise,
    ...growthOrderFields(priced),
    offerKey: key,
    referralId,
    amountPaise: priced.totalPaise,
    currency: products[0].currency,
    provider: getProvider().name,
  })
  await assertCreditHeld(order)
  const remote = await getProvider().createOrder({ amountPaise: order.amountPaise, currency: order.currency, receipt: String(order._id) })
  order.providerOrderId = remote.id
  await order.save()
  return ok(res, { order: order.toPublic(), checkout: checkoutPayload(order, req.user) }, undefined, 201)
}

// The price always comes from the database (and a validated coupon), never from the request.
router.post(
  '/',
  paymentLimiter,
  asyncHandler(async (req, res) => {
    const input = parse(createSchema, req.body)
    const { product: slugInput, items } = input
    getProvider() // throws 503 when payments are not enabled, before anything is created

    let slug = slugInput
    if (items) {
      // Notes the student already has are left out. A cart that ends up with one note is an ordinary single-note order.
      const cart = await loadCart(items, req.user._id)
      if (cart.products.length === 0) {
        throw cart.owned.length ? conflict('You already have access to everything in this cart') : notFound('These items are not available')
      }
      if (cart.products.length > 1) return createCartOrder(req, res, cart.products, input)
      slug = cart.products[0].slug
    }

    const product = await Product.findOne({ slug, status: 'published' })
    if (!product) throw notFound('Product not found')
    if (product.pricePaise <= 0) throw badRequest('This product is free and cannot be purchased')
    await assertNotOwned(req.user._id, product)

    const attribution = readAttribution(req)
    const key = offerKey(input, attribution)
    const open = { user: req.user._id, product: product._id, productKind: product.kind, status: 'pending', createdAt: { $gt: new Date(Date.now() - PENDING_WINDOW_MS) } }

    // Repeated clicks / retries reuse the identical open order instead of creating duplicates.
    const existing = await Order.findOne({ ...open, listAmountPaise: product.pricePaise, offerKey: key })
    if (existing) return ok(res, { order: existing.toPublic(), checkout: checkoutPayload(existing, req.user) })

    const priced = await quote({ product, code: input.coupon, user: req.user, attribution, useCredit: input.useCredit })
    // Any other open order for this item (different code or an old price) is superseded.
    await Order.updateMany(open, { $set: { status: 'cancelled' } })
    const referralId = await referralFor(req.user, priced)

    const order = await Order.create({
      user: req.user._id,
      product: product._id,
      productTitle: product.title,
      productSlug: product.slug,
      productKind: product.kind,
      planDays: product.planDays,
      listAmountPaise: priced.listPaise,
      discountPaise: priced.discountPaise,
      ...growthOrderFields(priced),
      offerKey: key,
      referralId,
      amountPaise: priced.totalPaise,
      currency: product.currency,
      provider: getProvider().name,
    })
    await assertCreditHeld(order)
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
