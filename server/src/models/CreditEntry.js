import mongoose from 'mongoose'

export const CREDIT_TYPES = ['referral_reward', 'reward_reversal', 'spend', 'spend_refund']

// The store-credit ledger. The balance is the sum of `amountPaise` (signed). Entries are never edited. Unique indexes
// make every posting idempotent: one reward / reversal per referral, one spend / spend refund per order.
const creditEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: CREDIT_TYPES, required: true },
    amountPaise: { type: Number, required: true, validate: Number.isInteger },
    referral: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    note: { type: String, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)
creditEntrySchema.index({ type: 1, referral: 1 }, { unique: true, partialFilterExpression: { referral: { $exists: true } } })
creditEntrySchema.index({ type: 1, order: 1 }, { unique: true, partialFilterExpression: { order: { $exists: true } } })

export const CreditEntry = mongoose.model('CreditEntry', creditEntrySchema)
