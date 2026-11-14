import { Router } from 'express'
import { z } from 'zod'
import { optionalAuth } from '../middleware/auth.js'
import { loadCart } from '../services/cart.js'
import { readAttribution } from '../services/growth/attribution.js'
import { MAX_CART_ITEMS, cartQuoteToPublic, quoteCart } from '../services/pricing.js'
import { asyncHandler, ok, parse } from '../utils/http.js'

const router = Router()

export const cartItemsSchema = z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).min(1).max(MAX_CART_ITEMS)

// Price breakdown for a cart. Read-only; the order is priced again, from the database, when it is created.
router.post(
  '/quote',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { items, coupon, useCredit } = parse(z.object({ items: cartItemsSchema, coupon: z.string().trim().max(30).optional(), useCredit: z.boolean().optional() }), req.body ?? {})
    const { products, owned, covered, unavailable } = await loadCart(items, req.user?._id)
    const priced = products.length ? await quoteCart({ products, code: coupon, user: req.user, attribution: readAttribution(req), useCredit }) : null
    ok(res, {
      lines: products.map((p) => p.toPublic()),
      owned,
      covered,
      unavailable,
      count: products.length,
      ...cartQuoteToPublic(priced),
    })
  }),
)

export default router
