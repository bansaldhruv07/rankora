import mongoose from 'mongoose'

// Access right granted by exactly one paid order.
//  scope 'product'  -> access to `product` only
//  scope 'bundle'   -> access to every note in `products` (a snapshot taken at purchase; notes added
//                      to the bundle later are appended by the admin service, removals never revoke)
//  scope 'all-paid' -> access to every Premium-eligible note until `expiresAt` (Premium plan)
const entitlementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    scope: { type: String, enum: ['product', 'bundle', 'all-paid'], required: true },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    // 'cart' marks a bundle-scope grant that came from several notes bought together, not from a bundle product.
    via: String,
    expiresAt: Date,
    revokedAt: Date,
    revokedReason: String,
  },
  { timestamps: true },
)

entitlementSchema.index({ user: 1, status: 1, scope: 1, product: 1 })
entitlementSchema.index({ user: 1, status: 1, products: 1 })
entitlementSchema.index({ product: 1, scope: 1, status: 1 })

export const Entitlement = mongoose.model('Entitlement', entitlementSchema)
