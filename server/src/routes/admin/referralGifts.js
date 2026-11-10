import { Router } from 'express'
import { z } from 'zod'
import { requirePermission } from '../../middleware/auth.js'
import { requireFeature } from '../../middleware/features.js'
import { ReferralGift } from '../../models/ReferralGift.js'
import { audit } from '../../services/audit.js'
import { maintainIfDue } from '../../services/growth/maintenance.js'
import { approveGift, issueGift } from '../../services/growth/referralGifts.js'
import { asyncHandler, assertObjectId, ok, parse } from '../../utils/http.js'

// Refer-and-earn gift cards that students have unlocked. Same rules as the teacher bonuses: an admin approves each
// one and records it as issued; nothing is sent automatically. Needs the 'growth' permission and referrals switched on.
const router = Router()
router.use(requirePermission('growth'), requireFeature('referrals'))

const giftView = (g) => ({
  id: String(g._id),
  student: g.referrer?._id ? { id: String(g.referrer._id), name: g.referrer.name, email: g.referrer.email } : { id: String(g.referrer) },
  tier: g.tier,
  percent: g.percent,
  basis: g.basisPaise / 100,
  value: g.valuePaise / 100,
  status: g.status,
  reachedAt: g.reachedAt,
  approvedAt: g.approvedAt,
  issuedAt: g.issuedAt,
  note: g.note,
})

router.get(
  '/',
  asyncHandler(async (req, res) => {
    await maintainIfDue()
    const { status } = parse(z.object({ status: z.enum(['eligible', 'approved', 'issued', 'not_eligible']).optional() }), req.query)
    const gifts = await ReferralGift.find(status ? { status } : { status: { $ne: 'not_eligible' } })
      .populate('referrer', 'name email')
      .sort({ reachedAt: -1 })
      .limit(200)
    ok(res, gifts.map(giftView))
  }),
)

router.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const gift = await approveGift(assertObjectId(req.params.id), req.user._id)
    await audit(req, 'referral.gift_approve', { type: 'user', id: gift.referrer, summary: `Approved the ${gift.tier}-friend gift card` })
    ok(res, giftView(gift))
  }),
)

router.post(
  '/:id/issue',
  asyncHandler(async (req, res) => {
    const { note } = parse(z.object({ note: z.string().trim().min(2, 'Add a note, e.g. the gift card brand and how it was sent').max(300) }), req.body)
    const gift = await issueGift(assertObjectId(req.params.id), req.user._id, note)
    await audit(req, 'referral.gift_issue', { type: 'user', id: gift.referrer, summary: `Marked the ${gift.tier}-friend gift card as issued` })
    ok(res, giftView(gift))
  }),
)

export default router
