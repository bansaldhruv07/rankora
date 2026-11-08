import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { adminAgent, buy, client, makeProduct, openReader, registerUser, resetDb, staffAgent, startDb, stopDb } from './helpers.js'

const { Product } = await import('../src/models/Product.js')
const { Order } = await import('../src/models/Order.js')
const { Coupon } = await import('../src/models/Coupon.js')
const { Entitlement } = await import('../src/models/Entitlement.js')

const makeBundle = (slug, items, price) =>
  Product.create({ slug, title: `Bundle ${slug}`, kind: 'bundle', type: 'bundle', pricePaise: price * 100, status: 'published', bundleItems: items.map((p) => p._id) })

const checkout = async (agent, slug, coupon) => {
  const created = await agent.post('/api/orders').send({ product: slug, ...(coupon ? { coupon } : {}) })
  if (created.status >= 300) return { created }
  const orderId = created.body.data.order.id
  const proof = (await agent.post('/api/payments/mock/complete').send({ orderId })).body.data
  const verified = await agent.post('/api/payments/verify').send({ orderId, ...proof })
  return { created, orderId, verified }
}

describe('bundles', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('grants every included note, and shows them in the library as bundle content', async () => {
    const notes = await Promise.all(['a', 'b', 'c'].map((s) => makeProduct({ slug: `note-${s}`, price: 100 })))
    await makeBundle('pack', notes, 240)
    const { agent } = await registerUser()
    const { created, verified } = await checkout(agent, 'pack')
    assert.equal(created.body.data.order.amount, 240)
    assert.equal(verified.status, 200)
    for (const n of ['a', 'b', 'c']) assert.equal((await openReader(agent, `note-${n}`)).status, 201)
    const lib = (await agent.get('/api/library')).body.data
    assert.deepEqual(lib.items.map((i) => i.source), ['bundle', 'bundle', 'bundle'])
    const me = (await agent.get('/api/auth/me')).body.data.access
    assert.ok(['pack', 'note-a', 'note-b', 'note-c'].every((s) => me.productSlugs.includes(s)))
    assert.equal((await openReader((await registerUser()).agent, 'note-a')).status, 403)
  })

  it('refuses a bundle the student already fully owns, but sells it when only some is owned', async () => {
    const [a, b] = await Promise.all(['a', 'b'].map((s) => makeProduct({ slug: `note-${s}`, price: 100 })))
    await makeBundle('pair', [a, b], 150)
    const { agent } = await registerUser()
    await buy(agent, 'note-a')
    assert.equal((await agent.post('/api/orders').send({ product: 'pair' })).status, 201)
    await buy(agent, 'note-b')
    assert.equal((await agent.post('/api/orders').send({ product: 'pair' })).status, 409)
  })

  it('gives existing buyers notes added to the bundle later, and a refund removes only the bundle grant', async () => {
    const [a, b] = await Promise.all(['a', 'b'].map((s) => makeProduct({ slug: `note-${s}`, price: 100 })))
    const c = await makeProduct({ slug: 'note-c', price: 100 })
    const bundle = await makeBundle('pair', [a, b], 150)
    const { agent } = await registerUser()
    await buy(agent, 'note-a')
    const { orderId } = await checkout(agent, 'pair')
    assert.equal((await openReader(agent, 'note-c')).status, 403)

    const admin = await adminAgent()
    const patch = await admin.patch(`/api/admin/products/${bundle._id}`).send({ bundleItems: [a._id, b._id, c._id].map(String) })
    assert.equal(patch.status, 200)
    assert.equal((await openReader(agent, 'note-c')).status, 201, 'bundle buyers receive the new note')
    assert.equal((await admin.patch(`/api/admin/products/${bundle._id}`).send({ bundleItems: [String(a._id)] })).status, 200)
    assert.equal((await openReader(agent, 'note-b')).status, 201, 'removing a note never revokes access')

    assert.equal((await admin.post(`/api/admin/orders/${orderId}/refund`).send({})).status, 200)
    assert.equal((await openReader(agent, 'note-b')).status, 403)
    assert.equal((await openReader(agent, 'note-a')).status, 201, 'a separately bought note survives the bundle refund')
  })

  it('validates bundle contents and publishing rules', async () => {
    const admin = await adminAgent()
    const draft = await makeProduct({ slug: 'draft-note', price: 100, status: 'draft' })
    const live = await makeProduct({ slug: 'live-note', price: 100 })
    const other = await makeProduct({ slug: 'other-note', price: 100 })
    const bad = await admin.post('/api/admin/products').send({ title: 'Bad', kind: 'bundle', price: 50, bundleItems: ['507f1f77bcf86cd799439011'] })
    assert.equal(bad.status, 400, 'unknown note')
    const created = await admin.post('/api/admin/products').send({ title: 'Physics Pack', kind: 'bundle', price: 150, subject: 'physics', classLevel: 'both', bundleItems: [String(draft._id), String(live._id)] })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.premiumEligible, false)
    const id = created.body.data.id
    const blocked = await admin.post(`/api/admin/products/${id}/publish`)
    assert.equal(blocked.status, 409)
    assert.match(blocked.body.error.message, /Publish these notes first/)
    await admin.post(`/api/admin/products/${draft._id}/publish`).catch(() => {})
    await Product.updateOne({ _id: draft._id }, { status: 'published' })
    assert.equal((await admin.post(`/api/admin/products/${id}/publish`)).status, 200)
    assert.equal((await admin.patch(`/api/admin/products/${id}`).send({ bundleItems: [id] })).status, 400, 'a bundle cannot contain itself')
    assert.equal((await admin.patch(`/api/admin/products/${other._id}`).send({ bundleItems: [id] })).status, 400, 'only bundles have items')
    const nested = await admin.patch(`/api/admin/products/${id}`).send({ bundleItems: [id, String(live._id)] })
    assert.equal(nested.status, 400)
  })
})

describe('coupons and pricing', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  const coupon = (over = {}) => Coupon.create({ code: 'SAVE20', type: 'percent', value: 20, ...over })

  it('applies a percentage coupon on the server and records it on the order', async () => {
    await makeProduct({ slug: 'note', price: 200 })
    await coupon()
    const { agent } = await registerUser()
    const quote = await agent.post('/api/products/note/quote').send({ coupon: 'save20' })
    assert.deepEqual(quote.body.data, { list: 200, discount: 40, total: 160, couponCode: 'SAVE20', discountSource: 'coupon', discountLabel: 'Coupon SAVE20', notice: null, credit: 0, creditAvailable: 0 })
    const { created, verified, orderId } = await checkout(agent, 'note', 'save20')
    assert.equal(created.body.data.order.amount, 160)
    assert.equal(created.body.data.checkout.amountPaise, 16000)
    assert.equal(verified.status, 200)
    const order = await Order.findById(orderId)
    assert.equal(order.listAmountPaise, 20000)
    assert.equal(order.discountPaise, 4000)
    assert.equal(order.couponCode, 'SAVE20')
  })

  it('applies flat coupons and caps percentage coupons', async () => {
    await makeProduct({ slug: 'note', price: 500 })
    await coupon({ code: 'FLAT50', type: 'flat', value: 5000 })
    await coupon({ code: 'BIG', type: 'percent', value: 50, maxDiscountPaise: 3000 })
    const { agent } = await registerUser()
    assert.equal((await agent.post('/api/products/note/quote').send({ coupon: 'FLAT50' })).body.data.total, 450)
    assert.equal((await agent.post('/api/products/note/quote').send({ coupon: 'BIG' })).body.data.discount, 30)
  })

  it('never lets a coupon take the price below one rupee', async () => {
    await makeProduct({ slug: 'cheap', price: 49 })
    await coupon({ code: 'ALL', type: 'flat', value: 1000000 })
    const { agent } = await registerUser()
    const quote = await agent.post('/api/products/cheap/quote').send({ coupon: 'ALL' })
    assert.equal(quote.body.data.total, 1)
    assert.equal((await checkout(agent, 'cheap', 'ALL')).created.body.data.order.amount, 1)
  })

  it('rejects unknown, inactive, expired, not-yet-valid, restricted and under-minimum coupons', async () => {
    const note = await makeProduct({ slug: 'note', price: 100 })
    const other = await makeProduct({ slug: 'other', price: 100 })
    await coupon({ code: 'OFF', active: false })
    await coupon({ code: 'OLD', validUntil: new Date(Date.now() - 1000) })
    await coupon({ code: 'SOON', validFrom: new Date(Date.now() + 86400000) })
    await coupon({ code: 'ONLYOTHER', products: [other._id] })
    await coupon({ code: 'BIGSPEND', minOrderPaise: 50000 })
    const { agent } = await registerUser()
    for (const code of ['NOPE', 'OFF', 'OLD', 'SOON', 'ONLYOTHER', 'BIGSPEND']) {
      assert.equal((await agent.post('/api/products/note/quote').send({ coupon: code })).status, 400, code)
      assert.equal((await agent.post('/api/orders').send({ product: 'note', coupon: code })).status, 400, code)
    }
    assert.equal(await Order.countDocuments(), 0, 'a bad coupon creates no order')
    assert.equal((await agent.post('/api/products/other/quote').send({ coupon: 'ONLYOTHER' })).status, 200)
    void note
  })

  it('enforces total and per-student usage limits', async () => {
    await makeProduct({ slug: 'one', price: 100 })
    await makeProduct({ slug: 'two', price: 100 })
    await coupon({ code: 'ONCE', usageLimit: 1, perUserLimit: 1 })
    const a = (await registerUser()).agent
    const b = (await registerUser()).agent
    assert.equal((await checkout(a, 'one', 'ONCE')).verified.status, 200)
    assert.equal((await a.post('/api/orders').send({ product: 'two', coupon: 'ONCE' })).status, 400, 'per-student limit')
    const exhausted = await b.post('/api/orders').send({ product: 'one', coupon: 'ONCE' })
    assert.equal(exhausted.status, 400)
    assert.match(exhausted.body.error.message, /redeemed/)
  })

  it('reuses an identical open order, but reprices when the coupon changes', async () => {
    await makeProduct({ slug: 'note', price: 200 })
    await coupon()
    const { agent } = await registerUser()
    const first = await agent.post('/api/orders').send({ product: 'note', coupon: 'SAVE20' })
    const again = await agent.post('/api/orders').send({ product: 'note', coupon: 'SAVE20' })
    assert.equal(first.body.data.order.id, again.body.data.order.id)
    const plain = await agent.post('/api/orders').send({ product: 'note' })
    assert.notEqual(plain.body.data.order.id, first.body.data.order.id)
    assert.equal(plain.body.data.order.amount, 200)
    assert.equal((await Order.findById(first.body.data.order.id)).status, 'cancelled', 'superseded order is closed')
    // The student can still pay for the earlier order if a payment window was already open.
    assert.equal(await Order.countDocuments({ status: 'pending' }), 1)
  })

  it('ignores a client-supplied price or discount', async () => {
    await makeProduct({ slug: 'note', price: 200 })
    const { agent } = await registerUser()
    const res = await agent.post('/api/orders').send({ product: 'note', amount: 1, discount: 199, price: 1, amountPaise: 100 })
    assert.equal(res.body.data.order.amount, 200)
  })

  it('manages coupons from the admin area with validation, usage counts and delete safeguards', async () => {
    const admin = await adminAgent()
    await makeProduct({ slug: 'note', price: 200 })
    const create = await admin.post('/api/admin/coupons').send({ code: 'launch10', type: 'percent', value: 10, usageLimit: 100, perUserLimit: 1, validUntil: new Date(Date.now() + 86400000).toISOString() })
    assert.equal(create.status, 201)
    assert.equal(create.body.data.code, 'LAUNCH10')
    assert.equal(create.body.data.value, 10)
    assert.equal((await admin.post('/api/admin/coupons').send({ code: 'LAUNCH10', type: 'percent', value: 10 })).status, 409)
    assert.equal((await admin.post('/api/admin/coupons').send({ code: 'TOOMUCH', type: 'percent', value: 95 })).status, 400)
    assert.equal((await admin.post('/api/admin/coupons').send({ code: 'x', type: 'percent', value: 5 })).status, 400)
    const flat = await admin.post('/api/admin/coupons').send({ code: 'FLAT25', type: 'flat', value: 25 })
    assert.equal(flat.body.data.value, 25)
    assert.equal((await Coupon.findOne({ code: 'FLAT25' })).value, 2500, 'stored in paise')

    const { agent } = await registerUser()
    assert.equal((await checkout(agent, 'note', 'LAUNCH10')).verified.status, 200)
    const listed = (await admin.get('/api/admin/coupons')).body.data.find((c) => c.code === 'LAUNCH10')
    assert.equal(listed.used, 1)
    assert.equal((await admin.delete(`/api/admin/coupons/${listed.id}`)).status, 409, 'used coupons are kept')
    assert.equal((await admin.patch(`/api/admin/coupons/${listed.id}`).send({ active: false })).body.data.active, false)
    assert.equal((await admin.delete(`/api/admin/coupons/${flat.body.data.id}`)).status, 200)
    const editor = await staffAgent('editor')
    assert.equal((await editor.post('/api/admin/coupons').send({ code: 'EDITORS', type: 'percent', value: 5 })).status, 403)
  })
})

describe('admin analytics', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('reports real totals from orders and payments, with an honest conversion rate', async () => {
    await makeProduct({ slug: 'best', price: 100 })
    await makeProduct({ slug: 'other', price: 50 })
    const a = (await registerUser()).agent
    const b = (await registerUser()).agent
    const c = (await registerUser()).agent
    await buy(a, 'best')
    await buy(b, 'best')
    const { orderId } = await buy(b, 'other')
    await c.post('/api/orders').send({ product: 'best' }) // started, never paid
    await Product.updateOne({ slug: 'best' }, { viewCount: 40 })
    const admin = await adminAgent()
    assert.equal((await admin.post(`/api/admin/orders/${orderId}/refund`).send({})).status, 200)

    const stats = (await admin.get('/api/admin/stats?days=7')).body.data
    assert.equal(stats.totals.students, 3)
    assert.equal(stats.totals.payingCustomers, 2)
    assert.equal(stats.totals.purchases, 2, 'refunded orders are not counted as sales')
    assert.equal(stats.totals.grossRevenue, 250)
    assert.equal(stats.totals.refunded, 50)
    assert.equal(stats.totals.revenue, 200)
    assert.equal(stats.bestSelling[0].slug, 'best')
    assert.equal(stats.bestSelling[0].sales, 2)
    assert.equal(stats.mostViewed[0].slug, 'best')
    assert.equal(stats.unfinishedPayments.length, 1)
    assert.equal(stats.recentRegistrations.length, 3, 'students only, not the admin account')
    assert.equal(stats.revenueByDay.length, 7)
    assert.equal(stats.revenueByDay.at(-1).revenue, 200)
    assert.equal(stats.conversion.checkoutCompletion, 75)
    assert.ok(stats.conversion.viewToPurchase > 0 && stats.conversion.viewToPurchase < 100)
    assert.ok(!JSON.stringify(stats).includes('passwordHash'))
  })

  it('returns null conversion rather than inventing one when there is no data', async () => {
    const admin = await adminAgent()
    const stats = (await admin.get('/api/admin/stats')).body.data
    assert.equal(stats.conversion.viewToPurchase, null)
    assert.equal(stats.conversion.checkoutCompletion, null)
    assert.equal(stats.totals.revenue, 0)
    assert.equal((await admin.get('/api/admin/stats?days=9999')).status, 400)
    void client
  })
})

describe('premium vs standalone notes', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('includes admin-created notes in Premium unless the admin opts out', async () => {
    const admin = await adminAgent()
    const created = await admin.post('/api/admin/products').send({ title: 'In Premium', price: 99 })
    assert.equal(created.body.data.premiumEligible, true)
    const optOut = await admin.post('/api/admin/products').send({ title: 'Standalone', price: 99, premiumEligible: false })
    assert.equal(optOut.body.data.premiumEligible, false)
    void Entitlement
  })
})

describe('cart', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  const notes = (n, price = 100) => Promise.all(Array.from({ length: n }, (_, i) => makeProduct({ slug: `n${i + 1}`, price })))
  const slugs = (n) => Array.from({ length: n }, (_, i) => `n${i + 1}`)
  const quoteOf = async (agent, items, coupon) => (await agent.post('/api/cart/quote').send({ items, ...(coupon ? { coupon } : {}) })).body.data
  const payCart = async (agent, items, coupon) => {
    const created = await agent.post('/api/orders').send({ items, ...(coupon ? { coupon } : {}) })
    if (created.status >= 300) return { created }
    const orderId = created.body.data.order.id
    const proof = (await agent.post('/api/payments/mock/complete').send({ orderId })).body.data
    const verified = await agent.post('/api/payments/verify').send({ orderId, ...proof })
    return { created, orderId, verified }
  }

  it('gives a bigger discount the more notes are bought together', async () => {
    await notes(5)
    const guest = client()
    const totals = {}
    for (const n of [1, 2, 3, 5]) totals[n] = await quoteOf(guest, slugs(n))
    assert.equal(totals[1].total, 100, 'one note: no discount')
    assert.equal(totals[1].nextTier.needed, 1)
    assert.equal(totals[2].total, 180)
    assert.equal(totals[2].volumePercent, 10)
    assert.equal(totals[3].total, 255)
    assert.equal(totals[5].total, 400)
    assert.equal(totals[5].nextTier, null)
    assert.equal(totals[3].volumeDiscount, 45)
  })

  it('applies a coupon on top of the volume discount', async () => {
    await notes(2)
    await Coupon.create({ code: 'EXTRA10', type: 'percent', value: 10 })
    const q = await quoteOf(client(), slugs(2), 'EXTRA10')
    assert.equal(q.volumeDiscount, 20)
    assert.equal(q.couponDiscount, 18, '10% of the 180 left after the volume discount')
    assert.equal(q.total, 162)
  })

  it('sells the cart as one order at the quoted price and gives access to every note', async () => {
    await notes(3)
    const { agent } = await registerUser()
    const { created, verified } = await payCart(agent, slugs(3))
    assert.equal(created.status, 201)
    assert.equal(created.body.data.order.amount, 255)
    assert.equal(created.body.data.order.kind, 'cart')
    assert.equal(created.body.data.order.items.length, 3)
    assert.equal(verified.status, 200)
    for (const slug of slugs(3)) assert.equal((await openReader(agent, slug)).status, 201)
    const lib = (await agent.get('/api/library')).body.data
    assert.deepEqual(lib.items.map((i) => i.source), ['purchase', 'purchase', 'purchase'])
    assert.equal((await openReader((await registerUser()).agent, 'n1')).status, 403, 'other students get nothing')
    const order = await Order.findById(created.body.data.order.id)
    assert.equal(order.volumeDiscountPaise, 4500)
    assert.equal(order.listAmountPaise, 30000)
  })

  it('ignores prices sent by the client and refuses a mixed or empty request', async () => {
    await notes(2)
    const { agent } = await registerUser()
    const created = await agent.post('/api/orders').send({ items: slugs(2), amount: 1, total: 1 })
    assert.equal(created.body.data.order.amount, 180)
    assert.equal((await agent.post('/api/orders').send({ items: slugs(2), product: 'n1' })).status, 400)
    assert.equal((await agent.post('/api/orders').send({ items: [] })).status, 400)
    assert.equal((await agent.post('/api/orders').send({})).status, 400)
  })

  it('leaves out notes the student already owns and sells a single leftover note normally', async () => {
    await notes(3)
    const { agent } = await registerUser()
    await buy(agent, 'n1')
    const q = await quoteOf(agent, slugs(3))
    assert.deepEqual(q.owned, ['n1'])
    assert.equal(q.count, 2)
    assert.equal(q.total, 180)

    await buy(agent, 'n2')
    const single = await agent.post('/api/orders').send({ items: slugs(3) })
    assert.equal(single.status, 201)
    assert.equal(single.body.data.order.kind, 'note', 'one note left: priced as a normal order')
    assert.equal(single.body.data.order.amount, 100)

    await buy(agent, 'n3')
    assert.equal((await agent.post('/api/orders').send({ items: slugs(3) })).status, 409)
  })

  it('treats free, unpublished and unknown notes as unavailable', async () => {
    await notes(2)
    await makeProduct({ slug: 'free-one', price: 0 })
    await makeProduct({ slug: 'draft-one', status: 'draft' })
    const q = await quoteOf(client(), ['n1', 'n2', 'free-one', 'draft-one', 'nope'])
    assert.deepEqual(q.unavailable.sort(), ['draft-one', 'free-one', 'nope'])
    assert.equal(q.count, 2)
    const { agent } = await registerUser()
    assert.equal((await agent.post('/api/orders').send({ items: ['free-one', 'nope'] })).status, 404)
  })

  it('reuses an identical open cart order on retry, and cancels it when the cart changes', async () => {
    await notes(3)
    const { agent } = await registerUser()
    const first = await agent.post('/api/orders').send({ items: slugs(2) })
    const again = await agent.post('/api/orders').send({ items: [...slugs(2)].reverse() })
    assert.equal(again.body.data.order.id, first.body.data.order.id)
    const changed = await agent.post('/api/orders').send({ items: slugs(3) })
    assert.notEqual(changed.body.data.order.id, first.body.data.order.id)
    assert.equal((await Order.findById(first.body.data.order.id)).status, 'cancelled')
  })

  it('removes access for every note in the cart when the order is refunded', async () => {
    await notes(2)
    const admin = await adminAgent()
    const { agent } = await registerUser()
    const { orderId } = await payCart(agent, slugs(2))
    const refund = await admin.post(`/api/admin/orders/${orderId}/refund`).send({ reason: 'test' })
    assert.ok(refund.status < 300, `refund failed ${refund.status}`)
    for (const slug of slugs(2)) assert.equal((await openReader(agent, slug)).status, 403)
  })
})
