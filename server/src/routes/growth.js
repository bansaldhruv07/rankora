import { Router } from 'express'
import { z } from 'zod'
import { growth } from '../config/growth.js'
import { requireAuth } from '../middleware/auth.js'
import { featureEnabled, requireFeature } from '../middleware/features.js'
import { publicWriteLimiter } from '../middleware/security.js'
import { Coupon } from '../models/Coupon.js'
import { TeacherClick } from '../models/TeacherClick.js'
import { readAttribution, writeAttribution } from '../services/growth/attribution.js'
import { normalizeCode } from '../services/growth/codes.js'
import { maintainIfDue } from '../services/growth/maintenance.js'
import { findReferrerByCode, referralOverview } from '../services/growth/referrals.js'
import { findTeacherByCode } from '../services/growth/teachers.js'
import { asyncHandler, ok, parse } from '../utils/http.js'

const router = Router()

// What the website may show. Rates are included so the copy ("Get ₹50 off") always matches the server.
// The automatic welcome coupon, as the pages describe it. Null unless it is on, a plain percentage and open to everyone.
async function welcomeOffer() {
  if (!growth.WELCOME_COUPON) return null
  const coupon = await Coupon.findOne({ code: growth.WELCOME_COUPON, active: true }).lean()
  const now = new Date()
  if (!coupon || coupon.type !== 'percent' || coupon.products?.length || coupon.minOrderPaise > 0) return null
  if ((coupon.validFrom && coupon.validFrom > now) || (coupon.validUntil && coupon.validUntil < now)) return null
  return { code: coupon.code, percent: coupon.value, ...(coupon.maxDiscountPaise ? { maxDiscount: coupon.maxDiscountPaise / 100 } : {}) }
}

router.get('/features', asyncHandler(async (_req, res) => {
  ok(res, {
    welcome: await welcomeOffer(),
    referrals: featureEnabled('referrals'),
    teachers: featureEnabled('teachers'),
    ...(featureEnabled('referrals')
      ? { friendDiscount: growth.FRIEND_DISCOUNT / 100, referrerCredit: growth.REFERRER_CREDIT / 100, refundWindowDays: growth.REFUND_WINDOW_DAYS, monthlyCap: growth.REFERRAL_MONTHLY_CAP, giftTiers: growth.GIFT_TIERS, bigPackPoints: growth.BIG_PACK_POINTS }
      : {}),
  })
}))

const day = () => new Date().toISOString().slice(0, 10)
const code = z.string().trim().max(30).regex(/^[A-Za-z0-9]*$/).optional()

// A visitor arrived through /?t=CODE (teacher) or /?ref=CODE (friend). The code is remembered for ATTRIBUTION_DAYS and
// the visit is counted. Always answers the same way, so it cannot be used to find out which codes exist.
router.post(
  '/landing',
  publicWriteLimiter,
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ teacher: code, ref: code }), req.body ?? {})
    const saved = { teacher: false, ref: false }
    const patch = {}
    const current = readAttribution(req)

    if (featureEnabled('teachers') && body.teacher) {
      const teacher = await findTeacherByCode(body.teacher)
      if (teacher && teacher.active && !teacher.blocked) {
        patch.teacherCode = teacher.code
        saved.teacher = true
        // The same visitor reloading the page within the hour is not another click.
        const repeat = current.teacherCode === teacher.code && current.teacherAt && Date.now() - current.teacherAt < 60 * 60 * 1000
        if (!repeat) await TeacherClick.updateOne({ teacher: teacher._id, day: day() }, { $inc: { count: 1 } }, { upsert: true })
      }
    }
    if (featureEnabled('referrals') && body.ref) {
      const owner = await findReferrerByCode(normalizeCode(body.ref))
      if (owner) {
        patch.refCode = owner.referralCode
        saved.ref = true
      }
    }
    if (saved.teacher || saved.ref) writeAttribution(req, res, patch)
    ok(res, { saved: saved.teacher || saved.ref })
  }),
)

router.get(
  '/referrals/me',
  requireFeature('referrals'),
  requireAuth,
  asyncHandler(async (req, res) => {
    await maintainIfDue()
    ok(res, await referralOverview(req.user))
  }),
)

export default router
