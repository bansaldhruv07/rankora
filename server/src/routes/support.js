import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { requireAuth } from '../middleware/auth.js'
import { publicWriteLimiter } from '../middleware/security.js'
import { Order } from '../models/Order.js'
import { SupportMessage } from '../models/SupportMessage.js'
import { asyncHandler, assertObjectId, ok, parse } from '../utils/http.js'

const router = Router()
router.use(requireAuth)

const schema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
  orderId: z.string().optional(),
})

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await SupportMessage.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20)
    ok(res, {
      supportEmail: env.supportEmail || null,
      items: items.map((m) => ({ id: String(m._id), subject: m.subject, message: m.message, status: m.status, createdAt: m.createdAt })),
    })
  }),
)

router.post(
  '/',
  publicWriteLimiter,
  asyncHandler(async (req, res) => {
    const body = parse(schema, req.body)
    // A message can only reference one of the sender's own orders.
    const order = body.orderId ? await Order.findOne({ _id: assertObjectId(body.orderId), user: req.user._id }).select('_id') : null
    const message = await SupportMessage.create({ user: req.user._id, subject: body.subject, message: body.message, order: order?._id })
    ok(res, { id: String(message._id) }, undefined, 201)
  }),
)

export default router
