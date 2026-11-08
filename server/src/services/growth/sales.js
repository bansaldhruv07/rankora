import { refundWindowMs } from '../../config/growth.js'
import { Order } from '../../models/Order.js'
import { TeacherAdjustment } from '../../models/TeacherAdjustment.js'
import { refundSpend } from './credit.js'
import { evaluateMilestones } from './milestones.js'
import { onReferredOrderConfirmed, reverseReferralForOrder } from './referrals.js'

// Commission is a percentage of what the student actually paid, rounded down to a whole paisa.
export const commissionFor = (amountPaise, percent) => Math.floor((amountPaise * (percent ?? 0)) / 100)

// Records the teacher's commission for a confirmed order. Idempotent: it only ever fires once per order.
export async function recordTeacherSale(order) {
  if (!order.teacherId) return false
  const result = await Order.updateOne(
    { _id: order._id, status: 'paid', teacherId: { $exists: true }, commissionStatus: { $exists: false } },
    { $set: { commissionPaise: commissionFor(order.amountPaise, order.commissionPercent), commissionStatus: 'pending' } },
  )
  return result.modifiedCount > 0
}

// Called ONLY from the verified payment webhook, after the order has been settled. Every step is idempotent, so a
// replayed or repeated webhook changes nothing the second time.
export async function onSaleConfirmed(orderId, now = new Date()) {
  const order = await Order.findById(orderId)
  if (!order || order.status !== 'paid') return null
  await Order.updateOne({ _id: order._id, saleConfirmedAt: { $exists: false } }, { $set: { saleConfirmedAt: now } })
  await recordTeacherSale(order)
  await onReferredOrderConfirmed(order, now)
  if (order.teacherId) await evaluateMilestones(order.teacherId, now)
  return order
}

// Commissions whose refund window has passed become payable.
export async function releaseDueCommissions(now = new Date()) {
  const cutoff = new Date(now.getTime() - refundWindowMs())
  const result = await Order.updateMany(
    { commissionStatus: 'pending', status: 'paid', paidAt: { $lte: cutoff } },
    { $set: { commissionStatus: 'payable' } },
  )
  return result.modifiedCount
}

// A refunded order loses its commission. If the commission was already paid out, the amount becomes a negative
// adjustment that is deducted from the teacher's next payout.
async function reverseCommission(orderId) {
  const order = await Order.findById(orderId)
  if (!order?.teacherId || !order.commissionStatus || order.commissionStatus === 'reversed') return null
  if (order.commissionStatus === 'paid') {
    try {
      await TeacherAdjustment.create({ teacher: order.teacherId, order: order._id, amountPaise: -order.commissionPaise })
    } catch (err) {
      if (err?.code !== 11000) throw err
    }
  }
  await Order.updateOne({ _id: order._id, commissionStatus: { $in: ['pending', 'payable', 'paid'] } }, { $set: { commissionStatus: 'reversed' } })
  return order
}

// Called when an order is fully refunded.
export async function onOrderRefunded(orderId, now = new Date()) {
  const order = await Order.findById(orderId)
  if (!order) return
  await reverseCommission(order._id)
  await reverseReferralForOrder(order)
  await refundSpend(order)
  if (order.teacherId) await evaluateMilestones(order.teacherId, now)
}
