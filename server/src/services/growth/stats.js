import { growth, refundWindowMs } from '../../config/growth.js'
import { Order } from '../../models/Order.js'
import { TeacherAdjustment } from '../../models/TeacherAdjustment.js'
import { TeacherBonus } from '../../models/TeacherBonus.js'
import { TeacherClick } from '../../models/TeacherClick.js'
import { TeacherPayout } from '../../models/TeacherPayout.js'

const CONFIRMED = { saleConfirmedAt: { $exists: true } }
const sumIf = (condition, field) => ({ $sum: { $cond: [condition, field ?? 1, 0] } })
const isStatus = (value) => ({ $eq: ['$commissionStatus', value] })

// Numbers per teacher, for the admin table and the teacher's own page. All amounts are paise.
// "Orders" and "sales" count confirmed orders that were not refunded.
export async function statsForTeachers(teacherIds, now = new Date()) {
  const cutoff = new Date(now.getTime() - refundWindowMs())
  const [orderRows, studentRows, clickRows, payoutRows, adjustmentRows, bonuses] = await Promise.all([
    Order.aggregate([
      { $match: { teacherId: { $in: teacherIds }, ...CONFIRMED } },
      {
        $group: {
          _id: '$teacherId',
          orders: sumIf({ $eq: ['$status', 'paid'] }),
          refundedOrders: sumIf({ $eq: ['$status', 'refunded'] }),
          salesPaise: sumIf({ $eq: ['$status', 'paid'] }, '$amountPaise'),
          earnedPaise: sumIf({ $in: ['$commissionStatus', ['pending', 'payable', 'paid']] }, '$commissionPaise'),
          inRefundWindowPaise: sumIf(isStatus('pending'), '$commissionPaise'),
          readyToPayPaise: sumIf(isStatus('payable'), '$commissionPaise'),
          paidCommissionPaise: sumIf(isStatus('paid'), '$commissionPaise'),
        },
      },
    ]),
    Order.aggregate([
      { $match: { teacherId: { $in: teacherIds }, status: 'paid', ...CONFIRMED } },
      { $group: { _id: { teacher: '$teacherId', user: '$user' }, firstPaidAt: { $min: '$paidAt' } } },
      { $group: { _id: '$_id.teacher', paidStudents: { $sum: 1 }, qualifiedStudents: sumIf({ $lte: ['$firstPaidAt', cutoff] }) } },
    ]),
    TeacherClick.aggregate([{ $match: { teacher: { $in: teacherIds } } }, { $group: { _id: '$teacher', clicks: { $sum: '$count' } } }]),
    TeacherPayout.aggregate([{ $match: { teacher: { $in: teacherIds } } }, { $group: { _id: '$teacher', paidOutPaise: { $sum: '$amountPaise' } } }]),
    TeacherAdjustment.aggregate([{ $match: { teacher: { $in: teacherIds }, status: 'open' } }, { $group: { _id: '$teacher', owedPaise: { $sum: { $multiply: ['$amountPaise', -1] } } } }]),
    TeacherBonus.find({ teacher: { $in: teacherIds } }).sort({ milestone: 1 }).lean(),
  ])

  const by = (rows) => new Map(rows.map((row) => [String(row._id), row]))
  const orders = by(orderRows)
  const students = by(studentRows)
  const clicks = by(clickRows)
  const payouts = by(payoutRows)
  const adjustments = by(adjustmentRows)

  const result = new Map()
  for (const id of teacherIds) {
    const key = String(id)
    const o = orders.get(key) ?? {}
    const owed = adjustments.get(key)?.owedPaise ?? 0
    const qualified = students.get(key)?.qualifiedStudents ?? 0
    const next = growth.MILESTONES.find((m) => m.students > qualified) ?? null
    result.set(key, {
      clicks: clicks.get(key)?.clicks ?? 0,
      paidStudents: students.get(key)?.paidStudents ?? 0,
      qualifiedStudents: qualified,
      orders: o.orders ?? 0,
      refundedOrders: o.refundedOrders ?? 0,
      salesPaise: o.salesPaise ?? 0,
      earnedPaise: o.earnedPaise ?? 0,
      inRefundWindowPaise: o.inRefundWindowPaise ?? 0,
      readyToPayPaise: o.readyToPayPaise ?? 0,
      paidCommissionPaise: o.paidCommissionPaise ?? 0,
      paidOutPaise: payouts.get(key)?.paidOutPaise ?? 0,
      adjustmentsOwedPaise: owed,
      // What an admin could pay today: commissions past the refund window minus any refunds still owed back.
      netPayablePaise: Math.max(0, (o.readyToPayPaise ?? 0) - owed),
      nextMilestone: next ? { students: next.students, giftValuePaise: next.giftValuePaise, remaining: next.students - qualified } : null,
      bonuses: bonuses
        .filter((b) => String(b.teacher) === key)
        .map((b) => ({ id: String(b._id), milestone: b.milestone, giftValuePaise: b.giftValuePaise, partnerTeacher: b.partnerTeacher, status: b.status, reachedAt: b.reachedAt, approvedAt: b.approvedAt, issuedAt: b.issuedAt, note: b.note })),
    })
  }
  return result
}

// Month-by-month for one teacher (confirmed, not refunded orders), newest first.
export async function monthlyBreakdown(teacherId) {
  const rows = await Order.aggregate([
    { $match: { teacherId, status: 'paid', ...CONFIRMED } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
        orders: { $sum: 1 },
        salesPaise: { $sum: '$amountPaise' },
        commissionPaise: sumIf({ $ne: ['$commissionStatus', 'reversed'] }, '$commissionPaise'),
      },
    },
    { $sort: { _id: -1 } },
  ])
  return rows.map((r) => ({ month: r._id, orders: r.orders, sales: r.salesPaise / 100, commission: r.commissionPaise / 100 }))
}

// The latest sales. Deliberately contains no information about WHO bought: only date, product, amount and status.
export async function recentSales(teacherId, limit = 20) {
  const rows = await Order.find({ teacherId, ...CONFIRMED }).sort({ paidAt: -1, _id: -1 }).limit(limit).select('paidAt productTitle amountPaise status commissionStatus').lean()
  return rows.map((o) => ({
    date: o.paidAt,
    product: o.productTitle,
    amount: o.amountPaise / 100,
    status: o.status === 'refunded' ? 'refunded' : o.commissionStatus === 'paid' ? 'paid' : o.commissionStatus === 'payable' ? 'payable' : 'pending',
  }))
}

// The numbers in rupees, as shown to admins and (a subset of them) to the teacher.
export function presentStats(stats) {
  const next = stats.nextMilestone
  return {
    clicks: stats.clicks,
    paidStudents: stats.paidStudents,
    qualifiedStudents: stats.qualifiedStudents,
    orders: stats.orders,
    refundedOrders: stats.refundedOrders,
    sales: stats.salesPaise / 100,
    earned: stats.earnedPaise / 100,
    inRefundWindow: stats.inRefundWindowPaise / 100,
    readyToPay: stats.readyToPayPaise / 100,
    paid: stats.paidCommissionPaise / 100,
    paidOut: stats.paidOutPaise / 100,
    adjustmentsOwed: stats.adjustmentsOwedPaise / 100,
    netPayable: stats.netPayablePaise / 100,
    // Everything earned that has not been paid yet, after refunds owed back.
    pending: Math.max(0, stats.inRefundWindowPaise + stats.readyToPayPaise - stats.adjustmentsOwedPaise) / 100,
    nextMilestone: next
      ? { students: next.students, giftValue: next.giftValuePaise / 100, remaining: next.remaining, progressPercent: Math.min(100, Math.round((stats.qualifiedStudents / next.students) * 100)) }
      : null,
    bonuses: stats.bonuses.map((b) => ({ ...b, giftValue: b.giftValuePaise / 100, giftValuePaise: undefined })),
  }
}
