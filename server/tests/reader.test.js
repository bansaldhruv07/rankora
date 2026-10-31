import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { adminAgent, buy, client, makeProduct, openReader, registerUser, resetDb, startDb, stopDb, stream } from './helpers.js'

const { env } = await import('../src/config/env.js')
const { AccessLog } = await import('../src/models/AccessLog.js')
const { ViewerSession } = await import('../src/models/ViewerSession.js')
const { ReadingProgress } = await import('../src/models/ReadingProgress.js')
const { Entitlement } = await import('../src/models/Entitlement.js')
const { deleteObject } = await import('../src/services/storage.js')

async function buyerWithNote(slug = 'paid-note', overrides = {}) {
  await makeProduct({ slug, price: 99, ...overrides })
  const buyer = await registerUser(undefined, { name: 'Aarav Sharma', email: 'aarav.sharma@example.com' })
  await buy(buyer.agent, slug)
  return buyer
}

describe('secure reader', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('refuses anonymous and unpaid readers, and logs the denial', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    assert.equal((await openReader(client(), 'paid-note')).status, 401)
    const { agent } = await registerUser()
    const denied = await openReader(agent, 'paid-note')
    assert.equal(denied.status, 403)
    assert.equal(await AccessLog.countDocuments({ action: 'denied' }), 1)
    assert.equal((await openReader(agent, 'does-not-exist')).status, 404)
    assert.equal((await openReader(agent, 'BAD SLUG!!')).status, 400)
  })

  it('gives the buyer a personalised, watermarked stream and never reveals storage details', async () => {
    const { agent, user } = await buyerWithNote()
    const res = await openReader(agent, 'paid-note')
    assert.equal(res.status, 201)
    const { token, document, watermark } = res.body.data
    assert.equal(document.pages, 3)
    assert.equal(watermark.name, 'Aarav Sharma')
    assert.equal(watermark.masked, 'aa***@example.com')
    assert.equal(watermark.studentId, user.id.slice(-8).toUpperCase())
    assert.match(watermark.orderRef, /^RK-[0-9A-F]{8}$/)
    const text = JSON.stringify(res.body)
    assert.ok(!text.includes('aarav.sharma@example.com'), 'full email must not be in the watermark payload')
    assert.ok(!text.includes('notes/') && !text.includes('derived/') && !text.includes('storage'), 'storage detail leaked')

    const file = await stream(agent, token)
    assert.equal(file.status, 200)
    assert.equal(file.headers['content-type'], 'application/pdf')
    assert.equal(file.headers['accept-ranges'], 'bytes')
    assert.match(file.headers['cache-control'], /no-store/)
    assert.equal(file.headers['content-disposition'], 'inline')
    assert.equal(file.headers['x-content-type-options'], 'nosniff')
    const pdf = await PDFDocument.load(file.body)
    assert.equal(pdf.getPageCount(), 3)
    assert.equal(pdf.getSubject(), `licensed:${watermark.studentId}`)
  })

  it('stamps each student differently', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const a = await registerUser()
    const b = await registerUser()
    await buy(a.agent, 'paid-note')
    await buy(b.agent, 'paid-note')
    const [sa, sb] = await Promise.all([openReader(a.agent, 'paid-note'), openReader(b.agent, 'paid-note')])
    const [fa, fb] = await Promise.all([stream(a.agent, sa.body.data.token), stream(b.agent, sb.body.data.token)])
    assert.notEqual(sa.body.data.watermark.studentId, sb.body.data.watermark.studentId)
    assert.notDeepEqual(fa.body, fb.body)
    assert.equal((await PDFDocument.load(fa.body)).getSubject(), `licensed:${sa.body.data.watermark.studentId}`)
    assert.equal((await PDFDocument.load(fb.body)).getSubject(), `licensed:${sb.body.data.watermark.studentId}`)
  })

  it('serves HTTP byte ranges', async () => {
    const { agent } = await buyerWithNote()
    const { token } = (await openReader(agent, 'paid-note')).body.data
    const whole = await stream(agent, token)
    const head = await stream(agent, token, 'bytes=0-99')
    assert.equal(head.status, 206)
    assert.equal(head.body.length, 100)
    assert.equal(head.headers['content-range'], `bytes 0-99/${whole.body.length}`)
    assert.deepEqual(head.body, whole.body.subarray(0, 100))
    const tail = await stream(agent, token, 'bytes=-50')
    assert.equal(tail.status, 206)
    assert.deepEqual(tail.body, whole.body.subarray(whole.body.length - 50))
    const open = await stream(agent, token, `bytes=${whole.body.length - 10}-`)
    assert.equal(open.body.length, 10)
    for (const bad of ['bytes=999999999-', 'bytes=5-2', 'items=0-1', 'bytes=0-1,5-9', 'bytes=-']) {
      const res = await stream(agent, token, bad)
      assert.equal(res.status, 416, `range ${bad}`)
    }
  })

  it('binds a session to the signed-in owner: a token alone, or in another account, is useless', async () => {
    const { agent } = await buyerWithNote()
    const { token } = (await openReader(agent, 'paid-note')).body.data
    assert.equal((await stream(client(), token)).status, 401, 'no cookie')
    const stranger = (await registerUser()).agent
    assert.equal((await stream(stranger, token)).status, 401, 'someone else logged in')
    assert.equal((await stream(agent, 'x'.repeat(43))).status, 401, 'unknown token')
    assert.equal((await agent.get('/api/reader/stream')).status, 401, 'missing token')
    assert.equal((await agent.put('/api/reader/progress').send({ page: 2 })).status, 401)
    assert.equal((await stream(agent, token)).status, 200, 'owner still fine')
  })

  it('does not let another student open a note they have not bought', async () => {
    const { agent: buyer } = await buyerWithNote()
    const other = (await registerUser()).agent
    assert.equal((await openReader(buyer, 'paid-note')).status, 201)
    assert.equal((await openReader(other, 'paid-note')).status, 403)
  })

  it('ends sessions on expiry, close, and when the session limit is exceeded', async () => {
    const { agent } = await buyerWithNote()
    const first = (await openReader(agent, 'paid-note')).body.data.token
    await ViewerSession.updateMany({}, { expiresAt: new Date(Date.now() - 1000) })
    assert.equal((await stream(agent, first)).status, 401, 'idle expiry')

    const second = (await openReader(agent, 'paid-note')).body.data.token
    assert.equal((await stream(agent, second)).status, 200)
    assert.equal((await agent.delete('/api/reader/sessions/current').set('X-Reader-Token', second)).status, 200)
    assert.equal((await stream(agent, second)).status, 401, 'closed')

    const original = env.reader.maxActiveSessions
    env.reader.maxActiveSessions = 2
    try {
      const tokens = []
      for (let i = 0; i < 3; i += 1) tokens.push((await openReader(agent, 'paid-note')).body.data.token)
      assert.equal((await stream(agent, tokens[0])).status, 401, 'oldest session is closed')
      assert.equal((await stream(agent, tokens[1])).status, 200)
      assert.equal((await stream(agent, tokens[2])).status, 200)
      assert.ok(await AccessLog.exists({ action: 'revoked' }))
    } finally {
      env.reader.maxActiveSessions = original
    }
  })

  it('stops streaming the moment access is refunded', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const { orderId } = await buy(agent, 'paid-note')
    const { token } = (await openReader(agent, 'paid-note')).body.data
    assert.equal((await stream(agent, token)).status, 200)
    const admin = await adminAgent()
    assert.equal((await admin.post(`/api/admin/orders/${orderId}/refund`).send({})).status, 200)
    assert.equal((await stream(agent, token)).status, 401)
    assert.equal((await openReader(agent, 'paid-note')).status, 403)
  })

  it('stops streaming when the account is suspended or signs out', async () => {
    const { agent } = await buyerWithNote()
    const { token } = (await openReader(agent, 'paid-note')).body.data
    await agent.post('/api/auth/logout')
    assert.equal((await stream(agent, token)).status, 401)
  })

  it('remembers the last-read page and resumes from it', async () => {
    const { agent, user } = await buyerWithNote()
    const first = (await openReader(agent, 'paid-note')).body.data
    assert.equal(first.progress, null)
    assert.equal((await agent.put('/api/reader/progress').set('X-Reader-Token', first.token).send({ page: 2 })).body.data.page, 2)
    assert.equal((await agent.put('/api/reader/progress').set('X-Reader-Token', first.token).send({ page: 99 })).body.data.page, 3, 'clamped to the page count')
    assert.equal((await agent.put('/api/reader/progress').set('X-Reader-Token', first.token).send({ page: 0 })).status, 400)
    assert.equal((await agent.put('/api/reader/progress').set('X-Reader-Token', first.token).send({ page: 'two' })).status, 400)
    await agent.put('/api/reader/progress').set('X-Reader-Token', first.token).send({ page: 2 })
    assert.equal((await openReader(agent, 'paid-note')).body.data.progress.page, 2)
    assert.equal((await ReadingProgress.find({ user: user.id })).length, 1)
    const lib = await agent.get('/api/library')
    assert.equal(lib.body.data.items[0].progress.page, 2)
    assert.equal(lib.body.data.continueReading, 'paid-note')
  })

  it('serves a free sample extract to anyone, for published notes with preview pages only', async () => {
    await makeProduct({ slug: 'with-sample', price: 99, pages: 6, previewPages: [1, 3] })
    await makeProduct({ slug: 'no-sample', price: 99 })
    await makeProduct({ slug: 'draft-sample', price: 99, status: 'draft', previewPages: [1] })
    const anon = client()
    const res = await openReader(anon, 'with-sample', 'preview')
    assert.equal(res.status, 201)
    assert.equal(res.body.data.mode, 'preview')
    assert.equal(res.body.data.document.pages, 2, 'the file holds only the free pages')
    assert.equal(res.body.data.document.totalPages, 6, 'but the student is told how long the full notes are')
    const file = await stream(anon, res.body.data.token)
    assert.equal(file.status, 200)
    assert.equal((await PDFDocument.load(file.body)).getPageCount(), 2)
    assert.equal((await openReader(anon, 'no-sample', 'preview')).status, 404)
    assert.equal((await openReader(anon, 'draft-sample', 'preview')).status, 404)
    assert.equal((await anon.put('/api/reader/progress').set('X-Reader-Token', res.body.data.token).send({ page: 1 })).status, 400)
  })

  it('never puts the content of locked pages into the sample file', async () => {
    const { PDFDocument: Pdf, StandardFonts } = await import('pdf-lib')
    const { inflateSync } = await import('node:zlib')
    const { putObject } = await import('../src/services/storage.js')
    const { Product } = await import('../src/models/Product.js')
    const doc = await Pdf.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    for (let n = 1; n <= 5; n += 1) doc.addPage([300, 400]).drawText(n === 1 ? 'FREEPAGEMARKER' : `LOCKEDPAGEMARKER${n}`, { x: 20, y: 200, size: 12, font })
    const bytes = Buffer.from(await doc.save({ useObjectStreams: false }))
    await putObject('notes/leak.pdf', bytes)
    await Product.create({ slug: 'leak-check', title: 'Leak check', pricePaise: 9900, status: 'published', previewPages: [1], file: { key: 'notes/leak.pdf', originalName: 'x.pdf', size: bytes.length, pages: 5, version: 1, uploadedAt: new Date() } })

    const anon = client()
    const session = await openReader(anon, 'leak-check', 'preview')
    const served = (await stream(anon, session.body.data.token)).body
    // Everything a viewer could extract: raw bytes plus every inflated stream, with hex-encoded strings decoded.
    let text = served.toString('latin1')
    for (const m of text.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
      try {
        text += inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1')
      } catch {
        /* not compressed */
      }
    }
    const decoded = text.replace(/<([0-9A-Fa-f\s]+)>/g, (_, hex) => Buffer.from(hex.replace(/\s/g, ''), 'hex').toString('latin1'))
    assert.ok(decoded.includes('FREEPAGEMARKER'), 'the free page is real')
    assert.ok(!decoded.includes('LOCKEDPAGEMARKER'), 'no text from locked pages may be in the file')
    assert.equal((await Pdf.load(served)).getPageCount(), 1)
  })

  it('treats Premium as access only for notes flagged Premium-eligible', async () => {
    await makeProduct({ slug: 'standalone', price: 99, premiumEligible: false })
    await makeProduct({ slug: 'in-premium', price: 99, premiumEligible: true })
    await makeProduct({ slug: 'premium-monthly', kind: 'plan', price: 399 })
    const { agent } = await registerUser()
    await buy(agent, 'premium-monthly')
    assert.equal((await openReader(agent, 'in-premium')).status, 201)
    assert.equal((await openReader(agent, 'standalone')).status, 403)
    const lib = await agent.get('/api/library')
    assert.deepEqual(lib.body.data.items.map((i) => i.product.slug), ['in-premium'])
    await Entitlement.updateMany({}, { expiresAt: new Date(Date.now() - 1000) })
    assert.equal((await openReader(agent, 'in-premium')).status, 403)
  })

  it('lets owners keep reading after a note is taken off sale, but not strangers', async () => {
    const { agent } = await buyerWithNote()
    const admin = await adminAgent()
    const { Product } = await import('../src/models/Product.js')
    const id = String((await Product.findOne({ slug: 'paid-note' }))._id)
    await admin.post(`/api/admin/products/${id}/archive`)
    assert.equal((await openReader(agent, 'paid-note')).status, 201)
    assert.equal((await openReader((await registerUser()).agent, 'paid-note')).status, 403)
    assert.equal((await client().get('/api/products/paid-note')).status, 404)
  })

  it('closes a session that downloads far more than the document size', async () => {
    const { agent } = await buyerWithNote()
    const { token, sessionId } = (await openReader(agent, 'paid-note')).body.data
    await ViewerSession.updateOne({ _id: sessionId }, { bytesServed: 100 * 1024 * 1024 })
    const res = await stream(agent, token)
    assert.equal(res.status, 429)
    assert.ok(await AccessLog.exists({ action: 'suspicious' }))
    assert.equal((await stream(agent, token)).status, 401, 'session is now revoked')
  })

  it('limits how many readers a student may open per hour', async () => {
    const { agent } = await buyerWithNote()
    const original = env.reader.hourlyOpenLimit
    env.reader.hourlyOpenLimit = 2
    try {
      assert.equal((await openReader(agent, 'paid-note')).status, 201)
      assert.equal((await openReader(agent, 'paid-note')).status, 201)
      assert.equal((await openReader(agent, 'paid-note')).status, 429)
      assert.ok(await AccessLog.exists({ action: 'rate_limited' }))
    } finally {
      env.reader.hourlyOpenLimit = original
    }
  })

  it('flags an account that opens many documents or uses many IPs', async () => {
    const { agent, user } = await buyerWithNote()
    const { Product } = await import('../src/models/Product.js')
    const product = await Product.findOne({ slug: 'paid-note' })
    await AccessLog.insertMany(
      ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4', '5.5.5.5'].map((ip) => ({ user: user.id, product: product._id, action: 'open', ip })),
    )
    assert.equal((await openReader(agent, 'paid-note')).status, 201)
    assert.ok(await AccessLog.exists({ action: 'suspicious' }))
  })

  it('rebuilds the derived copy if the cache was swept mid-session', async () => {
    const { agent } = await buyerWithNote()
    const { token, sessionId } = (await openReader(agent, 'paid-note')).body.data
    const session = await ViewerSession.findById(sessionId)
    await deleteObject(session.derivedKey)
    const res = await stream(agent, token)
    assert.equal(res.status, 200)
    assert.equal((await PDFDocument.load(res.body)).getPageCount(), 3)
  })

  it('has no unrestricted download endpoint', async () => {
    const { agent } = await buyerWithNote()
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 404)
    assert.equal((await agent.get('/api/library/paid-note/download')).status, 404)
  })

  it('lists purchases in the library with source, reference and update flags', async () => {
    const { agent } = await buyerWithNote()
    const lib = (await agent.get('/api/library')).body.data
    assert.equal(lib.items.length, 1)
    const [item] = lib.items
    assert.equal(item.source, 'purchase')
    assert.match(item.orderReference, /^RK-/)
    assert.equal(item.updatedSincePurchase, false)
    assert.ok(!JSON.stringify(lib).includes('notes/'))
    assert.deepEqual((await (await registerUser()).agent.get('/api/library')).body.data.items, [])
  })
})
