import { Router } from 'express'
import { z } from 'zod'
import { optionalAuth } from '../middleware/auth.js'
import { loadCart } from '../services/cart.js'
import { CART_TIERS, MAX_CART_ITEMS, nextCartTier, quoteCart } from '../services/pricing.js'
import { asyncHandler, ok, parse } from '../utils/http.js'

const router = Router()

export const cartItemsSchema = z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).min(1).max(MAX_CART_ITEMS)

// Price breakdown for a cart. Read-only; the order is priced again, from the database, when it is created.
router.post(
  '/quote',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { items, coupon } = parse(z.object({ items: cartItemsSchema, coupon: z.string().trim().max(30).optional() }), req.body ?? {})
    const { products, owned, unavailable } = await loadCart(items, req.user?._id)
    const priced = products.length ? await quoteCart({ products, couponCode: coupon, userId: req.user?._id }) : null
    const next = nextCartTier(products.length)
    ok(res, {
      lines: products.map((p) => p.toPublic()),
      owned,
      unavailable,
      count: products.length,
      list: (priced?.listPaise ?? 0) / 100,
      volumePercent: priced?.volumePercent ?? 0,
      volumeDiscount: (priced?.volumeDiscountPaise ?? 0) / 100,
      couponCode: priced?.coupon?.code ?? null,
      couponDiscount: (priced?.couponDiscountPaise ?? 0) / 100,
      discount: (priced?.discountPaise ?? 0) / 100,
      total: (priced?.totalPaise ?? 0) / 100,
      nextTier: next ? { notes: next.min, percent: next.percent, needed: next.min - products.length } : null,
      tiers: [...CART_TIERS].reverse(),
    })
  }),
)

export default router
