import mongoose from 'mongoose'

const accessLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    action: { type: String, enum: ['download', 'denied', 'rate_limited', 'suspicious'], required: true },
    ip: String,
    userAgent: { type: String, maxlength: 300 },
    note: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

accessLogSchema.index({ user: 1, action: 1, createdAt: -1 })

export const AccessLog = mongoose.model('AccessLog', accessLogSchema)
