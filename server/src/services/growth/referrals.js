import { growth, refundWindowMs } from '../../config/growth.js'
import { Order } from '../../models/Order.js'
import { Referral } from '../../models/Referral.js'
import { User } from '../../models/User.js'
import { codeInUse, newReferralCode, normalizeCode } from './codes.js'
import { giftOverview } from './referralGifts.js'
import { creditBalance, ledgerFor, postEntryOnce, reservedCredit } from './credit.js'

// ---- codes -----------------------------------------------------------------------------------------------------------

export async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = newReferralCode()
    if (await codeInUse(code)) continue
    try {
      await User.updateOne({ _id: user._id, referralCode: { $exists: false } }, { $set: { referralCode: code } })
      break
    } catch (err) {
      if (err?.code !== 11000) throw err
    }
  }
  const fresh = await User.findById(user._id).select('referralCode')
  return fresh?.referralCode
}

export function findReferrerByCode(code) {
  const normalized = normalizeCode(code)
  return normalized ? User.findOne({ referralCode: normalized, suspendedAt: null }) : null
}

// ---- eligibility -------------------------------------------------------------------------------------------------------

// A refunded order still counts: a friend discount is for a first purchase, not a repeatable trick.
const PAID_BEFORE = ['paid', 'refunded']
export const hasPaidBefore = (userId) => Order.exists({ user: userId, status: { $in: PAID_BEFORE } })

// Can `user` take the friend discount from `owner`'s code? Returns { referral } (the row to reuse, if one exists)
// or { problem } with a message that is safe to show.
export async function referralEligibility(user, owner) {
  if (user && String(owner._id) === String(user._id)) return { problem: 'You cannot use your own referral code.' }
  if (!user) return { referral: null } // signed out: checked again when the order is created
  const existing = await Referral.findOne({ referred: user._id })
  if (existing) {
    if (String(existing.referrer) !== String(owner._id)) return { problem: 'A different friend code is already linked to your account.' }
    if (existing.status !== 'attached') return { problem: 'A friend code has already been used on your account.' }
    if (await hasPaidBefore(user._id)) return { problem: 'Friend codes only work on your first order.' }
    return { referral: existing }
  }
  if (await hasPaidBefore(user._id)) return { problem: 'Friend codes only work on your first order.' }
  return { referral: null }
}

// The friend discount the user already has attached to their account (no code typed), if still usable.
export async function attachedReferral(user) {
  if (!user) return null
  const existing = await Referral.findOne({ referred: user._id, status: 'attached' })
  if (!existing || (await hasPaidBefore(user._id))) return null
  const referrer = await User.findOne({ _id: existing.referrer, suspendedAt: null }).select('_id')
  return referrer ? existing : null
}

// Links the friend to the referrer. One referral per friend, enforced by a unique index.
export async function attachReferral(user, owner) {
  try {
    return await Referral.create({ referrer: owner._id, referred: user._id, code: owner.referralCode })
  } catch (err) {
    if (err?.code === 11000) return Referral.findOne({ referred: user._id })
    throw err
  }
}

// Used by sign-up: a /?ref= link saved before the account existed is attached right away.
export async function attachFromSavedCode(user, code) {
  if (!growth.referralsEnabled || !code) return null
  const owner = await findReferrerByCode(code)
  if (!owner) return null
  const { problem } = await referralEligibility(user, owner)
  return problem ? null : attachReferral(user, owner)
}

// ---- rewards -----------------------------------------------------------------------------------------------------------

const monthBounds = (date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  return [start, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))]
}

// Called when the verified webhook confirms an order. Idempotent: only an "attached" referral can move on.
export async function onReferredOrderConfirmed(order, now = new Date()) {
  const referral = await Referral.findOne({ referred: order.user })
  if (!referral || referral.status !== 'attached') return null

  if (order.discountSource === 'referral' && String(order.referralId) === String(referral._id)) {
    const paidAt = order.paidAt ?? now
    const [from, to] = monthBounds(paidAt)
    const rewardsThisMonth = await Referral.countDocuments({
      referrer: referral.referrer,
      status: { $in: ['pending', 'granted'] },
      paidAt: { $gte: from, $lt: to },
    })
    const capped = rewardsThisMonth >= growth.REFERRAL_MONTHLY_CAP
    return Referral.findOneAndUpdate(
      { _id: referral._id, status: 'attached' },
      {
        $set: {
          status: capped ? 'capped' : 'pending',
          firstOrder: order._id,
          paidAt,
          eligibleAt: new Date(paidAt.getTime() + refundWindowMs()),
          ...(capped ? { reason: 'monthly cap reached' } : {}),
        },
      },
      { returnDocument: 'after' },
    )
  }

  // The friend's first order used a teacher code (or a coupon, or no discount): the referrer gets nothing for it.
  const reason = order.discountSource === 'teacher' ? 'teacher code used' : order.discountSource === 'coupon' ? 'coupon used' : 'friend discount not used'
  return Referral.findOneAndUpdate(
    { _id: referral._id, status: 'attached' },
    { $set: { status: 'superseded', firstOrder: order._id, paidAt: order.paidAt ?? now, reason } },
    { returnDocument: 'after' },
  )
}

// Moves rewards whose refund window has passed from "pending" to "granted" and posts the credit, once.
export async function releaseDueRewards(now = new Date()) {
  const due = await Referral.find({ status: 'pending', eligibleAt: { $lte: now } })
  let granted = 0
  for (const referral of due) {
    const order = await Order.findById(referral.firstOrder).select('status')
    if (!order || order.status !== 'paid') continue // refunded orders are handled by the refund path
    await postEntryOnce({ user: referral.referrer, type: 'referral_reward', amountPaise: growth.REFERRER_CREDIT, referral: referral._id, note: 'A friend you invited made a purchase' })
    const moved = await Referral.updateOne({ _id: referral._id, status: 'pending' }, { $set: { status: 'granted', grantedAt: now } })
    if (moved.modifiedCount) granted += 1
  }
  return granted
}

// The friend's order was refunded: no reward, or take back the one already given.
export async function reverseReferralForOrder(order) {
  const referral = await Referral.findOne({ firstOrder: order._id })
  if (!referral || referral.status === 'reversed' || referral.status === 'superseded') return null
  const wasGranted = referral.status === 'granted'
  const updated = await Referral.findOneAndUpdate(
    { _id: referral._id, status: { $in: ['pending', 'granted', 'capped'] } },
    { $set: { status: 'reversed', reason: 'order refunded' } },
    { returnDocument: 'before' },
  )
  if (updated && wasGranted) {
    await postEntryOnce({ user: referral.referrer, type: 'reward_reversal', amountPaise: -growth.REFERRER_CREDIT, referral: referral._id, note: 'A friend’s order was refunded' })
  }
  return updated
}

// ---- the /refer page ---------------------------------------------------------------------------------------------------

export async function referralOverview(user) {
  const code = await ensureReferralCode(user)
  const [referrals, balance, reserved, ledger, gifts] = await Promise.all([
    Referral.find({ referrer: user._id }).sort({ createdAt: -1 }).limit(200).lean(),
    creditBalance(user._id),
    reservedCredit(user._id),
    ledgerFor(user._id, 50),
    giftOverview(user._id),
  ])
  const count = (...statuses) => referrals.filter((r) => statuses.includes(r.status)).length
  const pendingPaise = referrals.filter((r) => r.status === 'pending').length * growth.REFERRER_CREDIT
  return {
    code,
    invited: referrals.length,
    paid: count('pending', 'granted'),
    pendingRewards: count('pending'),
    pendingCredit: pendingPaise / 100,
    gifts,
    balance: Math.max(0, balance - reserved) / 100,
    ledger: ledger.map((entry) => ({
      id: String(entry._id),
      type: entry.type,
      amount: entry.amountPaise / 100,
      note: entry.note,
      createdAt: entry.createdAt,
    })),
    rules: {
      friendDiscount: growth.FRIEND_DISCOUNT / 100,
      referrerCredit: growth.REFERRER_CREDIT / 100,
      refundWindowDays: growth.REFUND_WINDOW_DAYS,
      monthlyCap: growth.REFERRAL_MONTHLY_CAP,
    },
  }
}
