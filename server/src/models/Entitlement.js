import mongoose from 'mongoose'

// Access right granted by exactly one paid order.
//  scope 'product'  -> access to `product` only
//  scope 'all-paid' -> access to every paid note until `expiresAt` (Premium plan)
const entitlementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    scope: { type: String, enum: ['product', 'all-paid'], required: true },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    expiresAt: Date,
    revokedAt: Date,
    revokedReason: String,
  },
  { timestamps: true },
)

entitlementSchema.index({ user: 1, status: 1, scope: 1, product: 1 })

export const Entitlement = mongoose.model('Entitlement', entitlementSchema)
