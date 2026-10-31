import mongoose from 'mongoose'

const readingProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    page: { type: Number, required: true, min: 1 },
    pages: { type: Number, min: 1 },
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

readingProgressSchema.index({ user: 1, product: 1 }, { unique: true })
readingProgressSchema.index({ user: 1, lastReadAt: -1 })

export const ReadingProgress = mongoose.model('ReadingProgress', readingProgressSchema)
