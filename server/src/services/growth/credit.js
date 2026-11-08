import { PENDING_ORDER_WINDOW_MS } from '../../config/growth.js'
import { CreditEntry } from '../../models/CreditEntry.js'
import { Order } from '../../models/Order.js'

// Posts a ledger entry once. The unique indexes (see CreditEntry) turn a repeat into a duplicate-key error,
// which is the "already posted" answer, so every caller is safe to retry.
export async function postEntryOnce(entry) {
  try {
    await CreditEntry.create(entry)
    return true
  } catch (err) {
    if (err?.code === 11000) return false
    throw err
  }
}

// Money the ledger says the user has: rewards in, spends and reversals out.
export async function creditBalance(userId) {
  const [row] = await CreditEntry.aggregate([{ $match: { user: userId } }, { $group: { _id: null, total: { $sum: '$amountPaise' } } }])
  return row?.total ?? 0
}

// Credit held by this user's unpaid orders. An unpaid order only holds it for a short window, after which
// (or once it is cancelled or failed) the credit is free again.
export async function reservedCredit(userId, { now = new Date(), exceptOrder } = {}) {
  const match = { user: userId, status: 'pending', creditPaise: { $gt: 0 }, createdAt: { $gt: new Date(now.getTime() - PENDING_ORDER_WINDOW_MS) } }
  if (exceptOrder) match._id = { $ne: exceptOrder }
  const [row] = await Order.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$creditPaise' } } }])
  return row?.total ?? 0
}

// What the user can spend right now. Never negative.
export async function availableCredit(userId, options) {
  const [balance, reserved] = await Promise.all([creditBalance(userId), reservedCredit(userId, options)])
  return Math.max(0, balance - reserved)
}

// The credit an order used is taken out of the balance when its payment is confirmed ...
export function commitSpend(order) {
  if (!order.creditPaise) return false
  return postEntryOnce({ user: order.user, type: 'spend', amountPaise: -order.creditPaise, order: order._id, note: 'Used at checkout' })
}

// ... and handed back if that order is refunded.
export function refundSpend(order) {
  if (!order.creditPaise) return false
  return postEntryOnce({ user: order.user, type: 'spend_refund', amountPaise: order.creditPaise, order: order._id, note: 'Order refunded' })
}

export const ledgerFor = (userId, limit = 50) => CreditEntry.find({ user: userId }).sort({ createdAt: -1, _id: -1 }).limit(limit)
