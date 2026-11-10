import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { adminAgent, buy, client, makeProduct, mongoose, registerUser, resetDb, staffAgent, startDb, stopDb, webhook } from './helpers.js'

const { growth } = await import('../src/config/growth.js')
const { Order } = await import('../src/models/Order.js')
const { Coupon } = await import('../src/models/Coupon.js')
const { CreditEntry } = await import('../src/models/CreditEntry.js')
const { Referral } = await import('../src/models/Referral.js')
const { ReferralGift } = await import('../src/models/ReferralGift.js')
const { Teacher } = await import('../src/models/Teacher.js')
const { TeacherAdjustment } = await import('../src/models/TeacherAdjustment.js')
const { TeacherBonus } = await import('../src/models/TeacherBonus.js')
const { User } = await import('../src/models/User.js')
const { creditBalance } = await import('../src/services/growth/credit.js')
const { runGrowthMaintenance } = await import('../src/services/growth/maintenance.js')
const { toCsv } = await import('../src/services/growth/csv.js')
const { commissionFor } = await import('../src/services/growth/sales.js')
const { flatDiscount, percentDiscount } = await import('../src/services/pricing.js')

const DAY = 86400000
const DEFAULTS = { ...growth }
const later = (days = 8) => new Date(Date.now() + days * DAY)

// Products are priced directly in paise so rounding cases can be exact.
const note = (slug, pricePaise = 10000) => makeProduct({ slug, price: 0, pricePaise, withFile: false })

async function teacherByAdmin(admin, overrides = {}) {
  const res = await admin.post('/api/admin/growth/teachers').send({ name: 'Anita Sharma', phone: '+91 98765 43210', ...overrides })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  return { ...res.body.data, token: res.body.data.statsUrl.split('/t/')[1] }
}

async function place(agent, body) {
  const res = await agent.post('/api/orders').send(body)
  return { res, id: res.body?.data?.order?.id, amount: res.body?.data?.checkout?.amountPaise }
}

// The verified payment webhook, exactly as the gateway sends it.
async function confirm(orderId, { paymentId } = {}) {
  const order = await Order.findById(orderId)
  const res = await webhook({
    event: 'payment.captured',
    payload: { payment: { entity: { id: paymentId ?? `pay_${orderId}`, order_id: order.providerOrderId, amount: order.amountPaise, currency: 'INR' } } },
  })
  assert.equal(res.status, 200)
  return Order.findById(orderId)
}

const refund = (admin, orderId) => admin.post(`/api/admin/orders/${orderId}/refund`).send({ reason: 'test refund' })
const landing = (agent, body) => agent.post('/api/growth/landing').send(body)

// A referrer, and a friend who followed the referrer's link before signing up.
async function referrerAndFriend() {
  const referrer = await registerUser()
  const overview = await referrer.agent.get('/api/growth/referrals/me')
  const code = overview.body.data.code
  const visitor = client()
  await landing(visitor, { ref: code })
  const friend = await registerUser(visitor)
  return { referrer, friend, code }
}

describe('growth: referrals and teacher program', () => {
  before(startDb)
  after(stopDb)
  beforeEach(async () => {
    Object.assign(growth, DEFAULTS)
    await resetDb()
  })

  describe('price and rounding', () => {
    it('rounds discounts and commissions down to whole paise and keeps a minimum charge', () => {
      assert.equal(percentDiscount(9999, 15), 1499) // 1499.85 -> 1499
      assert.equal(percentDiscount(10000, 15), 1500)
      assert.equal(percentDiscount(4000, 90), 3600)
      assert.equal(percentDiscount(150, 90), 50) // never below the 100 paise minimum charge
      assert.equal(flatDiscount(9900, 5000), 5000)
      assert.equal(flatDiscount(4000, 5000), 3900)
      assert.equal(flatDiscount(100, 5000), 0)
      assert.equal(commissionFor(8500, 20), 1700)
      assert.equal(commissionFor(8499, 20), 1699) // 1699.8 -> 1699
    })

    it('charges exactly the server-computed integer paise and stores source and amounts on the order', async () => {
      await note('n1', 9999)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const { agent } = await registerUser()
      await landing(agent, { teacher: teacher.code })
      const { res, id } = await place(agent, { product: 'n1', amount: 1, price: 1, discountPaise: 9999 })
      assert.equal(res.status, 201)
      assert.equal(res.body.data.checkout.amountPaise, 8500) // 9999 - floor(9999 * 15 / 100)
      const order = await Order.findById(id)
      assert.equal(order.discountSource, 'teacher')
      assert.equal(order.teacherCode, teacher.code)
      assert.equal(order.discountPaise, 1499)
      assert.equal(order.listAmountPaise, 9999)
      assert.equal(order.amountPaise, 8500)
      assert.equal(order.commissionPercent, growth.TEACHER_COMMISSION_PERCENT)
    })

    it('applies the friend discount as flat paise, clamped to the minimum charge', async () => {
      await note('cheap', 4000)
      const { friend } = await referrerAndFriend()
      const { res } = await place(friend.agent, { product: 'cheap' })
      assert.equal(res.body.data.checkout.amountPaise, 100) // 4000 - min(5000, 3900)
      assert.equal((await Order.findById(res.body.data.order.id)).discountSource, 'referral')
    })

    it('prices a cart with the teacher discount on the whole total (no buy-more discount)', async () => {
      await note('c1', 10000)
      await note('c2', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const { agent } = await registerUser()
      await landing(agent, { teacher: teacher.code })
      const quote = await agent.post('/api/cart/quote').send({ items: ['c1', 'c2'] })
      assert.equal(quote.body.data.volumeDiscount, undefined)
      assert.equal(quote.body.data.discountSource, 'teacher')
      assert.equal(quote.body.data.total, 170) // 200 - 15% (30)
      const { res } = await place(agent, { items: ['c1', 'c2'] })
      assert.equal(res.body.data.checkout.amountPaise, 17000)
    })
  })

  describe('one discount source per order', () => {
    it('a teacher code beats a friend discount, and the referrer gets nothing', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const referrer = await registerUser()
      const code = (await referrer.agent.get('/api/growth/referrals/me')).body.data.code

      const visitor = client()
      await landing(visitor, { ref: code })
      await landing(visitor, { teacher: teacher.code })
      const friend = await registerUser(visitor)
      assert.equal(await Referral.countDocuments({ referred: friend.user.id }), 1) // the referral is attached

      const { res, id } = await place(friend.agent, { product: 'n1' })
      assert.equal(res.body.data.checkout.amountPaise, 8500) // teacher 15%, not the flat friend discount
      assert.equal((await Order.findById(id)).discountSource, 'teacher')
      await confirm(id)

      const referral = await Referral.findOne({ referred: friend.user.id })
      assert.equal(referral.status, 'superseded')
      await runGrowthMaintenance(later())
      assert.equal(await creditBalance(new mongoose.Types.ObjectId(referrer.user.id)), 0)
      assert.equal(await CreditEntry.countDocuments(), 0)
    })

    it('a typed friend code cannot be added on top of a saved teacher link', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const referrer = await registerUser()
      const code = (await referrer.agent.get('/api/growth/referrals/me')).body.data.code
      const { agent } = await registerUser()
      await landing(agent, { teacher: teacher.code })
      const quote = await agent.post('/api/products/n1/quote').send({ coupon: code })
      assert.equal(quote.body.data.discountSource, 'teacher')
      assert.match(quote.body.data.notice, /teacher discount/i)
      assert.equal(quote.body.data.total, 85)
    })

    it('a code typed at checkout overrides a saved teacher link, and only one source applies', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const first = await teacherByAdmin(admin, { phone: '9000000001' })
      const second = await teacherByAdmin(admin, { name: 'Ravi Kumar', phone: '9000000002', discountPercent: 20 })
      await Coupon.create({ code: 'SAVE10', type: 'percent', value: 10 })
      const { agent } = await registerUser()
      await landing(agent, { teacher: first.code })

      // typed teacher code replaces the saved one
      let q = await agent.post('/api/products/n1/quote').send({ coupon: second.code.toLowerCase() })
      assert.equal(q.body.data.discountSource, 'teacher')
      assert.equal(q.body.data.total, 80)
      // a typed coupon cannot replace a saved teacher link: the teacher always wins, and the student is told
      q = await agent.post('/api/products/n1/quote').send({ coupon: ' save10 ' })
      assert.equal(q.body.data.discountSource, 'teacher')
      assert.equal(q.body.data.total, 85) // first teacher: 15% off
      assert.match(q.body.data.notice, /teacher discount is already applied/i)
      const { id } = await place(agent, { product: 'n1', coupon: 'SAVE10' })
      const order = await Order.findById(id)
      assert.equal(order.discountSource, 'teacher')
      assert.equal(order.couponCode, undefined)
      assert.equal(order.commissionPercent, 20)

      // without a saved teacher link, the same typed coupon is used
      const { agent: plain } = await registerUser()
      q = await plain.post('/api/products/n1/quote').send({ coupon: ' save10 ' })
      assert.equal(q.body.data.discountSource, 'coupon')
      assert.equal(q.body.data.total, 90)
    })

    it('rejects an unknown code with a clear message and falls back to the saved link when nothing is typed', async () => {
      await note('n1', 10000)
      const { agent } = await registerUser()
      const bad = await agent.post('/api/products/n1/quote').send({ coupon: 'NOPE123' })
      assert.equal(bad.status, 400)
      assert.match(bad.body.error.message, /not valid/i)
      assert.equal((await agent.post('/api/products/n1/quote').send({})).body.data.discountSource, 'none')
    })
  })

  describe('teacher codes', () => {
    it('shows clear errors for inactive and blocked codes and blocks a teacher using their own code', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin, { email: 'anita@example.com' })
      const { agent } = await registerUser()

      await admin.patch(`/api/admin/growth/teachers/${teacher.id}`).send({ active: false })
      let q = await agent.post('/api/products/n1/quote').send({ coupon: teacher.code })
      assert.equal(q.status, 400)
      assert.match(q.body.error.message, /not active/i)

      await admin.patch(`/api/admin/growth/teachers/${teacher.id}`).send({ active: true, blocked: true })
      q = await agent.post('/api/products/n1/quote').send({ coupon: teacher.code })
      assert.match(q.body.error.message, /no longer available/i)
      await admin.patch(`/api/admin/growth/teachers/${teacher.id}`).send({ blocked: false })

      // The teacher's own account (matching email) cannot redeem the code, typed or saved.
      const own = await registerUser(client(), { email: 'anita@example.com' })
      q = await own.agent.post('/api/products/n1/quote').send({ coupon: teacher.code })
      assert.equal(q.status, 400)
      assert.match(q.body.error.message, /own teacher code/i)
      await landing(own.agent, { teacher: teacher.code })
      q = await own.agent.post('/api/products/n1/quote').send({})
      assert.equal(q.body.data.discountSource, 'none') // a saved link is ignored quietly

      // Matching phone number works the same way (last 10 digits).
      const phoneUser = await registerUser()
      await phoneUser.agent.patch('/api/auth/me').send({ name: 'Test Student', phone: '09876543210' })
      q = await phoneUser.agent.post('/api/products/n1/quote').send({ coupon: teacher.code })
      assert.match(q.body.error.message, /own teacher code/i)
    })

    it('treats codes as case-insensitive and trimmed, and a teacher code is not accepted when the program is off', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const { agent } = await registerUser()
      assert.equal((await agent.post('/api/products/n1/quote').send({ coupon: `  ${teacher.code.toLowerCase()}  ` })).body.data.discountSource, 'teacher')
      growth.teachersEnabled = false
      const off = await agent.post('/api/products/n1/quote').send({ coupon: teacher.code })
      assert.equal(off.status, 400)
    })

    it('creates teachers only through the admin API, with unique codes that avoid referral codes', async () => {
      const admin = await adminAgent()
      const a = await teacherByAdmin(admin, { code: 'MATHS99' })
      assert.equal(a.code, 'MATHS99')
      assert.equal((await admin.post('/api/admin/growth/teachers').send({ name: 'Other Person', phone: '9111111111', code: 'maths99' })).status, 409)
      assert.equal((await admin.post('/api/admin/growth/teachers').send({ name: 'Other Person', phone: '9111111111', code: 'RKABCDEF' })).status, 400)
      const auto = await teacherByAdmin(admin, { name: 'Zed Person', phone: '9222222222' })
      assert.match(auto.code, /^[A-Z0-9]{4,16}$/)
      assert.ok(auto.statsUrl.includes('/t/') && auto.statsUrl.split('/t/')[1].length >= 40)
      assert.equal(a.discountPercent, growth.TEACHER_STUDENT_DISCOUNT_PERCENT)
      assert.equal(a.commissionPercent, growth.TEACHER_COMMISSION_PERCENT)
    })

    it('counts clicks per teacher per day', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      await landing(client(), { teacher: teacher.code })
      await landing(client(), { teacher: teacher.code })
      await landing(client(), { teacher: 'UNKNOWN1' })
      const detail = await admin.get(`/api/admin/growth/teachers/${teacher.id}`)
      assert.equal(detail.body.data.stats.clicks, 2)
    })
  })

  describe('webhook confirmation', () => {
    it('records a sale only when the verified webhook confirms payment, and a replay never creates a second sale', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const { agent } = await registerUser()
      await landing(agent, { teacher: teacher.code })

      // Paying through /payments/verify alone grants access but does not create a sale.
      const { orderId, payment } = await buy(agent, 'n1')
      const paymentId = payment.razorpay_payment_id
      let order = await Order.findById(orderId)
      assert.equal(order.status, 'paid')
      assert.equal(order.commissionStatus, undefined)
      assert.equal(order.saleConfirmedAt, undefined)

      order = await confirm(orderId, { paymentId })
      assert.equal(order.commissionStatus, 'pending')
      assert.equal(order.commissionPaise, 1700) // 20% of 8500
      const confirmedAt = order.saleConfirmedAt
      assert.ok(confirmedAt)

      // The same event id again, then the same payment under new event ids: nothing changes.
      await confirm(orderId, { paymentId })
      await confirm(orderId, { paymentId })
      order = await Order.findById(orderId)
      assert.equal(order.commissionPaise, 1700)
      assert.equal(order.saleConfirmedAt.getTime(), confirmedAt.getTime())
      const detail = await admin.get(`/api/admin/growth/teachers/${teacher.id}`)
      assert.equal(detail.body.data.stats.orders, 1)
      assert.equal(detail.body.data.stats.earned, 17)
    })

    it('does not record a sale for a bad signature', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const { agent } = await registerUser()
      await landing(agent, { teacher: teacher.code })
      const { id } = await place(agent, { product: 'n1' })
      const order = await Order.findById(id)
      const bad = await webhook(
        { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x', order_id: order.providerOrderId, amount: order.amountPaise, currency: 'INR' } } } },
        { secret: 'wrong-secret' },
      )
      assert.equal(bad.status, 400)
      assert.equal((await Order.findById(id)).commissionStatus, undefined)
    })
  })

  describe('referrals', () => {
    it('gives the friend the discount, grants the referrer credit only after the refund window, once', async () => {
      await note('n1', 10000)
      const { referrer, friend } = await referrerAndFriend()
      const { res, id } = await place(friend.agent, { product: 'n1' })
      assert.equal(res.body.data.checkout.amountPaise, 5000) // 10000 - FRIEND_DISCOUNT
      await confirm(id)

      let overview = (await referrer.agent.get('/api/growth/referrals/me')).body.data
      assert.equal(overview.invited, 1)
      assert.equal(overview.paid, 1)
      assert.equal(overview.balance, 0)
      assert.equal(overview.pendingCredit, 50)

      await runGrowthMaintenance(later(3)) // inside the window: still nothing
      assert.equal(await CreditEntry.countDocuments(), 0)
      await runGrowthMaintenance(later(8))
      await runGrowthMaintenance(later(9)) // running it again must not pay twice
      overview = (await referrer.agent.get('/api/growth/referrals/me')).body.data
      assert.equal(overview.balance, 50)
      assert.equal(overview.ledger.length, 1)
      assert.equal(overview.ledger[0].amount, 50)
      assert.equal(await CreditEntry.countDocuments({ type: 'referral_reward' }), 1)
    })

    it('blocks self-referral and gives only one reward per friend (and only on the first order)', async () => {
      await note('n1', 10000)
      await note('n2', 10000)
      const own = await registerUser()
      const code = (await own.agent.get('/api/growth/referrals/me')).body.data.code
      const self = await own.agent.post('/api/products/n1/quote').send({ coupon: code })
      assert.equal(self.status, 400)
      assert.match(self.body.error.message, /own referral code/i)
      await landing(own.agent, { ref: code })
      assert.equal((await own.agent.post('/api/products/n1/quote').send({})).body.data.discountSource, 'none')

      const { referrer, friend } = await referrerAndFriend()
      const first = await place(friend.agent, { product: 'n1' })
      await confirm(first.id)
      // A second order by the same friend gets no friend discount and creates no second reward.
      const second = await place(friend.agent, { product: 'n2' })
      assert.equal(second.amount, 10000)
      await confirm(second.id)
      await runGrowthMaintenance(later())
      assert.equal(await Referral.countDocuments({ referrer: referrer.user.id }), 1)
      assert.equal(await CreditEntry.countDocuments({ type: 'referral_reward' }), 1)
      // A friend code typed after the first purchase is refused.
      const lateCode = await friend.agent.post('/api/products/n2/quote').send({ coupon: code })
      assert.equal(lateCode.status, 400)
    })

    it('enforces a monthly cap per referrer', async () => {
      growth.REFERRAL_MONTHLY_CAP = 1
      await note('n1', 10000)
      const referrer = await registerUser()
      const code = (await referrer.agent.get('/api/growth/referrals/me')).body.data.code
      const friends = []
      for (let i = 0; i < 2; i += 1) {
        const visitor = client()
        await landing(visitor, { ref: code })
        friends.push(await registerUser(visitor))
      }
      for (const f of friends) await confirm((await place(f.agent, { product: 'n1' })).id)
      const statuses = (await Referral.find({ referrer: referrer.user.id }).sort({ createdAt: 1 })).map((r) => r.status)
      assert.deepEqual(statuses, ['pending', 'capped'])
      await runGrowthMaintenance(later())
      assert.equal(await CreditEntry.countDocuments({ type: 'referral_reward' }), 1)
    })

    it('lets the referrer spend credit at checkout, validated and deducted on the server', async () => {
      await note('n1', 10000)
      const { referrer, friend } = await referrerAndFriend()
      await confirm((await place(friend.agent, { product: 'n1' })).id)
      await runGrowthMaintenance(later())

      const quote = await referrer.agent.post('/api/products/n1/quote').send({ useCredit: true })
      assert.equal(quote.body.data.creditAvailable, 50)
      assert.equal(quote.body.data.credit, 50)
      assert.equal(quote.body.data.total, 50)

      // The client cannot ask for more credit than exists: only the flag is read, the amount is the server's.
      const { res, id } = await place(referrer.agent, { product: 'n1', useCredit: true, creditPaise: 999999 })
      assert.equal(res.body.data.checkout.amountPaise, 5000)
      const order = await Order.findById(id)
      assert.equal(order.creditPaise, 5000)
      // Reserved while the order is open: it cannot be spent twice.
      await note('n2', 10000)
      assert.equal((await referrer.agent.post('/api/products/n2/quote').send({ useCredit: true })).body.data.credit, 0)
      // Deducted for good once the payment is confirmed (verify and webhook both settle; one ledger entry).
      await confirm(id)
      await confirm(id)
      assert.equal(await CreditEntry.countDocuments({ type: 'spend' }), 1)
      assert.equal((await referrer.agent.get('/api/growth/referrals/me')).body.data.balance, 0)
    })

    it('leaves credit alone unless it is asked for, and never takes an order below the minimum charge', async () => {
      await note('n1', 4000)
      const user = await registerUser()
      await CreditEntry.create({ user: user.user.id, type: 'referral_reward', amountPaise: 100000, referral: new mongoose.Types.ObjectId() })
      const plain = await user.agent.post('/api/products/n1/quote').send({})
      assert.equal(plain.body.data.credit, 0)
      assert.equal(plain.body.data.creditAvailable, 1000)
      const used = await user.agent.post('/api/products/n1/quote').send({ useCredit: true })
      assert.equal(used.body.data.total, 1) // 4000 - 3900 paise, never below one rupee
    })
  })

  describe('refunds', () => {
    it('reverses a pending commission and a pending referral reward', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const { agent } = await registerUser()
      await landing(agent, { teacher: teacher.code })
      const { id } = await place(agent, { product: 'n1' })
      await confirm(id)
      assert.equal((await refund(admin, id)).status, 200)
      assert.equal((await Order.findById(id)).commissionStatus, 'reversed')
      const detail = await admin.get(`/api/admin/growth/teachers/${teacher.id}`)
      assert.equal(detail.body.data.stats.earned, 0)
      assert.equal(detail.body.data.stats.orders, 0)

      // Referral: refunded before the window ends, so the credit is never granted.
      await note('n2', 10000)
      const { referrer, friend } = await referrerAndFriend()
      const friendOrder = await place(friend.agent, { product: 'n2' })
      await confirm(friendOrder.id)
      await refund(admin, friendOrder.id)
      assert.equal((await Referral.findOne({ referred: friend.user.id })).status, 'reversed')
      await runGrowthMaintenance(later())
      assert.equal(await CreditEntry.countDocuments(), 0)
      assert.equal(await creditBalance(new mongoose.Types.ObjectId(referrer.user.id)), 0)
    })

    it('takes back a referral reward that was already granted', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const { referrer, friend } = await referrerAndFriend()
      const { id } = await place(friend.agent, { product: 'n1' })
      await confirm(id)
      await runGrowthMaintenance(later())
      assert.equal(await creditBalance(new mongoose.Types.ObjectId(referrer.user.id)), 5000)
      await refund(admin, id)
      assert.equal(await creditBalance(new mongoose.Types.ObjectId(referrer.user.id)), 0)
      assert.equal(await CreditEntry.countDocuments({ type: 'reward_reversal' }), 1)
      await refund(admin, id).catch(() => {})
      assert.equal(await CreditEntry.countDocuments({ type: 'reward_reversal' }), 1)
    })

    it('gives store credit back when an order that used it is refunded', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const user = await registerUser()
      const uid = new mongoose.Types.ObjectId(user.user.id)
      await CreditEntry.create({ user: uid, type: 'referral_reward', amountPaise: 3000, referral: new mongoose.Types.ObjectId() })
      const { id } = await place(user.agent, { product: 'n1', useCredit: true })
      await confirm(id)
      assert.equal(await creditBalance(uid), 0)
      await refund(admin, id)
      assert.equal(await creditBalance(uid), 3000)
    })
  })

  describe('commission window and payouts', () => {
    async function soldOrder(admin, teacher, slug, pricePaise = 10000) {
      await note(slug, pricePaise)
      const student = await registerUser()
      await landing(student.agent, { teacher: teacher.code })
      const { id } = await place(student.agent, { product: slug })
      await confirm(id)
      return { id, student }
    }

    it('becomes payable only after the refund window', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const { id } = await soldOrder(admin, teacher, 'n1')
      await runGrowthMaintenance(later(3))
      assert.equal((await Order.findById(id)).commissionStatus, 'pending')
      await runGrowthMaintenance(later(8))
      assert.equal((await Order.findById(id)).commissionStatus, 'payable')
      const detail = await admin.get(`/api/admin/growth/teachers/${teacher.id}`)
      assert.equal(detail.body.data.stats.readyToPay, 17)
      assert.equal(detail.body.data.payableOrders.length, 1)
    })

    it('records a payout, refuses to pay the same order twice, and shows it in the stats', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const a = await soldOrder(admin, teacher, 'n1')
      const b = await soldOrder(admin, teacher, 'n2', 20000)
      // Not payable yet: still inside the window.
      let res = await admin.post(`/api/admin/growth/teachers/${teacher.id}/payouts`).send({ orderIds: [a.id], upiRef: 'UPI123456' })
      assert.equal(res.status, 409)
      await runGrowthMaintenance(later())

      res = await admin.post(`/api/admin/growth/teachers/${teacher.id}/payouts`).send({ orderIds: [a.id, b.id], upiRef: 'UPI123456', note: 'November' })
      assert.equal(res.status, 201, JSON.stringify(res.body))
      assert.equal(res.body.data.amount, 17 + 34) // 20% of 85 and of 170
      assert.equal((await Order.findById(a.id)).commissionStatus, 'paid')

      res = await admin.post(`/api/admin/growth/teachers/${teacher.id}/payouts`).send({ orderIds: [a.id], upiRef: 'UPI999999' })
      assert.equal(res.status, 409)
      const detail = await admin.get(`/api/admin/growth/teachers/${teacher.id}`)
      assert.equal(detail.body.data.stats.paid, 51)
      assert.equal(detail.body.data.stats.paidOut, 51)
      assert.equal(detail.body.data.stats.readyToPay, 0)
      assert.equal(detail.body.data.payouts.length, 1)
      assert.equal(detail.body.data.payouts[0].upiRef, 'UPI123456')
    })

    it('turns the refund of an already-paid commission into a negative adjustment in the next payout', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const first = await soldOrder(admin, teacher, 'n1') // commission 17
      await runGrowthMaintenance(later())
      assert.equal((await admin.post(`/api/admin/growth/teachers/${teacher.id}/payouts`).send({ orderIds: [first.id], upiRef: 'UPI-ONE' })).status, 201)

      await refund(admin, first.id)
      const adjustment = await TeacherAdjustment.findOne({ order: first.id })
      assert.equal(adjustment.amountPaise, -1700)
      assert.equal(adjustment.status, 'open')
      assert.equal((await Order.findById(first.id)).commissionStatus, 'reversed')

      const second = await soldOrder(admin, teacher, 'n2', 20000) // commission 34
      await runGrowthMaintenance(later(20))
      const detail = await admin.get(`/api/admin/growth/teachers/${teacher.id}`)
      assert.equal(detail.body.data.stats.adjustmentsOwed, 17)
      assert.equal(detail.body.data.stats.netPayable, 17)
      const pay = await admin.post(`/api/admin/growth/teachers/${teacher.id}/payouts`).send({ orderIds: [second.id], upiRef: 'UPI-TWO' })
      assert.equal(pay.body.data.gross, 34)
      assert.equal(pay.body.data.adjustments, -17)
      assert.equal(pay.body.data.amount, 17)
      assert.equal((await TeacherAdjustment.findById(adjustment._id)).status, 'applied')
    })

    it('refuses a payout that adjustments would make negative', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const big = await soldOrder(admin, teacher, 'n1', 50000) // commission 85
      await runGrowthMaintenance(later())
      await admin.post(`/api/admin/growth/teachers/${teacher.id}/payouts`).send({ orderIds: [big.id], upiRef: 'UPI-BIG' })
      await refund(admin, big.id)
      const small = await soldOrder(admin, teacher, 'n2', 10000) // commission 17 < 85 owed
      await runGrowthMaintenance(later(20))
      const res = await admin.post(`/api/admin/growth/teachers/${teacher.id}/payouts`).send({ orderIds: [small.id], upiRef: 'UPI-SMALL' })
      assert.equal(res.status, 409)
      assert.match(res.body.error.message, /adjustments/i)
    })

    it('validates payout input', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const url = `/api/admin/growth/teachers/${teacher.id}/payouts`
      assert.equal((await admin.post(url).send({ orderIds: [], upiRef: 'UPI123' })).status, 400)
      assert.equal((await admin.post(url).send({ orderIds: ['not-an-id'], upiRef: 'UPI123' })).status, 400)
      assert.equal((await admin.post(url).send({ orderIds: [String(new mongoose.Types.ObjectId())], upiRef: '' })).status, 400)
    })
  })

  describe('milestone bonuses', () => {
    beforeEach(() => {
      growth.REFUND_WINDOW_DAYS = 0
      growth.MILESTONES = [
        { students: 2, giftValuePaise: 50000, partnerTeacher: false },
        { students: 3, giftValuePaise: 150000, partnerTeacher: true },
      ]
    })
    const soon = () => new Date(Date.now() + 5000)

    async function buyer(teacher, slug) {
      const student = await registerUser()
      await landing(student.agent, { teacher: teacher.code })
      const { id } = await place(student.agent, { product: slug })
      await confirm(id)
      return { ...student, orderId: id }
    }

    it('counts unique paying students, not orders, clicks or sign-ups', async () => {
      await note('n1')
      await note('n2')
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      await landing(client(), { teacher: teacher.code })
      const one = await buyer(teacher, 'n1')
      // The same student buys again: still one student.
      await landing(one.agent, { teacher: teacher.code })
      await confirm((await place(one.agent, { product: 'n2' })).id)
      await runGrowthMaintenance(soon())
      assert.equal(await TeacherBonus.countDocuments(), 0)
      let detail = await admin.get(`/api/admin/growth/teachers/${teacher.id}`)
      assert.equal(detail.body.data.stats.qualifiedStudents, 1)
      assert.equal(detail.body.data.stats.orders, 2)

      await buyer(teacher, 'n1')
      await runGrowthMaintenance(soon())
      detail = await admin.get(`/api/admin/growth/teachers/${teacher.id}`)
      assert.equal(detail.body.data.stats.qualifiedStudents, 2)
      assert.equal(await TeacherBonus.countDocuments({ status: 'eligible' }), 1)
      await runGrowthMaintenance(soon()) // awarded once only
      assert.equal(await TeacherBonus.countDocuments(), 1)
    })

    it('does not count an order that is still inside the refund window', async () => {
      growth.REFUND_WINDOW_DAYS = 7
      await note('n1')
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      await buyer(teacher, 'n1')
      await buyer(teacher, 'n1')
      await runGrowthMaintenance(later(3))
      assert.equal(await TeacherBonus.countDocuments(), 0)
      await runGrowthMaintenance(later(8))
      assert.equal(await TeacherBonus.countDocuments({ status: 'eligible' }), 1)
    })

    it('sets an unapproved bonus back to not eligible after a refund, but never touches an approved one', async () => {
      await note('n1')
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const a = await buyer(teacher, 'n1')
      const b = await buyer(teacher, 'n1')
      await runGrowthMaintenance(soon())
      const bonus = await TeacherBonus.findOne({ milestone: 2 })
      assert.equal(bonus.status, 'eligible')

      await refund(admin, b.orderId)
      assert.equal((await TeacherBonus.findById(bonus._id)).status, 'not_eligible')
      const c = await buyer(teacher, 'n1')
      await runGrowthMaintenance(soon())
      assert.equal((await TeacherBonus.findById(bonus._id)).status, 'eligible')

      assert.equal((await admin.post(`/api/admin/growth/bonuses/${bonus._id}/approve`)).status, 200)
      await refund(admin, c.orderId)
      await runGrowthMaintenance(soon())
      assert.equal((await TeacherBonus.findById(bonus._id)).status, 'approved')
      assert.ok(a)
    })

    it('needs an admin to approve and then issue, with a note, and never does either automatically', async () => {
      await note('n1')
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      await buyer(teacher, 'n1')
      await buyer(teacher, 'n1')
      await buyer(teacher, 'n1')
      await runGrowthMaintenance(soon())
      const bonuses = await TeacherBonus.find().sort({ milestone: 1 })
      assert.deepEqual(bonuses.map((b) => [b.milestone, b.status, b.giftValuePaise]), [[2, 'eligible', 50000], [3, 'eligible', 150000]])

      const partner = bonuses[1]
      // Issuing before approval is refused.
      assert.equal((await admin.post(`/api/admin/growth/bonuses/${partner._id}/issue`).send({ note: 'Amazon card' })).status, 409)
      assert.equal((await Teacher.findById(teacher.id)).partnerTeacher, false)
      assert.equal((await admin.post(`/api/admin/growth/bonuses/${partner._id}/approve`)).status, 200)
      assert.equal((await Teacher.findById(teacher.id)).partnerTeacher, true)
      assert.equal((await admin.post(`/api/admin/growth/bonuses/${partner._id}/approve`)).status, 409)
      assert.equal((await admin.post(`/api/admin/growth/bonuses/${partner._id}/issue`).send({})).status, 400) // a note is required
      const issued = await admin.post(`/api/admin/growth/bonuses/${partner._id}/issue`).send({ note: 'Amazon gift card, code sent on WhatsApp' })
      assert.equal(issued.status, 200)
      assert.equal(issued.body.data.status, 'issued')
      assert.equal((await admin.post(`/api/admin/growth/bonuses/${partner._id}/issue`).send({ note: 'again' })).status, 409)
      const queue = await admin.get('/api/admin/growth/bonuses?status=eligible')
      assert.equal(queue.body.data.length, 1)
    })
  })

  describe('teacher stats page', () => {
    it('shows totals, months, recent sales and bonus progress, but nothing about the students', async () => {
      await note('n1')
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const student = await registerUser(client(), { name: 'Zebulon Quillfeather', email: 'zebulon.q@example.com' })
      await landing(student.agent, { teacher: teacher.code })
      await student.agent.patch('/api/auth/me').send({ name: 'Zebulon Quillfeather', phone: '9000012345' })
      await confirm((await place(student.agent, { product: 'n1' })).id)

      const res = await client().get(`/api/t/${teacher.token}`)
      assert.equal(res.status, 200)
      assert.match(res.headers['x-robots-tag'], /noindex/)
      assert.match(res.headers['cache-control'], /no-store/)
      const data = res.body.data
      assert.equal(data.teacher.name, 'Anita Sharma')
      assert.equal(data.stats.orders, 1)
      assert.equal(data.stats.paidStudents, 1)
      assert.equal(data.stats.sales, 85)
      assert.equal(data.stats.earned, 17)
      assert.equal(data.recent.length, 1)
      assert.equal(data.recent[0].product, 'Product n1')
      assert.equal(data.monthly.length, 1)
      assert.ok(data.stats.nextMilestone.students >= 1)

      // No student details anywhere in the payload, and none of the teacher's private contact details either.
      const body = JSON.stringify(res.body)
      for (const secret of ['Zebulon', 'Quillfeather', 'zebulon.q@example.com', '9000012345', student.user.id, '9876543210', 'statsToken']) {
        assert.ok(!body.includes(secret), `payload leaked ${secret}`)
      }
      assert.deepEqual(Object.keys(data.recent[0]).sort(), ['amount', 'date', 'product', 'status'])
    })

    it('answers a generic 404 for an unknown or malformed token and when the program is off', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const unknown = await client().get(`/api/t/${'a'.repeat(43)}`)
      const malformed = await client().get('/api/t/short')
      assert.equal(unknown.status, 404)
      assert.equal(malformed.status, 404)
      assert.deepEqual(unknown.body.error, malformed.body.error)
      assert.match(unknown.headers['x-robots-tag'], /noindex/)
      growth.teachersEnabled = false
      assert.equal((await client().get(`/api/t/${teacher.token}`)).status, 404)
    })

    it('stops working at once when the admin rotates the stats link', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      assert.equal((await client().get(`/api/t/${teacher.token}`)).status, 200)
      const rotated = await admin.post(`/api/admin/growth/teachers/${teacher.id}/rotate-token`)
      assert.equal((await client().get(`/api/t/${teacher.token}`)).status, 404)
      assert.equal((await client().get(`/api/t/${rotated.body.data.statsUrl.split('/t/')[1]}`)).status, 200)
    })
  })

  describe('admin access and exports', () => {
    it('requires an admin session with the growth permission on every route', async () => {
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const student = (await registerUser()).agent
      const editor = await staffAgent('editor')
      const routes = [
        ['get', '/api/admin/growth/teachers'],
        ['post', '/api/admin/growth/teachers'],
        ['get', `/api/admin/growth/teachers/${teacher.id}`],
        ['patch', `/api/admin/growth/teachers/${teacher.id}`],
        ['post', `/api/admin/growth/teachers/${teacher.id}/payouts`],
        ['post', `/api/admin/growth/teachers/${teacher.id}/rotate-token`],
        ['get', `/api/admin/growth/teachers/${teacher.id}/export?type=orders`],
        ['get', '/api/admin/growth/bonuses'],
        ['post', `/api/admin/growth/bonuses/${new mongoose.Types.ObjectId()}/approve`],
      ]
      for (const [method, url] of routes) {
        assert.equal((await client()[method](url).send({})).status, 401, `anonymous ${method} ${url}`)
        assert.equal((await student[method](url).send({})).status, 401, `student ${method} ${url}`)
        assert.equal((await editor[method](url).send({})).status, 403, `editor ${method} ${url}`)
      }
    })

    it('answers 404 for the admin routes while the teacher program is off', async () => {
      const admin = await adminAgent()
      growth.teachersEnabled = false
      assert.equal((await admin.get('/api/admin/growth/teachers')).status, 404)
    })

    it('exports orders, payouts and bonuses as CSV without student details', async () => {
      await note('n1')
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const student = await registerUser(client(), { name: 'Hidden Person', email: 'hidden.person@example.com' })
      await landing(student.agent, { teacher: teacher.code })
      await confirm((await place(student.agent, { product: 'n1' })).id)
      const month = new Date().toISOString().slice(0, 7)
      const orders = await admin.get(`/api/admin/growth/teachers/${teacher.id}/export?type=orders&month=${month}`)
      assert.equal(orders.status, 200)
      assert.match(orders.headers['content-type'], /text\/csv/)
      assert.match(orders.text, /Product n1/)
      assert.ok(!orders.text.includes('hidden.person') && !orders.text.includes('Hidden Person'))
      assert.equal((await admin.get(`/api/admin/growth/teachers/${teacher.id}/export?type=payouts`)).status, 200)
      assert.equal((await admin.get(`/api/admin/growth/teachers/${teacher.id}/export?type=bonuses`)).status, 200)
      assert.equal((await admin.get(`/api/admin/growth/teachers/${teacher.id}/export?type=orders&month=2000-13`)).status, 400)
      const other = await admin.get(`/api/admin/growth/teachers/${teacher.id}/export?type=orders&month=2001-01`)
      assert.equal(other.text.trim().split('\n').length, 1) // header only
    })

    it('protects CSV cells from spreadsheet formula injection', () => {
      const csv = toCsv(['a', 'b'], [['=HYPERLINK("x")', 'plain, with comma'], ['+1', '@sum']])
      assert.ok(csv.includes(`'=HYPERLINK`))
      assert.ok(csv.includes('"plain, with comma"'))
      assert.ok(csv.includes("'+1") && csv.includes("'@sum"))
    })
  })

  describe('referral gift cards', () => {
    beforeEach(() => {
      growth.REFUND_WINDOW_DAYS = 0
      growth.GIFT_TIERS = [
        { friends: 2, percent: 10 },
        { friends: 4, percent: 10 },
      ]
    })
    const soon = () => new Date(Date.now() + 5000)

    // A new friend arrives through the referrer link and pays for `slug`.
    async function friendBuys(code, slug = 'n1') {
      const visitor = client()
      await landing(visitor, { ref: code })
      const friend = await registerUser(visitor)
      const { id } = await place(friend.agent, { product: slug })
      await confirm(id)
      return { ...friend, orderId: id }
    }
    const codeOf = async (referrer) => (await referrer.agent.get('/api/growth/referrals/me')).body.data.code
    const giftsOf = (referrer) => ReferralGift.find({ referrer: referrer.user.id }).sort({ tier: 1 })

    it('unlocks a tier at the right number of friends, worth a percent of what they paid', async () => {
      await note('n1', 10000) // each friend pays 5000 after the friend discount
      const referrer = await registerUser()
      const code = await codeOf(referrer)
      await friendBuys(code)
      await runGrowthMaintenance(soon())
      assert.equal(await ReferralGift.countDocuments(), 0)

      await friendBuys(code)
      await runGrowthMaintenance(soon())
      await runGrowthMaintenance(soon()) // awarded once only
      const [gift] = await giftsOf(referrer)
      assert.equal(await ReferralGift.countDocuments(), 1)
      assert.equal(gift.tier, 2)
      assert.equal(gift.status, 'eligible')
      assert.equal(gift.basisPaise, 10000)
      assert.equal(gift.valuePaise, 1000) // 10% of 10000 paise = Rs 10

      // The next tier is worth 10% of what the friends since the last tier paid, not of everything again.
      await friendBuys(code)
      await friendBuys(code)
      await runGrowthMaintenance(soon())
      const gifts = await giftsOf(referrer)
      assert.deepEqual(gifts.map((g) => [g.tier, g.valuePaise]), [[2, 1000], [4, 1000]])
    })

    it('counts the all-subjects pack as three friends', async () => {
      await note('n1', 10000)
      await note('jee-complete-pcm', 40000)
      const referrer = await registerUser()
      const code = await codeOf(referrer)
      await friendBuys(code, 'jee-complete-pcm') // 3 points, paid 35000
      await runGrowthMaintenance(soon())
      let overview = (await referrer.agent.get('/api/growth/referrals/me')).body.data.gifts
      assert.equal(overview.points, 3)
      assert.deepEqual(overview.tiers.map((t) => t.state), ['unlocked', 'locked'])
      assert.equal(overview.tiers[0].value, 35) // 10% of Rs 350
      assert.deepEqual(overview.next, { friends: 4, left: 1, valueSoFar: 0 })

      await friendBuys(code) // one more point reaches tier 4
      await runGrowthMaintenance(soon())
      overview = (await referrer.agent.get('/api/growth/referrals/me')).body.data.gifts
      assert.equal(overview.points, 4)
      assert.equal(overview.tiers[1].state, 'unlocked')
      assert.equal(overview.next, null)
    })

    it('waits out the refund window and shows friends who are still waiting', async () => {
      growth.REFUND_WINDOW_DAYS = 7
      await note('n1', 10000)
      const referrer = await registerUser()
      const code = await codeOf(referrer)
      await friendBuys(code)
      await friendBuys(code)
      await runGrowthMaintenance(later(3))
      assert.equal(await ReferralGift.countDocuments(), 0)
      const waiting = (await referrer.agent.get('/api/growth/referrals/me')).body.data.gifts
      assert.equal(waiting.points, 0)
      assert.equal(waiting.waitingPoints, 2)
      await runGrowthMaintenance(later(8))
      assert.equal(await ReferralGift.countDocuments({ status: 'eligible' }), 1)
    })

    it('does not count a friend who used a teacher code, and sets an unapproved gift back after a refund', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)
      const referrer = await registerUser()
      const code = await codeOf(referrer)
      // This friend followed the referral link but then used a teacher code: the referrer gets nothing.
      const visitor = client()
      await landing(visitor, { ref: code })
      const other = await registerUser(visitor)
      await landing(other.agent, { teacher: teacher.code })
      await confirm((await place(other.agent, { product: 'n1' })).id)

      const a = await friendBuys(code)
      await friendBuys(code)
      await runGrowthMaintenance(soon())
      assert.equal(await ReferralGift.countDocuments({ status: 'eligible' }), 1)

      assert.equal((await refund(admin, a.orderId)).status, 200)
      await runGrowthMaintenance(soon())
      assert.equal((await giftsOf(referrer))[0].status, 'not_eligible')
      const hidden = (await referrer.agent.get('/api/growth/referrals/me')).body.data.gifts
      assert.equal(hidden.tiers[0].state, 'locked')

      await friendBuys(code) // back to two counted friends
      await runGrowthMaintenance(soon())
      assert.equal((await giftsOf(referrer))[0].status, 'eligible')
    })

    it('never changes a gift that was already approved, even after a refund', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const referrer = await registerUser()
      const code = await codeOf(referrer)
      const a = await friendBuys(code)
      await friendBuys(code)
      await runGrowthMaintenance(soon())
      const [gift] = await giftsOf(referrer)
      assert.equal((await admin.post(`/api/admin/referral-gifts/${gift._id}/approve`)).status, 200)
      await refund(admin, a.orderId)
      await runGrowthMaintenance(soon())
      assert.equal((await giftsOf(referrer))[0].status, 'approved')
    })

    it('lets an admin approve and then issue a gift, in that order, with a note', async () => {
      await note('n1', 10000)
      const admin = await adminAgent()
      const referrer = await registerUser()
      const code = await codeOf(referrer)
      await friendBuys(code)
      await friendBuys(code)
      await runGrowthMaintenance(soon())
      const list = await admin.get('/api/admin/referral-gifts')
      assert.equal(list.status, 200)
      assert.equal(list.body.data.length, 1)
      const gift = list.body.data[0]
      assert.equal(gift.student.email, referrer.user.email)
      assert.equal(gift.value, 10)

      const early = await admin.post(`/api/admin/referral-gifts/${gift.id}/issue`).send({ note: 'PVR voucher' })
      assert.equal(early.status, 409)
      assert.equal((await admin.post(`/api/admin/referral-gifts/${gift.id}/approve`)).status, 200)
      assert.equal((await admin.post(`/api/admin/referral-gifts/${gift.id}/approve`)).status, 409)
      assert.equal((await admin.post(`/api/admin/referral-gifts/${gift.id}/issue`).send({})).status, 400)
      const issued = await admin.post(`/api/admin/referral-gifts/${gift.id}/issue`).send({ note: 'PVR voucher sent on WhatsApp' })
      assert.equal(issued.status, 200)
      assert.equal(issued.body.data.status, 'issued')
      const overview = (await referrer.agent.get('/api/growth/referrals/me')).body.data.gifts
      assert.equal(overview.tiers[0].state, 'issued')
    })

    it('needs an admin session with the growth permission, and referrals switched on', async () => {
      const admin = await adminAgent()
      const student = (await registerUser()).agent
      const editor = await staffAgent('editor')
      const id = new mongoose.Types.ObjectId()
      for (const [method, url] of [['get', '/api/admin/referral-gifts'], ['post', `/api/admin/referral-gifts/${id}/approve`], ['post', `/api/admin/referral-gifts/${id}/issue`]]) {
        assert.equal((await client()[method](url).send({})).status, 401, `anonymous ${method} ${url}`)
        assert.equal((await student[method](url).send({})).status, 401, `student ${method} ${url}`)
        assert.equal((await editor[method](url).send({})).status, 403, `editor ${method} ${url}`)
      }
      growth.referralsEnabled = false
      assert.equal((await admin.get('/api/admin/referral-gifts')).status, 404)
    })
  })

  describe('welcome offer', () => {
    const welcome = () => Coupon.create({ code: 'WELCOME10', type: 'percent', value: 10, perUserLimit: 1 })

    it('is applied automatically when nothing else is, for a note and for a cart, signed in or not', async () => {
      await note('w1', 10000)
      await note('w2', 10000)
      await welcome()
      const guest = client()
      const single = (await guest.post('/api/products/w1/quote').send({})).body.data
      assert.equal(single.discountSource, 'coupon')
      assert.equal(single.couponCode, 'WELCOME10')
      assert.equal(single.autoApplied, true)
      assert.equal(single.total, 90)
      assert.match(single.discountLabel, /welcome/i)
      const cart = (await guest.post('/api/cart/quote').send({ items: ['w1', 'w2'] })).body.data
      assert.equal(cart.autoApplied, true)
      assert.equal(cart.discount, 20) // 10% of the 200 total, nothing for buying two together
      assert.equal(cart.total, 180)

      const { agent } = await registerUser()
      const { res, id } = await place(agent, { items: ['w1', 'w2'] })
      assert.equal(res.body.data.checkout.amountPaise, 18000)
      const order = await Order.findById(id)
      assert.equal(order.discountSource, 'coupon')
      assert.equal(order.couponCode, 'WELCOME10')
    })

    it('can be used once per student, then is simply not offered again', async () => {
      await note('w1', 10000)
      await note('w2', 10000)
      await welcome()
      const { agent } = await registerUser()
      await confirm((await place(agent, { product: 'w1' })).id)
      const next = (await agent.post('/api/products/w2/quote').send({})).body.data
      assert.equal(next.discountSource, 'none')
      assert.equal(next.autoApplied, false)
      assert.equal(next.total, 100)
      // Typing it again explains why it is refused, rather than silently doing nothing.
      const typed = await agent.post('/api/products/w2/quote').send({ coupon: 'WELCOME10' })
      assert.equal(typed.status, 400)
      assert.match(typed.body.error.message, /already used/i)
    })

    it('loses to a teacher code or link, and to a friend discount, and a typed coupon replaces it', async () => {
      await note('w1', 10000)
      await welcome()
      await Coupon.create({ code: 'SAVE20', type: 'percent', value: 20 })
      const admin = await adminAgent()
      const teacher = await teacherByAdmin(admin)

      const typedTeacher = (await (await registerUser()).agent.post('/api/products/w1/quote').send({ coupon: teacher.code })).body.data
      assert.equal(typedTeacher.discountSource, 'teacher')
      assert.equal(typedTeacher.total, 85) // 15% off, not 10%
      assert.equal(typedTeacher.autoApplied, false)

      const { agent: linked } = await registerUser()
      await landing(linked, { teacher: teacher.code })
      const saved = (await linked.post('/api/products/w1/quote').send({})).body.data
      assert.equal(saved.discountSource, 'teacher')
      assert.equal(saved.autoApplied, false)
      const { id } = await place(linked, { product: 'w1' })
      const order = await Order.findById(id)
      assert.equal(order.teacherId.toString(), teacher.id)
      assert.equal(order.couponCode, undefined)

      const { friend } = await referrerAndFriend()
      const friendQuote = (await friend.agent.post('/api/products/w1/quote').send({})).body.data
      assert.equal(friendQuote.discountSource, 'referral')
      assert.equal(friendQuote.total, 50) // Rs 50 off, not 10%

      const typedCoupon = (await (await registerUser()).agent.post('/api/products/w1/quote').send({ coupon: 'SAVE20' })).body.data
      assert.equal(typedCoupon.couponCode, 'SAVE20')
      assert.equal(typedCoupon.autoApplied, false)
      assert.equal(typedCoupon.total, 80)
    })

    it('is described in the public features, and can be switched off', async () => {
      await note('w1', 10000)
      assert.equal((await client().get('/api/growth/features')).body.data.welcome, null) // no such coupon yet
      const coupon = await welcome()
      assert.deepEqual((await client().get('/api/growth/features')).body.data.welcome, { code: 'WELCOME10', percent: 10 })

      growth.WELCOME_COUPON = ''
      assert.equal((await client().get('/api/growth/features')).body.data.welcome, null)
      assert.equal((await client().post('/api/products/w1/quote').send({})).body.data.discountSource, 'none')

      growth.WELCOME_COUPON = 'WELCOME10'
      await Coupon.updateOne({ _id: coupon._id }, { $set: { active: false } })
      assert.equal((await client().get('/api/growth/features')).body.data.welcome, null)
      assert.equal((await client().post('/api/products/w1/quote').send({})).body.data.discountSource, 'none')
    })
  })

  describe('feature flags', () => {
    it('hides referrals when the flag is off and ignores friend codes', async () => {
      await note('n1')
      const { referrer, friend, code } = await referrerAndFriend()
      growth.referralsEnabled = false
      assert.equal((await referrer.agent.get('/api/growth/referrals/me')).status, 404)
      const features = await client().get('/api/growth/features')
      assert.equal(features.body.data.referrals, false)
      assert.equal(features.body.data.friendDiscount, undefined)
      const quote = await friend.agent.post('/api/products/n1/quote').send({ coupon: code })
      assert.equal(quote.status, 400) // not a coupon either
      assert.equal((await friend.agent.post('/api/products/n1/quote').send({})).body.data.discountSource, 'none')
    })

    it('reports both flags and the rates in the public features endpoint', async () => {
      const res = await client().get('/api/growth/features')
      assert.deepEqual(res.body.data, { welcome: null, referrals: true, teachers: true, friendDiscount: 50, referrerCredit: 50, refundWindowDays: 7, monthlyCap: 10, giftTiers: growth.GIFT_TIERS, bigPackPoints: 3 })
    })

    it('keeps the unique indexes the programs rely on', async () => {
      const names = async (Model) => (await Model.collection.indexes()).map((i) => i.name)
      assert.ok((await names(Teacher)).some((n) => n.startsWith('code_')))
      assert.ok((await names(Teacher)).some((n) => n.startsWith('statsToken_')))
      assert.ok((await names(Referral)).some((n) => n.startsWith('referred_')))
      assert.ok((await names(TeacherBonus)).includes('teacher_1_milestone_1'))
      assert.ok((await names(ReferralGift)).includes('referrer_1_tier_1'))
      assert.ok((await names(CreditEntry)).includes('type_1_referral_1'))
      assert.ok((await names(CreditEntry)).includes('type_1_order_1'))
      assert.ok((await names(User)).includes('referralCode_1'))
    })
  })
})
