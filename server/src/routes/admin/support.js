import { Router } from 'express'
import { z } from 'zod'
import { requirePermission } from '../../middleware/auth.js'
import { SupportMessage } from '../../models/SupportMessage.js'
import { audit } from '../../services/audit.js'
import { notFound } from '../../utils/AppError.js'
import { asyncHandler, assertObjectId, ok, pageMeta, pageParams, parse } from '../../utils/http.js'

const router = Router()
router.use(requirePermission('support'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(['open', 'resolved']).optional() }), req.query)
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = status ? { status } : {}
    const [items, total] = await Promise.all([
      SupportMessage.find(filter).populate('user', 'name email').sort({ status: -1, createdAt: -1 }).skip(skip).limit(limit),
      SupportMessage.countDocuments(filter),
    ])
    ok(
      res,
      items.map((m) => ({
        id: String(m._id),
        subject: m.subject,
        message: m.message,
        status: m.status,
        adminNote: m.adminNote,
        orderId: m.order ? String(m.order) : null,
        user: { id: String(m.user?._id), name: m.user?.name, email: m.user?.email },
        createdAt: m.createdAt,
      })),
      pageMeta(page, limit, total),
    )
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ status: z.enum(['open', 'resolved']).optional(), adminNote: z.string().trim().max(1000).optional() }), req.body)
    const message = await SupportMessage.findByIdAndUpdate(assertObjectId(req.params.id), { $set: body }, { returnDocument: 'after' })
    if (!message) throw notFound('Message not found')
    await audit(req, 'support.update', { type: 'support', id: message._id, summary: `Marked "${message.subject}" ${message.status}` })
    ok(res, { id: String(message._id), status: message.status, adminNote: message.adminNote })
  }),
)

export default router
