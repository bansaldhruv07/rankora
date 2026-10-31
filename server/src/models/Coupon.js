import mongoose from 'mongoose'

// A code-based discount. Redemptions are counted from orders (paid, or pending and still open),
// so there is no separate counter to drift out of sync.
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,30}$/ },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    type: { type: String, enum: ['percent', 'flat'], required: true },
    // percent: 1-90. flat: amount in paise.
    value: { type: Number, required: true, min: 1 },
    maxDiscountPaise: { type: Number, min: 1 },
    minOrderPaise: { type: Number, min: 0, default: 0 },
    validFrom: Date,
    validUntil: Date,
    usageLimit: { type: Number, min: 1 },
    perUserLimit: { type: Number, min: 1, default: 1 },
    // Empty = every note, bundle and plan.
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

couponSchema.pre('validate', function checkValue() {
  if (this.type === 'percent' && this.value > 90) this.invalidate('value', 'Percentage discount cannot exceed 90')
})

export const Coupon = mongoose.model('Coupon', couponSchema)
