import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { adminAgent, buy, client, makeProduct, registerUser, resetDb, sign, startDb, stopDb, webhook } from './helpers.js'

const capturedEvent = (order, amount, paymentId = 'pay_wh_1') => ({
  event: 'payment.captured',
  payload: { payment: { entity: { id: paymentId, order_id: order.providerOrderId, amount, currency: 'INR' } } },
})

async function createOrder(agent, slug) {
  const res = await agent.post('/api/orders').send({ product: slug })
  const { Order } = await import('../src/models/Order.js')
  return { res, order: await Order.findById(res.body.data.order.id) }
}

describe('orders, payments and webhooks', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('prices orders from the database and ignores client-supplied amounts', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { res } = await createOrder(agent, 'paid-note')
    assert.equal(res.status, 201)
    const forged = await agent.post('/api/orders').send({ product: 'paid-note', amount: 1, price: 1 })
    assert.equal(forged.body.data.checkout.amountPaise, 9900)
    assert.equal(res.body.data.order.status, 'pending')
    // Repeated request reuses the open order.
    assert.equal(forged.body.data.order.id, res.body.data.order.id)
  })

  it('refuses to sell free, draft or unknown products', async () => {
    await makeProduct({ slug: 'free-note', price: 0 })
    await makeProduct({ slug: 'draft-note', status: 'draft' })
    const { agent } = await registerUser()
    assert.equal((await agent.post('/api/orders').send({ product: 'free-note' })).status, 400)
    assert.equal((await agent.post('/api/orders').send({ product: 'draft-note' })).status, 404)
    assert.equal((await agent.post('/api/orders').send({ product: 'nope' })).status, 404)
  })

  it('rejects forged payment success and grants nothing', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { order } = await createOrder(agent, 'paid-note')
    const bad = await agent.post('/api/payments/verify').send({ orderId: String(order._id), razorpay_payment_id: 'pay_fake', razorpay_signature: 'f'.repeat(64) })
    assert.equal(bad.status, 400)
    // Signature made for a different order must not work either.
    const wrongOrderSig = sign('order_other|pay_fake')
    assert.equal((await agent.post('/api/payments/verify').send({ orderId: String(order._id), razorpay_payment_id: 'pay_fake', razorpay_signature: wrongOrderSig })).status, 400)
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 403)
    assert.equal((await agent.get(`/api/orders/${order._id}`)).body.data.status, 'pending')
  })

  it('completes a genuine purchase and is idempotent on repeat verify', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { orderId, verified, payment } = await buy(agent, 'paid-note')
    assert.equal(verified.body.data.order.status, 'paid')
    const again = await agent.post('/api/payments/verify').send({ orderId, ...payment })
    assert.equal(again.status, 200)
    const { Payment } = await import('../src/models/Payment.js')
    const { Entitlement } = await import('../src/models/Entitlement.js')
    assert.equal(await Payment.countDocuments(), 1)
    assert.equal(await Entitlement.countDocuments(), 1)
    // Owning the note blocks a second purchase.
    assert.equal((await agent.post('/api/orders').send({ product: 'paid-note' })).status, 409)
  })

  it("hides other users' orders and payment endpoints (IDOR)", async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const owner = (await registerUser()).agent
    const attacker = (await registerUser()).agent
    const { order } = await createOrder(owner, 'paid-note')
    assert.equal((await attacker.get(`/api/orders/${order._id}`)).status, 404)
    assert.equal((await attacker.post(`/api/orders/${order._id}/cancel`)).status, 404)
    assert.equal((await attacker.post('/api/payments/mock/complete').send({ orderId: String(order._id) })).status, 404)
    assert.equal((await attacker.get('/api/orders')).body.data.length, 0)
    assert.equal((await attacker.get('/api/orders/not-an-id')).status, 404)
    // Valid signature, but the order belongs to someone else.
    const sig = sign(`${order.providerOrderId}|pay_x`)
    assert.equal((await attacker.post('/api/payments/verify').send({ orderId: String(order._id), razorpay_payment_id: 'pay_x', razorpay_signature: sig })).status, 404)
  })

  it('cancels a pending order', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { order } = await createOrder(agent, 'paid-note')
    assert.equal((await agent.post(`/api/orders/${order._id}/cancel`)).body.data.status, 'cancelled')
    assert.equal((await agent.post(`/api/orders/${order._id}/cancel`)).status, 404)
  })

  it('rejects webhooks with a bad or missing signature', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { order } = await createOrder(agent, 'paid-note')
    const event = capturedEvent(order, 9900)
    assert.equal((await webhook(event, { secret: 'wrong-secret' })).status, 400)
    assert.equal((await webhook(event, { signature: '' })).status, 400)
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 403)
  })

  it('processes a signed webhook once and treats a duplicate event id as a no-op', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { order } = await createOrder(agent, 'paid-note')
    const event = capturedEvent(order, 9900)
    const first = await webhook(event, { id: 'evt_1' })
    assert.equal(first.status, 200)
    assert.equal(first.body.data.received, true)
    const dup = await webhook(event, { id: 'evt_1' })
    assert.equal(dup.body.data.duplicate, true)
    // Same payment under a new event id is still idempotent.
    assert.equal((await webhook(event, { id: 'evt_2' })).status, 200)
    const { Payment } = await import('../src/models/Payment.js')
    const { Entitlement } = await import('../src/models/Entitlement.js')
    assert.equal(await Payment.countDocuments(), 1)
    assert.equal(await Entitlement.countDocuments(), 1)
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 200)
  })

  it('does not grant access when the webhook amount differs from the order', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { order } = await createOrder(agent, 'paid-note')
    assert.equal((await webhook(capturedEvent(order, 100))).status, 200)
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 403)
    assert.equal((await agent.get(`/api/orders/${order._id}`)).body.data.status, 'pending')
  })

  it('marks an order failed on payment.failed, and a later capture still succeeds', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { order } = await createOrder(agent, 'paid-note')
    await webhook({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_f', order_id: order.providerOrderId } } } })
    assert.equal((await agent.get(`/api/orders/${order._id}`)).body.data.status, 'failed')
    await webhook(capturedEvent(order, 9900, 'pay_retry'))
    assert.equal((await agent.get(`/api/orders/${order._id}`)).body.data.status, 'paid')
  })

  it('refunds via admin: order refunded, access revoked, duplicate refund webhook ignored', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { orderId, payment } = await buy(agent, 'paid-note')
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 200)

    assert.equal((await agent.post(`/api/admin/orders/${orderId}/refund`).send({})).status, 403)
    const admin = await adminAgent()
    const refunded = await admin.post(`/api/admin/orders/${orderId}/refund`).send({ reason: 'requested by student' })
    assert.equal(refunded.status, 200)
    assert.equal(refunded.body.data.status, 'refunded')
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 403)
    assert.equal((await admin.post(`/api/admin/orders/${orderId}/refund`).send({})).status, 409)

    const { Payment } = await import('../src/models/Payment.js')
    const row = await Payment.findOne({ providerPaymentId: payment.razorpay_payment_id })
    assert.equal(row.status, 'refunded')
    const refundEvent = { event: 'refund.processed', payload: { refund: { entity: { id: row.refundIds[0], payment_id: row.providerPaymentId, amount: 9900 } } } }
    assert.equal((await webhook(refundEvent)).status, 200)
    assert.equal((await Payment.findById(row._id)).refundedPaise, 9900)
  })

  it('revokes access from a gateway-initiated refund webhook; partial refunds keep access', async () => {
    await makeProduct({ slug: 'paid-note', price: 100 })
    const { agent } = await registerUser()
    const { payment } = await buy(agent, 'paid-note')
    const refundOf = (id, amount) => ({ event: 'refund.processed', payload: { refund: { entity: { id, payment_id: payment.razorpay_payment_id, amount } } } })
    await webhook(refundOf('rfnd_a', 4000))
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 200)
    await webhook(refundOf('rfnd_b', 6000))
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 403)
  })

  it('exposes payment health and rejects unknown routes safely', async () => {
    assert.equal((await client().get('/api/health')).status, 200)
    const missing = await client().get('/api/nope')
    assert.equal(missing.status, 404)
    assert.equal(missing.body.success, false)
  })
})
