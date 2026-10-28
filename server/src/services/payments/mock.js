import crypto from 'node:crypto'
import { hmac, safeEqualHex } from './razorpay.js'

// Sandbox provider for local development without gateway credentials. It signs and verifies
// exactly like Razorpay so the verification code path is the same. Refused in production.
export function createMockProvider(secret) {
  return {
    name: 'mock',
    publicKey: 'mock_key',
    async createOrder() {
      return { id: `order_mock_${crypto.randomBytes(8).toString('hex')}` }
    },
    verifyPaymentSignature({ providerOrderId, paymentId, signature }) {
      return safeEqualHex(hmac(secret, `${providerOrderId}|${paymentId}`), signature)
    },
    verifyWebhookSignature(rawBody, signature) {
      return safeEqualHex(hmac(secret, rawBody), signature)
    },
    async refund() {
      return { id: `rfnd_mock_${crypto.randomBytes(8).toString('hex')}` }
    },
    // Stand-in for the checkout popup: what the gateway would return after a successful payment.
    simulateCheckout(providerOrderId) {
      const paymentId = `pay_mock_${crypto.randomBytes(8).toString('hex')}`
      return { paymentId, signature: hmac(secret, `${providerOrderId}|${paymentId}`) }
    },
  }
}
