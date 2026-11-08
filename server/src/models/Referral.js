import mongoose from 'mongoose'

// attached    the friend has the referrer's code and has not paid yet
// pending     the friend paid (webhook confirmed); the reward waits out the refund window
// granted     the credit was given to the referrer
// reversed    the friend's order was refunded, so the reward is void (or its credit was taken back)
// superseded  the friend's first order used a teacher code or another discount, so the referrer gets nothing
// capped      the referrer hit the monthly cap, so no credit
export const REFERRAL_STATUSES = ['attached', 'pending', 'granted', 'reversed', 'superseded', 'capped']

// One row per referred user, so a friend can only ever produce one reward.
const referralSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referred: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    code: { type: String, required: true, uppercase: true },
    status: { type: String, enum: REFERRAL_STATUSES, default: 'attached' },
    firstOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    paidAt: Date,
    eligibleAt: Date,
    grantedAt: Date,
    reason: { type: String, maxlength: 100 },
  },
  { timestamps: true },
)

export const Referral = mongoose.model('Referral', referralSchema)
