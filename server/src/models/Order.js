import mongoose from 'mongoose'

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded']

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot so history stays correct if the product is later edited.
    productTitle: { type: String, required: true },
    productSlug: String,
    // 'cart' = several notes bought together; `product` then points at the first of them and `items` lists all.
    productKind: { type: String, enum: ['note', 'bundle', 'plan', 'cart'], required: true },
    planDays: Number,
    items: [
      {
        _id: false,
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        title: String,
        slug: String,
        listPaise: Number,
      },
    ],
    // Part of discountPaise that came from buying several notes together (the rest is a coupon).
    volumeDiscountPaise: { type: Number, default: 0, min: 0 },
    // Price before any coupon, the discount applied, and the amount actually charged (amountPaise).
    listAmountPaise: { type: Number, min: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    // Only a coupon-source discount sets couponCode (usage limits count it). The fields below record the one source.
    couponCode: { type: String, uppercase: true, trim: true },
    discountSource: { type: String, enum: ['none', 'coupon', 'teacher', 'referral'], default: 'none' },
    // Fingerprint of what the student asked for (typed code, store credit, saved links). A repeated click with the same
    // fingerprint reuses the open order instead of pricing and creating another.
    offerKey: String,
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    teacherCode: { type: String, uppercase: true, trim: true },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral' },
    // Store credit spent on this order (not part of discountPaise): amountPaise = list - discount - credit.
    creditPaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    // Teacher commission. commissionPercent is the rate at order time; the amount is fixed when the webhook confirms payment.
    commissionPercent: { type: Number, min: 0, max: 100 },
    commissionPaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    commissionStatus: { type: String, enum: ['pending', 'payable', 'paid', 'reversed'] },
    commissionPayout: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherPayout' },
    // Set once, by the verified webhook, when teacher / referral sales were recorded for this order.
    saleConfirmedAt: Date,
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
orderSchema.index({ teacherId: 1, status: 1, paidAt: 1 }, { sparse: true })
orderSchema.index({ teacherId: 1, commissionStatus: 1 }, { sparse: true })

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
    volumeDiscount: (this.volumeDiscountPaise ?? 0) / 100,
    ...(this.productKind === 'cart' ? { items: this.items.map((i) => ({ slug: i.slug, title: i.title, price: (i.listPaise ?? 0) / 100 })) } : {}),
    couponCode: this.couponCode,
    discountSource: this.discountSource ?? 'none',
    credit: (this.creditPaise ?? 0) / 100,
    currency: this.currency,
    status: this.status,
    paidAt: this.paidAt,
    refundedAt: this.refundedAt,
    createdAt: this.createdAt,
  }
}

export const Order = mongoose.model('Order', orderSchema)
