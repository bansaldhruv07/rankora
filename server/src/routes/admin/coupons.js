import { Router } from 'express'
import { z } from 'zod'
import { requirePermission } from '../../middleware/auth.js'
import { Coupon } from '../../models/Coupon.js'
import { Order } from '../../models/Order.js'
import { Product } from '../../models/Product.js'
import { audit } from '../../services/audit.js'
import { badRequest, conflict, notFound } from '../../utils/AppError.js'
import { asyncHandler, assertObjectId, ok, parse } from '../../utils/http.js'

const router = Router()
router.use(requirePermission('pricing'))

const date = z.coerce.date().nullable()
const couponFields = z.object({
  description: z.string().trim().max(200),
  type: z.enum(['percent', 'flat']),
  // percent: 1-90 (percent). flat: rupees.
  value: z.number().positive().max(100000),
  maxDiscount: z.number().positive().max(100000).nullable(),
  minOrder: z.number().min(0).max(100000),
  validFrom: date,
  validUntil: date,
  usageLimit: z.number().int().positive().nullable(),
  perUserLimit: z.number().int().positive().max(100),
  products: z.array(z.string()).max(200),
  active: z.boolean(),
})
const createSchema = couponFields.partial().extend({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/) }).required({ type: true, value: true })
const updateSchema = couponFields.partial()

function toDoc({ value, maxDiscount, minOrder, usageLimit, validFrom, validUntil, products, type, ...rest }, current) {
  const kind = type ?? current?.type
  const doc = { ...rest }
  if (type) doc.type = type
  if (value !== undefined) doc.value = kind === 'percent' ? Math.round(value) : Math.round(value * 100)
  if (maxDiscount !== undefined) doc.maxDiscountPaise = maxDiscount === null ? undefined : Math.round(maxDiscount * 100)
  if (minOrder !== undefined) doc.minOrderPaise = Math.round(minOrder * 100)
  if (usageLimit !== undefined) doc.usageLimit = usageLimit ?? undefined
  if (validFrom !== undefined) doc.validFrom = validFrom ?? undefined
  if (validUntil !== undefined) doc.validUntil = validUntil ?? undefined
  if (products !== undefined) doc.products = products.map((id) => assertObjectId(id))
  return doc
}

const view = (coupon, used = 0) => ({
  id: String(coupon._id),
  code: coupon.code,
  description: coupon.description,
  type: coupon.type,
  value: coupon.type === 'percent' ? coupon.value : coupon.value / 100,
  maxDiscount: coupon.maxDiscountPaise ? coupon.maxDiscountPaise / 100 : null,
  minOrder: coupon.minOrderPaise / 100,
  validFrom: coupon.validFrom ?? null,
  validUntil: coupon.validUntil ?? null,
  usageLimit: coupon.usageLimit ?? null,
  perUserLimit: coupon.perUserLimit,
  products: coupon.products.map(String),
  active: coupon.active,
  used,
  createdAt: coupon.createdAt,
})

const usageCounts = async (codes) => {
  const rows = await Order.aggregate([
    { $match: { couponCode: { $in: codes }, status: 'paid' } },
    { $group: { _id: '$couponCode', used: { $sum: 1 } } },
  ])
  return new Map(rows.map((r) => [r._id, r.used]))
}

async function checkProducts(ids) {
  if (!ids?.length) return
  if ((await Product.countDocuments({ _id: { $in: ids } })) !== new Set(ids).size) throw notFound('One of the selected products does not exist')
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).limit(200)
    const used = await usageCounts(coupons.map((c) => c.code))
    ok(res, coupons.map((c) => view(c, used.get(c.code) ?? 0)))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { code, ...body } = parse(createSchema, req.body)
    const doc = toDoc(body)
    await checkProducts(doc.products)
    const coupon = await Coupon.create({ ...doc, code })
    await audit(req, 'coupon.create', { type: 'coupon', id: coupon._id, summary: `Created coupon ${coupon.code}` })
    ok(res, view(coupon), undefined, 201)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(assertObjectId(req.params.id))
    if (!coupon) throw notFound('Coupon not found')
    const body = parse(updateSchema, req.body)
    // Percent and rupee amounts are not interchangeable, so switching type needs a new value.
    if (body.type && body.type !== coupon.type && body.value === undefined) throw badRequest('Enter a new value when changing the coupon type')
    const doc = toDoc(body, coupon)
    await checkProducts(doc.products)
    coupon.set(doc)
    await coupon.save()
    await audit(req, 'coupon.update', { type: 'coupon', id: coupon._id, summary: `Edited coupon ${coupon.code}`, meta: { fields: Object.keys(req.body) } })
    ok(res, view(coupon, (await usageCounts([coupon.code])).get(coupon.code) ?? 0))
  }),
)

// A coupon that has been used stays on record (orders reference its code); it can only be switched off.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(assertObjectId(req.params.id))
    if (!coupon) throw notFound('Coupon not found')
    if (await Order.exists({ couponCode: coupon.code })) throw conflict('This coupon has been used, so it cannot be deleted. Deactivate it instead.')
    await coupon.deleteOne()
    await audit(req, 'coupon.delete', { type: 'coupon', id: coupon._id, summary: `Deleted coupon ${coupon.code}` })
    ok(res, { deleted: true })
  }),
)

export default router
