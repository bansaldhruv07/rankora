import mongoose from 'mongoose'

// One reading session. The opaque token is shown to the client once; only its hash is stored.
//  mode 'full'    -> the whole document, personalised, requires the owning student's login as well
//  mode 'preview' -> the free sample extract, token only
//  mode 'admin'   -> admin preview of a draft or any note, requires the admin login
const viewerSessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    mode: { type: String, enum: ['full', 'preview', 'admin'], required: true },
    orderRef: String,
    fileVersion: Number,
    derivedKey: String,
    pages: Number,
    fileSize: Number,
    ip: String,
    userAgent: { type: String, maxlength: 300 },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    revokedReason: String,
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    hardExpiresAt: { type: Date, required: true },
    bytesServed: { type: Number, default: 0 },
  },
  { timestamps: true },
)

viewerSessionSchema.index({ user: 1, status: 1, createdAt: 1 })
viewerSessionSchema.index({ status: 1, expiresAt: 1 })
// Rows disappear a week after they stop being usable; the access log keeps the long-term trail.
viewerSessionSchema.index({ hardExpiresAt: 1 }, { expireAfterSeconds: 7 * 86400 })

export const ViewerSession = mongoose.model('ViewerSession', viewerSessionSchema)
