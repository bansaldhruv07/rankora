import mongoose from 'mongoose'

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded']

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot so history stays correct if the product is later edited.
    productTitle: { type: String, required: true },
    productSlug: String,
    productKind: { type: String, enum: ['note', 'bundle', 'plan'], required: true },
    planDays: Number,
    // Price before any coupon, the discount applied, and the amount actually charged (amountPaise).
    listAmountPaise: { type: Number, min: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true, trim: true },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    provider: { type: String, enum: ['razorpay', 'mock'], required: true },
    providerOrderId: { type: String, unique: true, sparse: true },
    paidAt: Date,
    refundedAt: Date,
    refundReason: { type: String, maxlength: 300 },
  },
  { timestamps: true },
)

orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ user: 1, product: 1, status: 1 })
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ couponCode: 1, status: 1 }, { sparse: true })
orderSchema.index({ product: 1, status: 1 })

orderSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    reference: `RK-${String(this._id).slice(-8).toUpperCase()}`,
    productId: String(this.product?._id ?? this.product),
    productSlug: this.productSlug,
    productTitle: this.productTitle,
    kind: this.productKind,
    amount: this.amountPaise / 100,
    listAmount: (this.listAmountPaise ?? this.amountPaise) / 100,
    discount: (this.discountPaise ?? 0) / 100,
    couponCode: this.couponCode,
    currency: this.currency,
    status: this.status,
    paidAt: this.paidAt,
    refundedAt: this.refundedAt,
    createdAt: this.createdAt,
  }
}

export const Order = mongoose.model('Order', orderSchema)
