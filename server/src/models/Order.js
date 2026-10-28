import mongoose from 'mongoose'

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded']

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot so history stays correct if the product is later edited.
    productTitle: { type: String, required: true },
    productKind: { type: String, enum: ['note', 'plan'], required: true },
    planDays: Number,
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

orderSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    productId: String(this.product?._id ?? this.product),
    productTitle: this.productTitle,
    kind: this.productKind,
    amount: this.amountPaise / 100,
    currency: this.currency,
    status: this.status,
    paidAt: this.paidAt,
    refundedAt: this.refundedAt,
    createdAt: this.createdAt,
  }
}

export const Order = mongoose.model('Order', orderSchema)
