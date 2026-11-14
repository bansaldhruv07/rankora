import mongoose from 'mongoose'

export const GIFT_STATUSES = ['not_eligible', 'eligible', 'approved', 'issued']

// A refer-and-earn gift card. Created as "eligible" when a student's friends reach a tier; an admin approves it and
// later marks it issued (with the card details in the note). Nothing is sent automatically. One per student per tier.
// valuePaise is the tier's fixed value, copied here when the tier is reached.
const referralGiftSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tier: { type: Number, required: true, min: 1 },
    // Older gifts were a percentage of what friends paid; current ones are a fixed value.
    percent: { type: Number, default: 0, min: 0, max: 100 },
    basisPaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    valuePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    status: { type: String, enum: GIFT_STATUSES, default: 'eligible' },
    reachedAt: { type: Date, default: Date.now },
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedAt: Date,
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true },
)
referralGiftSchema.index({ referrer: 1, tier: 1 }, { unique: true })
referralGiftSchema.index({ status: 1, reachedAt: -1 })

export const ReferralGift = mongoose.model('ReferralGift', referralGiftSchema)
