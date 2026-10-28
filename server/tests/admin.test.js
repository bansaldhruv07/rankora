import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { adminAgent, client, makeProduct, registerUser, resetDb, startDb, stopDb } from './helpers.js'

const newProduct = { slug: 'new-note', title: 'New Note', price: 149.5, subject: 'physics', chapter: 'Optics', type: 'notes', difficulty: 'Easy' }

describe('admin content management', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('blocks anonymous users and students from every admin route', async () => {
    const { agent } = await registerUser()
    for (const caller of [client(), agent]) {
      const expected = caller === agent ? 403 : 401
      assert.equal((await caller.get('/api/admin/products')).status, expected)
      assert.equal((await caller.post('/api/admin/products').send(newProduct)).status, expected)
      assert.equal((await caller.get('/api/admin/orders')).status, expected)
      assert.equal((await caller.get('/api/admin/access-logs')).status, expected)
    }
  })

  it('creates, edits, uploads, publishes and unpublishes a product', async () => {
    const admin = await adminAgent()
    const created = await admin.post('/api/admin/products').send({ ...newProduct, status: 'published', role: 'x' })
    assert.equal(created.status, 201)
    assert.equal(created.body.data.status, 'draft', 'status must not be mass-assignable on create')
    assert.equal(created.body.data.price, 149.5)
    const id = created.body.data.id

    assert.equal((await admin.post(`/api/admin/products/${id}/publish`)).status, 409, 'needs a file first')
    const pdf = await PDFDocument.create()
    pdf.addPage()
    const bytes = Buffer.from(await pdf.save())
    assert.equal((await admin.put(`/api/admin/products/${id}/file`).set('Content-Type', 'application/pdf').send(Buffer.from('not a pdf at all'))).status, 400)
    const up = await admin.put(`/api/admin/products/${id}/file`).set('Content-Type', 'application/pdf').send(bytes)
    assert.equal(up.status, 200)
    assert.equal(up.body.data.hasFile, true)
    assert.ok(!JSON.stringify(up.body).includes('notes/'), 'private key leaked')

    const patched = await admin.patch(`/api/admin/products/${id}`).send({ price: 199, title: 'Renamed' })
    assert.equal(patched.body.data.price, 199)
    assert.equal((await admin.patch(`/api/admin/products/${id}`).send({ price: -5 })).status, 400)

    assert.equal((await client().get('/api/products/new-note')).status, 404)
    assert.equal((await admin.post(`/api/admin/products/${id}/publish`)).body.data.status, 'published')
    assert.equal((await client().get('/api/products/new-note')).status, 200)
    await admin.post(`/api/admin/products/${id}/unpublish`)
    assert.equal((await client().get('/api/products/new-note')).status, 404)
    assert.equal((await admin.get('/api/admin/products/zzz')).status, 404)
    assert.equal((await admin.patch('/api/admin/products/not-an-id').send({ title: 'x' })).status, 404)
  })

  it('lists and filters orders and access logs for admins', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent, body } = await registerUser()
    await agent.post('/api/orders').send({ product: 'paid-note' })
    await agent.get('/api/library/paid-note/file')
    const admin = await adminAgent()
    const orders = await admin.get(`/api/admin/orders?status=pending&email=${body.email}`)
    assert.equal(orders.status, 200)
    assert.equal(orders.body.meta.total, 1)
    assert.equal(orders.body.data[0].user.email, body.email)
    assert.ok(!JSON.stringify(orders.body).includes('passwordHash'))
    assert.equal((await admin.get('/api/admin/orders?status=bogus')).status, 400)
    const logs = await admin.get('/api/admin/access-logs?action=denied')
    assert.equal(logs.body.data.length, 1)
    assert.equal((await admin.get('/api/admin/orders/not-an-id')).status, 404)
  })
})
