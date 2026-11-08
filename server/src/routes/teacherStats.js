import { Router } from 'express'
import { growth } from '../config/growth.js'
import { featureEnabled } from '../middleware/features.js'
import { statsLimiter } from '../middleware/security.js'
import { Teacher } from '../models/Teacher.js'
import { maintainIfDue } from '../services/growth/maintenance.js'
import { monthlyBreakdown, presentStats, recentSales, statsForTeachers } from '../services/growth/stats.js'
import { notFound } from '../utils/AppError.js'
import { asyncHandler, ok } from '../utils/http.js'

const router = Router()

// The teacher's own page: read-only, no login, addressed by a long random token. It shows totals and a list of sales
// (date, product, amount, status) and NEVER anything about the students: no names, phones, emails or ids.
// An unknown token, a malformed one, or a disabled program all answer with the same generic 404.
router.get(
  '/:token',
  statsLimiter,
  asyncHandler(async (req, res) => {
    res.set({ 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store' })
    if (!featureEnabled('teachers') || !/^[A-Za-z0-9_-]{20,100}$/.test(req.params.token)) throw notFound()
    const teacher = await Teacher.findOne({ statsToken: req.params.token })
    if (!teacher) throw notFound()

    await maintainIfDue()
    const [stats, monthly, recent] = await Promise.all([statsForTeachers([teacher._id]), monthlyBreakdown(teacher._id), recentSales(teacher._id)])
    ok(res, {
      teacher: { name: teacher.name, code: teacher.code, partnerTeacher: teacher.partnerTeacher, studentDiscountPercent: teacher.discountPercent, active: teacher.active && !teacher.blocked },
      stats: presentStats(stats.get(String(teacher._id))),
      monthly,
      recent,
      rules: { refundWindowDays: growth.REFUND_WINDOW_DAYS, milestones: growth.MILESTONES.map((m) => ({ students: m.students, giftValue: m.giftValuePaise / 100, partnerTeacher: Boolean(m.partnerTeacher) })) },
    })
  }),
)

export default router
