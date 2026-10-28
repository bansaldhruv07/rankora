import { Router } from 'express'
import { Order } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { WebhookEvent } from '../models/WebhookEvent.js'
import { getProvider } from '../services/payments/index.js'
import { applyRefund, markFailed, settlePaid } from '../services/settlement.js'
import { asyncHandler } from '../utils/http.js'
import { logger } from '../utils/logger.js'

const router = Router()

async function handleEvent(event) {
  const entity = event.payload?.payment?.entity
  switch (event.event) {
    case 'payment.captured':
    case 'order.paid': {
      const payment = entity ?? event.payload?.order?.entity
      const providerOrderId = entity?.order_id ?? event.payload?.order?.entity?.id
      const paymentId = entity?.id
      if (!providerOrderId || !paymentId) return
      const order = await Order.findOne({ providerOrderId })
      if (!order) return logger.warn('webhook for unknown order')
      await settlePaid(order, {
        paymentId,
        amountPaise: Number(payment.amount),
        currency: payment.currency ?? order.currency,
        source: 'webhook',
      })
      return
    }
    case 'payment.failed': {
      const order = entity?.order_id && (await Order.findOne({ providerOrderId: entity.order_id }))
      if (order) await markFailed(order)
      return
    }
    case 'refund.processed': {
      const refund = event.payload?.refund?.entity
      const payment = refund?.payment_id && (await Payment.findOne({ providerPaymentId: refund.payment_id }))
      if (payment) await applyRefund({ payment, refundId: refund.id, amountPaise: Number(refund.amount), reason: 'refund via gateway' })
      return
    }
    default:
  }
}

// Mounted with express.raw: the signature is computed over the exact bytes received.
router.post(
  '/razorpay',
  asyncHandler(async (req, res) => {
    const raw = req.body
    const signature = req.get('x-razorpay-signature')
    if (!Buffer.isBuffer(raw) || !signature || !getProvider().verifyWebhookSignature(raw, signature)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } })
    }

    let event
    try {
      event = JSON.parse(raw.toString('utf8'))
    } catch {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Malformed body' } })
    }

    const eventId = req.get('x-razorpay-event-id')
    if (!eventId) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing event id' } })

    // Duplicate deliveries are acknowledged without reprocessing. An event that was recorded
    // but never finished (crash) is processed again; all handlers are idempotent.
    const record = await WebhookEvent.findOneAndUpdate(
      { eventId },
      { $setOnInsert: { eventId, type: event.event } },
      { upsert: true, returnDocument: 'before' },
    )
    if (record?.processed) return res.json({ success: true, data: { duplicate: true } })

    await handleEvent(event)
    await WebhookEvent.updateOne({ eventId }, { $set: { processed: true } })
    res.json({ success: true, data: { received: true } })
  }),
)

export default router
