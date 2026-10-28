import mongoose from 'mongoose'

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: String,
    processed: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema)
