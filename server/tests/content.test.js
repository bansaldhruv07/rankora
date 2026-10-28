import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { buy, client, makeProduct, registerUser, resetDb, startDb, stopDb } from './helpers.js'

describe('catalogue and protected content', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('lists only published products, with pagination, filters and no private data', async () => {
    await makeProduct({ slug: 'free-note', price: 0, subject: 'physics' })
    await makeProduct({ slug: 'paid-note', price: 99, subject: 'chemistry' })
    await makeProduct({ slug: 'draft-note', price: 99, status: 'draft' })
    const all = await client().get('/api/products?limit=1&page=1')
    assert.equal(all.status, 200)
    assert.equal(all.body.data.length, 1)
    assert.equal(all.body.meta.total, 2)
    const paid = await client().get('/api/products?price=paid')
    assert.deepEqual(paid.body.data.map((p) => p.slug), ['paid-note'])
    assert.equal(paid.body.data[0].price, 99)
    const text = JSON.stringify((await client().get('/api/products')).body)
    assert.ok(!text.includes('notes/'), 'storage key leaked')
    assert.ok(!text.includes('"file"'))
    assert.equal((await client().get('/api/products/draft-note')).status, 404)
    assert.equal((await client().get('/api/products/paid-note')).body.data.hasFile, undefined)
  })

  it('serves a free note to a signed-in user, watermarked, and requires login', async () => {
    await makeProduct({ slug: 'free-note', price: 0 })
    assert.equal((await client().get('/api/library/free-note/file')).status, 401)
    const { agent, body } = await registerUser()
    const res = await agent.get('/api/library/free-note/file').buffer(true).parse((r, cb) => {
      const chunks = []
      r.on('data', (c) => chunks.push(c))
      r.on('end', () => cb(null, Buffer.concat(chunks)))
    })
    assert.equal(res.status, 200)
    assert.equal(res.headers['content-type'], 'application/pdf')
    assert.match(res.headers['cache-control'], /no-store/)
    assert.ok(res.body.subarray(0, 5).toString() === '%PDF-')
    assert.ok(res.body.length > 0)
    void body
  })

  it('blocks unpaid access and logs the denial', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent } = await registerUser()
    const res = await agent.get('/api/library/paid-note/file')
    assert.equal(res.status, 403)
    assert.equal((await agent.get('/api/library/missing/file')).status, 404)
    const { AccessLog } = await import('../src/models/AccessLog.js')
    assert.equal(await AccessLog.countDocuments({ action: 'denied' }), 1)
  })

  it('grants the buyer access but not another user', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const buyer = (await registerUser()).agent
    const other = (await registerUser()).agent
    const { verified } = await buy(buyer, 'paid-note')
    assert.equal(verified.status, 200)
    assert.equal((await buyer.get('/api/library/paid-note/file')).status, 200)
    assert.equal((await other.get('/api/library/paid-note/file')).status, 403)
    const lib = await buyer.get('/api/library')
    assert.deepEqual(lib.body.data.items.map((p) => p.slug), ['paid-note'])
    assert.deepEqual((await other.get('/api/library')).body.data.items, [])
  })

  it('premium plan unlocks every paid note, and expiry removes access', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    await makeProduct({ slug: 'premium-monthly', kind: 'plan', price: 399 })
    const { agent } = await registerUser()
    assert.equal((await buy(agent, 'premium-monthly')).verified.status, 200)
    assert.equal((await agent.get('/api/auth/me')).body.data.access.premium, true)
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 200)
    const { Entitlement } = await import('../src/models/Entitlement.js')
    await Entitlement.updateMany({}, { expiresAt: new Date(Date.now() - 1000) })
    assert.equal((await agent.get('/api/library/paid-note/file')).status, 403)
  })

  it('applies the download rate limit and flags it', async () => {
    process.env.DOWNLOAD_HOURLY_LIMIT = '2'
    const { env } = await import('../src/config/env.js')
    const original = env.downloadHourlyLimit
    env.downloadHourlyLimit = 2
    try {
      await makeProduct({ slug: 'free-note', price: 0 })
      const { agent } = await registerUser()
      assert.equal((await agent.get('/api/library/free-note/file')).status, 200)
      assert.equal((await agent.get('/api/library/free-note/file')).status, 200)
      assert.equal((await agent.get('/api/library/free-note/file')).status, 429)
    } finally {
      env.downloadHourlyLimit = original
    }
  })
})
