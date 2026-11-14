import { growth } from '../../config/growth.js'
import { Order } from '../../models/Order.js'
import { Referral } from '../../models/Referral.js'
import { ReferralGift } from '../../models/ReferralGift.js'
import { conflict, notFound } from '../../utils/AppError.js'

// Gift cards for students whose friends buy full subjects. A friend counts through their FIRST paid order only (that is the
// one the referral is tied to): 1 point for a complete-subject pack, BIG_PACK_POINTS for the whole-JEE pack, and nothing
// for a single note or a topic pack. Each tier has a fixed gift value.

const COUNTED_REFERRALS = ['pending', 'granted', 'capped'] // capped = paid through the link but past the monthly credit cap

const slugsOf = (order) => [order.productSlug, ...(order.items ?? []).map((item) => item.slug)].filter(Boolean).map((slug) => slug.toLowerCase())

// How many "friends" this order is worth.
export function pointsForOrder(order) {
  const slugs = slugsOf(order)
  if (slugs.some((slug) => growth.BIG_PACK_SLUGS.includes(slug))) return growth.BIG_PACK_POINTS
  if (slugs.some((slug) => growth.SUBJECT_PACK_SLUGS.includes(slug))) return 1
  return 0
}

// The student's counted friends today, oldest first, with the points each is worth.
async function countedFriends(referrerId, now) {
  const referrals = await Referral.find({ referrer: referrerId, status: { $in: COUNTED_REFERRALS }, eligibleAt: { $lte: now } })
    .select('firstOrder eligibleAt')
    .sort({ eligibleAt: 1, _id: 1 })
    .lean()
  if (referrals.length === 0) return []
  const orders = await Order.find({ _id: { $in: referrals.map((r) => r.firstOrder) }, status: 'paid' })
    .select('productSlug items.slug')
    .lean()
  const byId = new Map(orders.map((o) => [String(o._id), o]))
  return referrals
    .map((r) => byId.get(String(r.firstOrder)))
    .filter(Boolean)
    .map((order) => ({ points: pointsForOrder(order) }))
    .filter((friend) => friend.points > 0)
}

// Where the student stands: total points, and for every tier whether it is reached and what its gift is worth.
export function tiersFor(friends) {
  const points = friends.reduce((sum, friend) => sum + friend.points, 0)
  const tiers = growth.GIFT_TIERS.map((tier) => ({ friends: tier.friends, valuePaise: tier.valuePaise, reached: points >= tier.friends }))
  return { points, tiers }
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
          await ReferralGift.create({ referrer: referrerId, tier: tier.friends, valuePaise: tier.valuePaise, status: 'eligible', reachedAt: now })
        } catch (err) {
          if (err?.code !== 11000) throw err
        }
      } else if (gift.status === 'eligible' || gift.status === 'not_eligible') {
        await ReferralGift.updateOne(
          { _id: gift._id, status: { $in: ['eligible', 'not_eligible'] } },
          { $set: { status: 'eligible', valuePaise: tier.valuePaise, ...(gift.status === 'not_eligible' ? { reachedAt: now } : {}) } },
        )
      }
    } else if (gift?.status === 'eligible') {
      await ReferralGift.updateOne({ _id: gift._id, status: 'eligible' }, { $set: { status: 'not_eligible' } })
    }
  }
  return standing
}

export async function evaluateAllGifts(now = new Date()) {
  const referrers = await Referral.distinct('referrer', { status: { $in: COUNTED_REFERRALS } })
  for (const id of referrers) await evaluateGifts(id, now)
  return referrers.length
}

// What the /refer page shows: progress to each tier and the state of every gift.
export async function giftOverview(referrerId, now = new Date()) {
  const standing = await evaluateGifts(referrerId, now)
  const gifts = new Map((await ReferralGift.find({ referrer: referrerId })).map((g) => [g.tier, g]))
  const waiting = await Referral.find({ referrer: referrerId, status: 'pending', eligibleAt: { $gt: now } }).select('firstOrder').lean()
  const waitingOrders = waiting.length ? await Order.find({ _id: { $in: waiting.map((r) => r.firstOrder) }, status: 'paid' }).select('productSlug items.slug').lean() : []
  const waitingPoints = waitingOrders.reduce((sum, order) => sum + pointsForOrder(order), 0)

  const tiers = standing.tiers.map((tier) => {
    const gift = gifts.get(tier.friends)
    const live = gift && gift.status !== 'not_eligible'
    const state = live ? (gift.status === 'eligible' ? 'unlocked' : gift.status) : 'locked' // locked | unlocked | approved | issued
    return { friends: tier.friends, state, value: (live ? gift.valuePaise : tier.valuePaise) / 100 }
  })
  const next = tiers.find((tier) => tier.state === 'locked') ?? null
  return {
    points: standing.points,
    waitingPoints,
    bigPackPoints: growth.BIG_PACK_POINTS,
    tiers,
    next: next ? { friends: next.friends, left: Math.max(0, next.friends - standing.points), value: next.value } : null,
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
