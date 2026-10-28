import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { env } from '../../config/env.js'
import { AppError } from '../../utils/AppError.js'

export const hmac = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex')

export function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// Razorpay Orders API. Amounts are integers in paise.
export function createRazorpayProvider({ keyId, keySecret, webhookSecret }) {
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret })
  const wrap = (action) => action.catch((err) => {
    // SDK errors carry provider detail we do not forward to clients.
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'Payment provider request failed', undefined, err)
  })

  return {
    name: 'razorpay',
    publicKey: keyId,
    async createOrder({ amountPaise, currency, receipt }) {
      const order = await wrap(client.orders.create({ amount: amountPaise, currency, receipt }))
      return { id: order.id }
    },
    verifyPaymentSignature({ providerOrderId, paymentId, signature }) {
      return safeEqualHex(hmac(keySecret, `${providerOrderId}|${paymentId}`), signature)
    },
    verifyWebhookSignature(rawBody, signature) {
      return safeEqualHex(hmac(webhookSecret, rawBody), signature)
    },
    async refund({ paymentId, amountPaise, receipt }) {
      const refund = await wrap(client.payments.refund(paymentId, { amount: amountPaise, notes: { receipt } }))
      return { id: refund.id }
    },
  }
}

export const razorpayConfig = () => env.razorpay
