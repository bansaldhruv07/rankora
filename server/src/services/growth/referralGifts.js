import { growth } from '../../config/growth.js'
import { Order } from '../../models/Order.js'
import { Referral } from '../../models/Referral.js'
import { ReferralGift } from '../../models/ReferralGift.js'
import { conflict, notFound } from '../../utils/AppError.js'

// Gift cards for students whose friends keep buying. A friend counts once, through their first paid order, once the
// refund window has passed and the order was not refunded. One pack counts as 1; the all-subjects pack counts more.

const ELIGIBLE_REFERRALS = ['granted', 'capped'] // capped = paid through the link but past the monthly credit cap

const slugsOf = (order) => [order.productSlug, ...(order.items ?? []).map((item) => item.slug)].filter(Boolean).map((slug) => slug.toLowerCase())

// How many "friends" this order is worth.
export function pointsForOrder(order) {
  return slugsOf(order).some((slug) => growth.BIG_PACK_SLUGS.includes(slug)) ? growth.BIG_PACK_POINTS : 1
}

// The student's friends that count today, oldest first, with the points and the amount each paid.
async function countedFriends(referrerId, now) {
  const referrals = await Referral.find({ referrer: referrerId, status: { $in: ELIGIBLE_REFERRALS }, eligibleAt: { $lte: now } })
    .select('firstOrder eligibleAt')
    .sort({ eligibleAt: 1, _id: 1 })
    .lean()
  if (referrals.length === 0) return []
  const orders = await Order.find({ _id: { $in: referrals.map((r) => r.firstOrder) }, status: 'paid' })
    .select('amountPaise productSlug items.slug')
    .lean()
  const byId = new Map(orders.map((o) => [String(o._id), o]))
  return referrals
    .map((r) => ({ order: byId.get(String(r.firstOrder)), at: r.eligibleAt }))
    .filter((r) => r.order)
    .map((r) => ({ points: pointsForOrder(r.order), paidPaise: r.order.amountPaise, at: r.at }))
}

// Where the student stands: total points, and for every tier whether it is reached and what its gift is worth.
// A tier's gift is `percent`% of what the friends paid between the previous tier and this one, rounded down to whole
// rupees, so all gifts together never exceed that percentage of what friends paid.
export function tiersFor(friends) {
  let points = 0
  let paid = 0
  const marks = [] // [points, paid so far] after each friend
  for (const friend of friends) {
    points += friend.points
    paid += friend.paidPaise
    marks.push([points, paid])
  }
  let previousPaid = 0
  const tiers = growth.GIFT_TIERS.map((tier) => {
    const hit = marks.find(([pts]) => pts >= tier.friends)
    const basisPaise = (hit ? hit[1] : paid) - previousPaid
    const valuePaise = Math.floor((basisPaise * tier.percent) / 10000) * 100
    const result = { friends: tier.friends, percent: tier.percent, reached: Boolean(hit), basisPaise, valuePaise }
    if (hit) previousPaid = hit[1]
    return result
  })
  return { points, paidPaise: paid, tiers }
}

// Creates a gift as "eligible" the first time a tier is reached. A refund that drops the student back below a tier
// whose gift is still only "eligible" sets it to "not_eligible"; an approved or issued gift is never touched.
export async function evaluateGifts(referrerId, now = new Date()) {
  const standing = tiersFor(await countedFriends(referrerId, now))
  const existing = new Map((await ReferralGift.find({ referrer: referrerId })).map((g) => [g.tier, g]))
  for (const tier of standing.tiers) {
    const gift = existing.get(tier.friends)
    if (tier.reached) {
      if (!gift) {
        try {
          await ReferralGift.create({ referrer: referrerId, tier: tier.friends, percent: tier.percent, basisPaise: tier.basisPaise, valuePaise: tier.valuePaise, status: 'eligible', reachedAt: now })
        } catch (err) {
          if (err?.code !== 11000) throw err
        }
      } else if (gift.status === 'eligible' || gift.status === 'not_eligible') {
        await ReferralGift.updateOne(
          { _id: gift._id, status: { $in: ['eligible', 'not_eligible'] } },
          { $set: { status: 'eligible', percent: tier.percent, basisPaise: tier.basisPaise, valuePaise: tier.valuePaise, ...(gift.status === 'not_eligible' ? { reachedAt: now } : {}) } },
        )
      }
    } else if (gift?.status === 'eligible') {
      await ReferralGift.updateOne({ _id: gift._id, status: 'eligible' }, { $set: { status: 'not_eligible' } })
    }
  }
  return standing
}

export async function evaluateAllGifts(now = new Date()) {
  const referrers = await Referral.distinct('referrer', { status: { $in: ELIGIBLE_REFERRALS } })
  for (const id of referrers) await evaluateGifts(id, now)
  return referrers.length
}

// What the /refer page shows: progress to each tier and the state of every gift.
export async function giftOverview(referrerId, now = new Date()) {
  const standing = await evaluateGifts(referrerId, now)
  const gifts = new Map((await ReferralGift.find({ referrer: referrerId })).map((g) => [g.tier, g]))
  const waiting = await Referral.find({ referrer: referrerId, status: 'pending' }).select('firstOrder').lean()
  const waitingOrders = waiting.length ? await Order.find({ _id: { $in: waiting.map((r) => r.firstOrder) }, status: 'paid' }).select('productSlug items.slug').lean() : []
  const waitingPoints = waitingOrders.reduce((sum, order) => sum + pointsForOrder(order), 0)

  const tiers = standing.tiers.map((tier) => {
    const gift = gifts.get(tier.friends)
    const live = gift && gift.status !== 'not_eligible'
    const state = live ? (gift.status === 'eligible' ? 'unlocked' : gift.status) : 'locked' // locked | unlocked | approved | issued
    return {
      friends: tier.friends,
      percent: tier.percent,
      state,
      value: (live ? gift.valuePaise : tier.valuePaise) / 100,
    }
  })
  const next = tiers.find((tier) => tier.state === 'locked') ?? null
  return {
    points: standing.points,
    waitingPoints,
    bigPackPoints: growth.BIG_PACK_POINTS,
    tiers,
    next: next ? { friends: next.friends, left: Math.max(0, next.friends - standing.points), valueSoFar: next.value } : null,
  }
}

// ---- admin ---------------------------------------------------------------------------------------------------------

export async function approveGift(giftId, adminId, now = new Date()) {
  const gift = await ReferralGift.findOneAndUpdate({ _id: giftId, status: 'eligible' }, { $set: { status: 'approved', approvedAt: now, approvedBy: adminId } }, { returnDocument: 'after' })
  if (!gift) {
    const exists = await ReferralGift.exists({ _id: giftId })
    throw exists ? conflict('Only an unlocked gift can be approved.') : notFound('Gift not found')
  }
  return gift
}

export async function issueGift(giftId, adminId, note, now = new Date()) {
  const gift = await ReferralGift.findOneAndUpdate({ _id: giftId, status: 'approved' }, { $set: { status: 'issued', issuedAt: now, issuedBy: adminId, note } }, { returnDocument: 'after' })
  if (!gift) {
    const exists = await ReferralGift.exists({ _id: giftId })
    throw exists ? conflict('Approve the gift before marking it issued.') : notFound('Gift not found')
  }
  return gift
}
