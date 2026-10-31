import { Coupon } from '../models/Coupon.js'
import { Order } from '../models/Order.js'
import { badRequest } from '../utils/AppError.js'

export const PENDING_WINDOW_MS = 30 * 60 * 1000
// Razorpay needs a positive amount, so a coupon can never take an order below one rupee.
const MIN_CHARGE_PAISE = 100

// Open redemptions = paid orders plus recent pending ones (someone mid-checkout holds a slot).
const redemptionFilter = (extra) => ({
  ...extra,
  $or: [{ status: 'paid' }, { status: 'pending', createdAt: { $gt: new Date(Date.now() - PENDING_WINDOW_MS) } }],
})

// Buying several notes in one order is cheaper per note. Highest matching tier wins; a single note gets no discount.
export const CART_TIERS = [
  { min: 5, percent: 20 },
  { min: 3, percent: 15 },
  { min: 2, percent: 10 },
]
export const MAX_CART_ITEMS = 20
export const cartPercentFor = (count) => CART_TIERS.find((tier) => count >= tier.min)?.percent ?? 0
// The next tier up from `count`, so the cart can say "add one more to save 15%".
export const nextCartTier = (count) => [...CART_TIERS].reverse().find((tier) => tier.min > count) ?? null

export function discountFor(coupon, listPaise) {
  const raw = coupon.type === 'percent' ? Math.floor((listPaise * coupon.value) / 100) : coupon.value
  const capped = coupon.maxDiscountPaise ? Math.min(raw, coupon.maxDiscountPaise) : raw
  return Math.max(0, Math.min(capped, listPaise - MIN_CHARGE_PAISE))
}

// Resolves a coupon code for a user and product, or throws a message that is safe to show.
// For a cart, `productIds` lists every note in it and `pricePaise` is the amount the coupon would reduce.
export async function resolveCoupon({ code, userId, product, productIds = [product?._id], pricePaise = product?.pricePaise, now = new Date() }) {
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() })
  if (!coupon || !coupon.active) throw badRequest('This coupon code is not valid')
  if (coupon.validFrom && coupon.validFrom > now) throw badRequest('This coupon is not active yet')
  if (coupon.validUntil && coupon.validUntil < now) throw badRequest('This coupon has expired')
  if (coupon.products.length && !coupon.products.some((id) => productIds.some((p) => String(p) === String(id)))) {
    throw badRequest('This coupon does not apply to this item')
  }
  if (pricePaise < coupon.minOrderPaise) {
    throw badRequest(`This coupon needs an order of at least ₹${coupon.minOrderPaise / 100}`)
  }
  if (coupon.usageLimit) {
    const used = await Order.countDocuments(redemptionFilter({ couponCode: coupon.code }))
    if (used >= coupon.usageLimit) throw badRequest('This coupon has been fully redeemed')
  }
  // Anonymous quotes (before sign-in) skip this; it is enforced again when the order is created.
  if (userId) {
    const usedByUser = await Order.countDocuments(redemptionFilter({ couponCode: coupon.code, user: userId }))
    if (usedByUser >= coupon.perUserLimit) throw badRequest('You have already used this coupon')
  }
  if (discountFor(coupon, pricePaise) <= 0) throw badRequest('This coupon does not reduce the price of this item')
  return coupon
}

// Prices a cart of notes: the volume discount comes off the list total first, then an optional coupon comes off what is left.
export async function quoteCart({ products, couponCode, userId }) {
  const listPaise = products.reduce((sum, p) => sum + p.pricePaise, 0)
  const volumePercent = cartPercentFor(products.length)
  const volumeDiscountPaise = Math.max(0, Math.min(Math.floor((listPaise * volumePercent) / 100), listPaise - MIN_CHARGE_PAISE))
  const afterVolume = listPaise - volumeDiscountPaise
  const coupon = couponCode ? await resolveCoupon({ code: couponCode, userId, productIds: products.map((p) => p._id), pricePaise: afterVolume }) : null
  const couponDiscountPaise = coupon ? discountFor(coupon, afterVolume) : 0
  return {
    coupon,
    listPaise,
    volumePercent,
    volumeDiscountPaise,
    couponDiscountPaise,
    discountPaise: volumeDiscountPaise + couponDiscountPaise,
    totalPaise: afterVolume - couponDiscountPaise,
  }
}

// The single place a price is decided. Callers never pass amounts in.
export async function quote({ product, couponCode, userId }) {
  const listPaise = product.pricePaise
  const coupon = couponCode ? await resolveCoupon({ code: couponCode, userId, product }) : null
  const discountPaise = coupon ? discountFor(coupon, listPaise) : 0
  return { coupon, listPaise, discountPaise, totalPaise: listPaise - discountPaise }
}

export const quoteToPublic = (q) => ({
  list: q.listPaise / 100,
  discount: q.discountPaise / 100,
  total: q.totalPaise / 100,
  couponCode: q.coupon?.code ?? null,
})
