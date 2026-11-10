import { Order } from '../../models/Order.js'
import { logger } from '../../utils/logger.js'
import { evaluateMilestones } from './milestones.js'
import { evaluateAllGifts } from './referralGifts.js'
import { releaseDueRewards } from './referrals.js'
import { releaseDueCommissions } from './sales.js'

// Time-based transitions: referral rewards become credit, commissions become payable and milestones are re-counted
// once the refund window has passed. Everything is idempotent. It runs from a timer in server.js and, throttled, when
// a page that shows the numbers is opened, so nothing depends on the timer alone.
export async function runGrowthMaintenance(now = new Date()) {
  const rewards = await releaseDueRewards(now)
  const commissions = await releaseDueCommissions(now)
  const teacherIds = await Order.distinct('teacherId', { teacherId: { $exists: true }, saleConfirmedAt: { $exists: true } })
  for (const id of teacherIds) await evaluateMilestones(id, now)
  const referrers = await evaluateAllGifts(now)
  return { rewards, commissions, teachers: teacherIds.length, referrers }
}

let lastRun = 0
export async function maintainIfDue(minGapMs = 60_000) {
  const now = Date.now()
  if (now - lastRun < minGapMs) return
  lastRun = now
  try {
    await runGrowthMaintenance(new Date(now))
  } catch (err) {
    logger.warn('growth maintenance failed', { error: err.message })
  }
}
