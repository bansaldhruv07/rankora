import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { requireAuth } from '../middleware/auth.js'
import { paymentLimiter } from '../middleware/security.js'
import { Order } from '../models/Order.js'
import { accessSummary } from '../services/entitlements.js'
import { getProvider } from '../services/payments/index.js'
import { settlePaid } from '../services/settlement.js'
import { AppError, badRequest, notFound } from '../utils/AppError.js'
import { asyncHandler, assertObjectId, ok, parse } from '../utils/http.js'

const router = Router()
router.use(requireAuth, paymentLimiter)

const verifySchema = z.object({
  orderId: z.string(),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
})

// Verifies the checkout signature with the provider order id stored on OUR order.
// The client's claim of success is never trusted on its own.
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const body = parse(verifySchema, req.body)
    const order = await Order.findOne({ _id: assertObjectId(body.orderId), user: req.user._id })
    if (!order || !order.providerOrderId) throw notFound('Order not found')

    const valid = getProvider().verifyPaymentSignature({
      providerOrderId: order.providerOrderId,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    })
    if (!valid) throw badRequest('Payment verification failed')

    const result = await settlePaid(order, {
      paymentId: body.razorpay_payment_id,
      amountPaise: order.amountPaise,
      currency: order.currency,
      source: 'verify',
    })
    if (!result.granted) throw new AppError(409, 'CONFLICT', 'Payment could not be applied to this order')
    const fresh = await Order.findById(order._id)
    ok(res, { order: fresh.toPublic(), access: await accessSummary(req.user._id) })
  }),
)

// Sandbox only: stands in for the gateway popup when running with the mock provider.
router.post(
  '/mock/complete',
  asyncHandler(async (req, res) => {
    const provider = getProvider()
    if (provider.name !== 'mock' || env.isProd) throw notFound()
    const { orderId } = parse(z.object({ orderId: z.string() }), req.body)
    const order = await Order.findOne({ _id: assertObjectId(orderId), user: req.user._id, status: 'pending' })
    if (!order) throw notFound('No pending order found')
    const { paymentId, signature } = provider.simulateCheckout(order.providerOrderId)
    ok(res, { razorpay_payment_id: paymentId, razorpay_signature: signature })
  }),
)

export default router
