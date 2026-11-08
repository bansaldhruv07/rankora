// Settings for the referral ("refer and earn") and offline teacher programs.
//
// Money is always integer paise. Every rate and amount below is a constant in this file (overridable from the
// environment) and nothing else in the code hard-codes a rate. The object is mutable on purpose: tests change it.
//
//   REFERRALS_ENABLED=true            turns refer-and-earn on (default off)
//   TEACHER_PROGRAM_ENABLED=true      turns the offline teacher program on (default off)

const int = (value, fallback) => {
  if (value === undefined || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}
const flag = (value) => value === 'true' || value === '1'

// Teachers earn a one-off gift when their number of unique paying students reaches a milestone. `partnerTeacher`
// also flags the teacher as a "Partner Teacher" once an admin approves that milestone. Values are in paise.
export const DEFAULT_MILESTONES = [
  { students: 50, giftValuePaise: 50000, partnerTeacher: false },
  { students: 100, giftValuePaise: 150000, partnerTeacher: false },
  { students: 250, giftValuePaise: 500000, partnerTeacher: false },
  { students: 500, giftValuePaise: 1200000, partnerTeacher: true },
]

function readMilestones(raw) {
  if (!raw) return DEFAULT_MILESTONES
  try {
    const list = JSON.parse(raw)
    const valid = Array.isArray(list) && list.every((m) => Number.isInteger(m.students) && m.students > 0 && Number.isInteger(m.giftValuePaise) && m.giftValuePaise >= 0)
    return valid ? list.map((m) => ({ partnerTeacher: false, ...m })).sort((a, b) => a.students - b.students) : DEFAULT_MILESTONES
  } catch {
    return DEFAULT_MILESTONES
  }
}

export const growth = {
  referralsEnabled: flag(process.env.REFERRALS_ENABLED),
  teachersEnabled: flag(process.env.TEACHER_PROGRAM_ENABLED),

  // Refer and earn
  FRIEND_DISCOUNT: int(process.env.FRIEND_DISCOUNT, 5000), // paise off the friend's first paid order
  REFERRER_CREDIT: int(process.env.REFERRER_CREDIT, 5000), // paise of store credit for the referrer
  REFERRAL_MONTHLY_CAP: int(process.env.REFERRAL_MONTHLY_CAP, 10), // rewards one referrer can earn per calendar month

  // Offline teachers
  TEACHER_STUDENT_DISCOUNT_PERCENT: int(process.env.TEACHER_STUDENT_DISCOUNT_PERCENT, 15),
  TEACHER_COMMISSION_PERCENT: int(process.env.TEACHER_COMMISSION_PERCENT, 20),
  MILESTONES: readMilestones(process.env.TEACHER_MILESTONES),

  // Shared
  REFUND_WINDOW_DAYS: int(process.env.REFUND_WINDOW_DAYS, 7),
  ATTRIBUTION_DAYS: int(process.env.ATTRIBUTION_DAYS, 30), // how long a /?t= or /?ref= link is remembered
}

export const refundWindowMs = () => growth.REFUND_WINDOW_DAYS * 86400000

// Problems with these values would silently misprice orders, so they stop the server from starting.
export function growthProblems() {
  const problems = []
  const money = ['FRIEND_DISCOUNT', 'REFERRER_CREDIT']
  for (const key of money) if (!Number.isInteger(growth[key]) || growth[key] < 0) problems.push(`${key} must be a whole number of paise (0 or more)`)
  for (const key of ['TEACHER_STUDENT_DISCOUNT_PERCENT', 'TEACHER_COMMISSION_PERCENT']) {
    if (!Number.isInteger(growth[key]) || growth[key] < 0 || growth[key] > 90) problems.push(`${key} must be a whole number from 0 to 90`)
  }
  if (!Number.isInteger(growth.REFUND_WINDOW_DAYS) || growth.REFUND_WINDOW_DAYS < 0) problems.push('REFUND_WINDOW_DAYS must be 0 or more')
  if (!Number.isInteger(growth.REFERRAL_MONTHLY_CAP) || growth.REFERRAL_MONTHLY_CAP < 1) problems.push('REFERRAL_MONTHLY_CAP must be at least 1')
  return problems
}
