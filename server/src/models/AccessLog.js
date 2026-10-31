import mongoose from 'mongoose'

// `download` is kept only so historical rows stay readable; the reader writes `open`/`preview`.
export const ACCESS_ACTIONS = ['open', 'preview', 'denied', 'rate_limited', 'suspicious', 'revoked', 'download']

const accessLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    action: { type: String, enum: ACCESS_ACTIONS, required: true },
    ip: String,
    userAgent: { type: String, maxlength: 300 },
    note: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

accessLogSchema.index({ user: 1, action: 1, createdAt: -1 })
accessLogSchema.index({ action: 1, createdAt: -1 })
accessLogSchema.index({ product: 1, action: 1, createdAt: -1 })

export const AccessLog = mongoose.model('AccessLog', accessLogSchema)
