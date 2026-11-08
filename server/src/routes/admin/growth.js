import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { requirePermission } from '../../middleware/auth.js'
import { requireFeature } from '../../middleware/features.js'
import { Order } from '../../models/Order.js'
import { Teacher } from '../../models/Teacher.js'
import { TeacherBonus } from '../../models/TeacherBonus.js'
import { TeacherPayout } from '../../models/TeacherPayout.js'
import { audit } from '../../services/audit.js'
import { codeInUse, digitsOnly, newStatsToken, REFERRAL_PREFIX, suggestTeacherCode } from '../../services/growth/codes.js'
import { toCsv } from '../../services/growth/csv.js'
import { maintainIfDue } from '../../services/growth/maintenance.js'
import { approveBonus, issueBonus } from '../../services/growth/milestones.js'
import { createPayout, openAdjustmentsFor, payableOrdersFor } from '../../services/growth/payouts.js'
import { monthlyBreakdown, presentStats, recentSales, statsForTeachers } from '../../services/growth/stats.js'
import { badRequest, conflict, notFound } from '../../utils/AppError.js'
import { orderReference } from '../../utils/crypto.js'
import { asyncHandler, assertObjectId, escapeRegex, ok, parse } from '../../utils/http.js'

// Everything here needs the 'growth' permission (admins only) on top of the staff session checked by the parent
// router, and the teacher program to be switched on. A disabled program answers as if these routes did not exist.
const router = Router()
router.use(requirePermission('growth'), requireFeature('teachers'))

const phone = z
  .string()
  .trim()
  .transform(digitsOnly)
  .refine((value) => value.length >= 7 && value.length <= 15, 'Enter a valid phone number')
const email = z.string().trim().toLowerCase().email().max(254)
const percent = z.number().int().min(0).max(90)

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  email: email.nullable().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,16}$/, 'Use 4 to 16 letters or numbers').optional(),
  discountPercent: percent.optional(),
  commissionPercent: percent.optional(),
  notes: z.string().trim().max(500).optional(),
})
const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  email: email.nullable(),
  discountPercent: percent,
  commissionPercent: percent,
  active: z.boolean(),
  blocked: z.boolean(),
  notes: z.string().trim().max(500),
}).partial()

const statsUrl = (teacher) => `${env.frontendOrigin}/t/${teacher.statsToken}`

const teacherView = (teacher, stats) => ({
  id: String(teacher._id),
  name: teacher.name,
  phone: teacher.phone,
  email: teacher.email ?? null,
  code: teacher.code,
  discountPercent: teacher.discountPercent,
  commissionPercent: teacher.commissionPercent,
  active: teacher.active,
  blocked: teacher.blocked,
  partnerTeacher: teacher.partnerTeacher,
  notes: teacher.notes,
  createdAt: teacher.createdAt,
  statsUrl: statsUrl(teacher),
  ...(stats ? { stats: presentStats(stats) } : {}),
})

const findTeacher = async (id) => {
  const teacher = await Teacher.findById(assertObjectId(id))
  if (!teacher) throw notFound('Teacher not found')
  return teacher
}

router.get(
  '/teachers',
  asyncHandler(async (req, res) => {
    await maintainIfDue()
    const q = parse(z.object({ q: z.string().trim().max(80).optional() }), req.query)
    const filter = q.q ? { $or: [{ name: new RegExp(escapeRegex(q.q), 'i') }, { code: new RegExp(`^${escapeRegex(q.q.toUpperCase())}`) }] } : {}
    const teachers = await Teacher.find(filter).sort({ createdAt: -1 }).limit(500)
    const stats = await statsForTeachers(teachers.map((t) => t._id))
    ok(res, teachers.map((t) => teacherView(t, stats.get(String(t._id)))))
  }),
)

router.post(
  '/teachers',
  asyncHandler(async (req, res) => {
    const body = parse(createSchema, req.body)
    let code = body.code
    if (code) {
      if (code.startsWith(REFERRAL_PREFIX)) throw badRequest(`Teacher codes cannot start with ${REFERRAL_PREFIX} (those are student referral codes)`)
      if (await codeInUse(code)) throw conflict('That code is already used by a teacher, a coupon or a student')
    } else {
      code = await suggestTeacherCode(body.name)
    }
    const teacher = await Teacher.create({
      name: body.name,
      phone: body.phone,
      email: body.email ?? undefined,
      code,
      statsToken: newStatsToken(),
      notes: body.notes ?? '',
      ...(body.discountPercent !== undefined ? { discountPercent: body.discountPercent } : {}),
      ...(body.commissionPercent !== undefined ? { commissionPercent: body.commissionPercent } : {}),
    })
    await audit(req, 'teacher.create', { type: 'teacher', id: teacher._id, summary: `Created teacher ${teacher.name} (${teacher.code})` })
    ok(res, teacherView(teacher), undefined, 201)
  }),
)

router.get(
  '/teachers/:id',
  asyncHandler(async (req, res) => {
    await maintainIfDue()
    const teacher = await findTeacher(req.params.id)
    const [stats, monthly, recent, payable, adjustments, payouts] = await Promise.all([
      statsForTeachers([teacher._id]),
      monthlyBreakdown(teacher._id),
      recentSales(teacher._id, 30),
      payableOrdersFor(teacher._id),
      openAdjustmentsFor(teacher._id),
      TeacherPayout.find({ teacher: teacher._id }).sort({ paidAt: -1 }).limit(100),
    ])
    ok(res, {
      ...teacherView(teacher, stats.get(String(teacher._id))),
      monthly,
      recent,
      payableOrders: payable.map((o) => ({ id: String(o._id), reference: orderReference(o._id), date: o.paidAt, product: o.productTitle, amount: o.amountPaise / 100, commission: o.commissionPaise / 100 })),
      adjustments: adjustments.map((a) => ({ id: String(a._id), amount: a.amountPaise / 100, reason: a.reason, createdAt: a.createdAt })),
      payouts: payouts.map((p) => ({ id: String(p._id), amount: p.amountPaise / 100, gross: p.grossPaise / 100, adjustments: p.adjustmentsPaise / 100, upiRef: p.upiRef, paidAt: p.paidAt, note: p.note, orders: p.orders.length })),
    })
  }),
)

router.patch(
  '/teachers/:id',
  asyncHandler(async (req, res) => {
    const teacher = await findTeacher(req.params.id)
    const body = parse(updateSchema, req.body)
    // The code never changes: links and saved cookies out in the world point at it. Rates change future orders only.
    for (const [key, value] of Object.entries(body)) teacher[key] = value === null ? undefined : value
    await teacher.save()
    await audit(req, 'teacher.update', { type: 'teacher', id: teacher._id, summary: `Edited teacher ${teacher.code}`, meta: { fields: Object.keys(body) } })
    ok(res, teacherView(teacher))
  }),
)

// If a stats link leaks, this replaces it; the old one stops working at once.
router.post(
  '/teachers/:id/rotate-token',
  asyncHandler(async (req, res) => {
    const teacher = await findTeacher(req.params.id)
    teacher.statsToken = newStatsToken()
    await teacher.save()
    await audit(req, 'teacher.rotate_token', { type: 'teacher', id: teacher._id, summary: `New stats link for ${teacher.code}` })
    ok(res, teacherView(teacher))
  }),
)

const objectId = z.string().refine((value) => {
  try {
    assertObjectId(value)
    return true
  } catch {
    return false
  }
}, 'Invalid order id')

router.post(
  '/teachers/:id/payouts',
  asyncHandler(async (req, res) => {
    const teacher = await findTeacher(req.params.id)
    const body = parse(
      z.object({
        orderIds: z.array(objectId).min(1).max(500),
        upiRef: z.string().trim().min(3).max(100),
        note: z.string().trim().max(300).optional(),
        paidAt: z.coerce.date().optional(),
      }),
      req.body,
    )
    if (body.paidAt && body.paidAt.getTime() > Date.now() + 86400000) throw badRequest('The payment date cannot be in the future')
    const payout = await createPayout({ teacherId: teacher._id, orderIds: body.orderIds, upiRef: body.upiRef, note: body.note, paidAt: body.paidAt, createdBy: req.user._id })
    await audit(req, 'teacher.payout', { type: 'teacher', id: teacher._id, summary: `Paid ${teacher.code} ₹${payout.amountPaise / 100} (${body.upiRef})`, meta: { orders: body.orderIds.length } })
    ok(res, { id: String(payout._id), amount: payout.amountPaise / 100, gross: payout.grossPaise / 100, adjustments: payout.adjustmentsPaise / 100 }, undefined, 201)
  }),
)

const bonusView = (b) => ({
  id: String(b._id),
  teacher: b.teacher?._id ? { id: String(b.teacher._id), name: b.teacher.name, code: b.teacher.code } : { id: String(b.teacher) },
  milestone: b.milestone,
  giftValue: b.giftValuePaise / 100,
  partnerTeacher: b.partnerTeacher,
  status: b.status,
  reachedAt: b.reachedAt,
  approvedAt: b.approvedAt,
  issuedAt: b.issuedAt,
  note: b.note,
})

router.get(
  '/bonuses',
  asyncHandler(async (req, res) => {
    await maintainIfDue()
    const { status } = parse(z.object({ status: z.enum(['eligible', 'approved', 'issued', 'not_eligible']).optional() }), req.query)
    const bonuses = await TeacherBonus.find(status ? { status } : { status: { $ne: 'not_eligible' } }).populate('teacher', 'name code').sort({ reachedAt: -1 }).limit(200)
    ok(res, bonuses.map(bonusView))
  }),
)

router.post(
  '/bonuses/:id/approve',
  asyncHandler(async (req, res) => {
    const bonus = await approveBonus(assertObjectId(req.params.id), req.user._id)
    await audit(req, 'teacher.bonus_approve', { type: 'teacher', id: bonus.teacher, summary: `Approved the ${bonus.milestone}-student bonus` })
    ok(res, bonusView(bonus))
  }),
)

router.post(
  '/bonuses/:id/issue',
  asyncHandler(async (req, res) => {
    const { note } = parse(z.object({ note: z.string().trim().min(2, 'Add a note, e.g. the gift card details').max(300) }), req.body)
    const bonus = await issueBonus(assertObjectId(req.params.id), req.user._id, note)
    await audit(req, 'teacher.bonus_issue', { type: 'teacher', id: bonus.teacher, summary: `Marked the ${bonus.milestone}-student bonus as issued` })
    ok(res, bonusView(bonus))
  }),
)

const monthBounds = (month) => {
  const [year, m] = month.split('-').map(Number)
  return [new Date(Date.UTC(year, m - 1, 1)), new Date(Date.UTC(year, m, 1))]
}

// CSV of one teacher's orders, payouts or bonuses, optionally for a single month (YYYY-MM). It never contains
// student names, emails or phone numbers: orders are identified by their reference only.
router.get(
  '/teachers/:id/export',
  asyncHandler(async (req, res) => {
    const teacher = await findTeacher(req.params.id)
    const { type, month } = parse(z.object({ type: z.enum(['orders', 'payouts', 'bonuses']), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() }), req.query)
    const range = month ? { $gte: monthBounds(month)[0], $lt: monthBounds(month)[1] } : null
    let csv
    if (type === 'orders') {
      const orders = await Order.find({ teacherId: teacher._id, saleConfirmedAt: { $exists: true }, ...(range ? { paidAt: range } : {}) }).sort({ paidAt: 1 })
      csv = toCsv(
        ['Date', 'Reference', 'Product', 'Order amount (INR)', 'Discount (INR)', 'Commission %', 'Commission (INR)', 'Order status', 'Commission status'],
        orders.map((o) => [o.paidAt, orderReference(o._id), o.productTitle, o.amountPaise / 100, o.discountPaise / 100, o.commissionPercent, o.commissionPaise / 100, o.status, o.commissionStatus]),
      )
    } else if (type === 'payouts') {
      const payouts = await TeacherPayout.find({ teacher: teacher._id, ...(range ? { paidAt: range } : {}) }).sort({ paidAt: 1 })
      csv = toCsv(
        ['Paid on', 'UPI reference', 'Commissions (INR)', 'Adjustments (INR)', 'Sent (INR)', 'Orders', 'Note'],
        payouts.map((p) => [p.paidAt, p.upiRef, p.grossPaise / 100, p.adjustmentsPaise / 100, p.amountPaise / 100, p.orders.length, p.note]),
      )
    } else {
      const bonuses = await TeacherBonus.find({ teacher: teacher._id, ...(range ? { reachedAt: range } : {}) }).sort({ milestone: 1 })
      csv = toCsv(
        ['Milestone (students)', 'Gift value (INR)', 'Partner Teacher', 'Status', 'Reached', 'Approved', 'Issued', 'Note'],
        bonuses.map((b) => [b.milestone, b.giftValuePaise / 100, b.partnerTeacher ? 'yes' : 'no', b.status, b.reachedAt, b.approvedAt, b.issuedAt, b.note]),
      )
    }
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${teacher.code}-${type}${month ? `-${month}` : ''}.csv"`, 'Cache-Control': 'no-store' })
    res.send(csv)
  }),
)

export default router
