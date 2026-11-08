import { Order } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { grantForOrder, revokeForOrder } from './entitlements.js'
import { commitSpend } from './growth/credit.js'
import { onOrderRefunded } from './growth/sales.js'
import { logger } from '../utils/logger.js'

// Every step is idempotent, so a retried webhook or a verify + webhook race is safe.
// The order flips to `paid` last: a crash midway is repaired by the next event.
export async function settlePaid(order, { paymentId, amountPaise, currency = 'INR', source }) {
  if (amountPaise !== order.amountPaise || currency !== order.currency) {
    logger.warn('payment amount mismatch, not granting access', { orderId: String(order._id) })
    return { granted: false, reason: 'amount_mismatch' }
  }
  if (order.status === 'refunded') return { granted: false, reason: 'already_refunded' }

  await Payment.updateOne(
    { providerPaymentId: paymentId },
    {
      $setOnInsert: {
        order: order._id,
        user: order.user,
        provider: order.provider,
        providerPaymentId: paymentId,
        providerOrderId: order.providerOrderId,
        amountPaise: order.amountPaise,
        currency: order.currency,
        status: 'captured',
        source,
      },
    },
    { upsert: true },
  )
  await grantForOrder(order)
  await Order.updateOne(
    { _id: order._id, status: { $in: ['pending', 'failed', 'cancelled'] } },
    { $set: { status: 'paid', paidAt: new Date() } },
  )
  // Store credit used on the order leaves the balance for good (idempotent: one entry per order).
  await commitSpend(order)
  return { granted: true }
}

export async function markFailed(order) {
  await Order.updateOne({ _id: order._id, status: 'pending' }, { $set: { status: 'failed' } })
}

// Applies a completed refund. Entitlement is revoked only when the payment is fully refunded.
export async function applyRefund({ payment, refundId, amountPaise, reason }) {
  if (refundId && payment.refundIds.includes(refundId)) return { duplicate: true }
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, ...(refundId ? { refundIds: { $ne: refundId } } : {}) },
    { $inc: { refundedPaise: amountPaise }, ...(refundId ? { $addToSet: { refundIds: refundId } } : {}) },
    { returnDocument: 'after' },
  )
  if (!updated) return { duplicate: true }

  const full = updated.refundedPaise >= updated.amountPaise
  updated.status = full ? 'refunded' : 'partially_refunded'
  await updated.save()
  if (full) {
    await Order.updateOne(
      { _id: updated.order, status: 'paid' },
      { $set: { status: 'refunded', refundedAt: new Date(), refundReason: reason } },
    )
    await revokeForOrder(updated.order, reason || 'refunded')
    // Teacher commission, referral reward and any store credit used on this order are reversed.
    await onOrderRefunded(updated.order)
  }
  return { duplicate: false, full }
}
