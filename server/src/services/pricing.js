import { growth, PENDING_ORDER_WINDOW_MS } from '../config/growth.js'
import { Coupon } from '../models/Coupon.js'
import { Order } from '../models/Order.js'
import { AppError, badRequest } from '../utils/AppError.js'
import { availableCredit } from './growth/credit.js'
import { classifyCode } from './growth/discounts.js'

export const PENDING_WINDOW_MS = PENDING_ORDER_WINDOW_MS
// Razorpay needs a positive amount, so a discount or store credit can never take an order below one rupee.
export const MIN_CHARGE_PAISE = 100

// Open redemptions = paid orders plus recent pending ones (someone mid-checkout holds a slot).
const redemptionFilter = (extra) => ({
  ...extra,
  $or: [{ status: 'paid' }, { status: 'pending', createdAt: { $gt: new Date(Date.now() - PENDING_WINDOW_MS) } }],
})

// There is no discount for buying several notes together: the only price cuts are the one discount source below.
export const MAX_CART_ITEMS = 20

// All discounts round DOWN to whole paise, in the customer's disfavour by at most a paisa, and never go below the minimum charge.
export const percentDiscount = (basePaise, percent) => Math.max(0, Math.min(Math.floor((basePaise * percent) / 100), basePaise - MIN_CHARGE_PAISE))
export const flatDiscount = (basePaise, paise) => Math.max(0, Math.min(paise, basePaise - MIN_CHARGE_PAISE))

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

// The welcome coupon, when it can be used by this user on this order; otherwise null (never an error, it is automatic).
async function usableWelcomeCoupon({ userId, productIds, pricePaise, slugs = [] }) {
  if (!growth.WELCOME_COUPON) return null
  if (slugs.some((slug) => growth.WELCOME_EXCLUDED_SLUGS.includes(String(slug).toLowerCase()))) return null
  try {
    return await resolveCoupon({ code: growth.WELCOME_COUPON, userId, productIds, pricePaise })
  } catch (err) {
    if (err instanceof AppError && err.status === 400) return null
    throw err
  }
}

// The one discount source plus optional store credit, applied to `basePaise`.
// Which source wins is decided in growth/discounts.js; this turns it into rupees.
async function applySource({ basePaise, productIds, slugs, code, user, attribution, useCredit }) {
  const decision = await classifyCode({ code, user, attribution })
  let coupon = null
  let discountPaise = 0
  let label = null
  let auto = false

  if (decision.source === 'coupon') {
    coupon = await resolveCoupon({ code: decision.code, userId: user?._id, productIds, pricePaise: basePaise })
    discountPaise = discountFor(coupon, basePaise)
    label = `Coupon ${coupon.code}`
  } else if (decision.source === 'teacher') {
    discountPaise = percentDiscount(basePaise, decision.teacher.discountPercent)
    label = `Teacher code ${decision.teacher.code}`
  } else if (decision.source === 'referral') {
    discountPaise = flatDiscount(basePaise, growth.FRIEND_DISCOUNT)
    label = 'Friend discount'
  } else {
    // Nothing else applies, so the welcome offer does, without the student typing anything.
    coupon = await usableWelcomeCoupon({ userId: user?._id, productIds, pricePaise: basePaise, slugs })
    if (coupon) {
      discountPaise = discountFor(coupon, basePaise)
      label = `Welcome offer ${coupon.code}`
      auto = true
    }
  }

  const afterDiscount = basePaise - discountPaise
  const creditAvailable = user && growth.referralsEnabled ? await availableCredit(user._id) : 0
  const creditPaise = useCredit ? Math.min(creditAvailable, Math.max(0, afterDiscount - MIN_CHARGE_PAISE)) : 0

  return {
    source: auto ? 'coupon' : decision.source,
    auto,
    coupon,
    teacher: decision.teacher ?? null,
    referral: decision.referral ?? null,
    referrer: decision.referrer ?? null,
    label,
    notice: decision.notice ?? null,
    codeDiscountPaise: discountPaise,
    creditAvailable,
    creditPaise,
    totalPaise: afterDiscount - creditPaise,
  }
}

// Prices a cart of notes: the list total, then the one discount source, then store credit.
export async function quoteCart({ products, code, user, attribution, useCredit }) {
  const listPaise = products.reduce((sum, p) => sum + p.pricePaise, 0)
  const applied = await applySource({ basePaise: listPaise, productIds: products.map((p) => p._id), slugs: products.map((p) => p.slug), code, user, attribution, useCredit })
  return { ...applied, listPaise, couponDiscountPaise: applied.codeDiscountPaise, discountPaise: applied.codeDiscountPaise }
}

// The single place a price is decided. Callers never pass amounts in.
export async function quote({ product, code, user, attribution, useCredit }) {
  const listPaise = product.pricePaise
  const applied = await applySource({ basePaise: listPaise, productIds: [product._id], slugs: [product.slug], code, user, attribution, useCredit })
  return { ...applied, listPaise, discountPaise: applied.codeDiscountPaise }
}

// The fields of a priced order that are stored on the Order.
export const growthOrderFields = (priced) => ({
  couponCode: priced.coupon?.code,
  discountSource: priced.source,
  ...(priced.teacher ? { teacherId: priced.teacher._id, teacherCode: priced.teacher.code, commissionPercent: priced.teacher.commissionPercent } : {}),
  creditPaise: priced.creditPaise,
})

const publicBreakdown = (q) => ({
  discountSource: q.source,
  discountLabel: q.label,
  notice: q.notice,
  autoApplied: Boolean(q.auto),
  credit: q.creditPaise / 100,
  creditAvailable: q.creditAvailable / 100,
})

export const quoteToPublic = (q) => ({
  list: q.listPaise / 100,
  discount: q.discountPaise / 100,
  total: q.totalPaise / 100,
  couponCode: q.coupon?.code ?? null,
  ...publicBreakdown(q),
})

export const cartQuoteToPublic = (q) => ({
  list: (q?.listPaise ?? 0) / 100,
  couponCode: q?.coupon?.code ?? null,
  couponDiscount: (q?.couponDiscountPaise ?? 0) / 100,
  discount: (q?.discountPaise ?? 0) / 100,
  total: (q?.totalPaise ?? 0) / 100,
  ...(q ? publicBreakdown(q) : { discountSource: 'none', discountLabel: null, notice: null, autoApplied: false, credit: 0, creditAvailable: 0 }),
})
