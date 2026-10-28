import mongoose from 'mongoose'

// One row per provider payment. No card or UPI details are stored.
const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true },
    providerPaymentId: { type: String, required: true, unique: true },
    providerOrderId: { type: String, required: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['captured', 'partially_refunded', 'refunded'], required: true },
    refundedPaise: { type: Number, default: 0 },
    refundIds: [String],
    source: { type: String, enum: ['verify', 'webhook'] },
  },
  { timestamps: true },
)

export const Payment = mongoose.model('Payment', paymentSchema)
