import mongoose from 'mongoose'

const supportMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    adminNote: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
)

supportMessageSchema.index({ status: 1, createdAt: -1 })
supportMessageSchema.index({ user: 1, createdAt: -1 })

export const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema)
