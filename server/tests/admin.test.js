import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import jwt from 'jsonwebtoken'
import { PDFDocument } from 'pdf-lib'
import { adminAgent, app, buy, client, makeProduct, openReader, registerUser, request, resetDb, samplePdf, staffAgent, startDb, stopDb, stream } from './helpers.js'

const { env } = await import('../src/config/env.js')
const { Product } = await import('../src/models/Product.js')
const { AuditLog } = await import('../src/models/AuditLog.js')
const { User } = await import('../src/models/User.js')
const { statObject } = await import('../src/services/storage.js')

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)])

const upload = (agent, bytes, { filename = 'Class 11 - Kinematics_notes.pdf', query = '' } = {}) =>
  agent.post(`/api/admin/products/upload${query}`).set('Content-Type', 'application/pdf').set('X-Filename', encodeURIComponent(filename)).send(bytes)

async function titledPdf(title, pages = 2) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(title)
  for (let i = 0; i < pages; i += 1) pdf.addPage()
  return Buffer.from(await pdf.save())
}

describe('admin access control', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  const ROUTES = [
    ['get', '/api/admin/products'],
    ['post', '/api/admin/products'],
    ['get', '/api/admin/coupons'],
    ['get', '/api/admin/orders'],
    ['get', '/api/admin/stats'],
    ['get', '/api/admin/users'],
    ['get', '/api/admin/support'],
    ['get', '/api/admin/access-logs'],
    ['get', '/api/admin/audit-logs'],
    ['get', '/api/admin/viewer-sessions'],
  ]

  it('rejects anonymous visitors and ordinary students on every admin route', async () => {
    const { agent } = await registerUser()
    for (const caller of [client(), agent]) {
      for (const [method, path] of ROUTES) {
        const res = await caller[method](path).send({})
        assert.equal(res.status, 401, `${method} ${path}`)
      }
    }
  })

  it('never gives a student an admin session, even with the right password', async () => {
    const { agent, body } = await registerUser()
    const res = await agent.post('/api/admin/auth/login').send({ email: body.email, password: body.password })
    assert.equal(res.status, 401)
    assert.equal((await agent.get('/api/admin/auth/me')).status, 401)
    assert.equal((await client().post('/api/admin/auth/login').send({ email: 'nobody@example.com', password: 'whatever-123' })).status, 401)
  })

  it('does not accept the role from a request body', async () => {
    const reg = await client().post('/api/auth/register').send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'correct-horse-9', role: 'admin' })
    assert.equal(reg.status, 201)
    assert.equal(reg.body.data.user.role, 'student')
    const agent = client()
    await agent.post('/api/auth/login').send({ email: 'sneaky@example.com', password: 'correct-horse-9' })
    await agent.patch('/api/auth/me').send({ name: 'Sneaky Two', role: 'admin' })
    assert.equal((await User.findOne({ email: 'sneaky@example.com' })).role, 'student')
    assert.equal((await agent.post('/api/admin/auth/login').send({ email: 'sneaky@example.com', password: 'correct-horse-9' })).status, 401)
  })

  it('keeps student and admin tokens apart', async () => {
    const { user } = await registerUser()
    await User.updateOne({ _id: user.id }, { role: 'admin' })
    const studentToken = jwt.sign({ sub: user.id, tv: 0 }, env.jwtSecret)
    const adminToken = jwt.sign({ sub: user.id, tv: 0, aud: 'admin' }, env.jwtSecret)
    const call = (path, cookie) => request(app).get(path).set('X-Requested-With', 'jeedge').set('Cookie', cookie)
    assert.equal((await call('/api/admin/products', `rk_admin=${studentToken}`)).status, 401, 'student token as admin session')
    assert.equal((await call('/api/auth/me', `rk_token=${adminToken}`)).status, 401, 'admin token as student session')
    assert.equal((await call('/api/admin/products', `rk_admin=${adminToken}`)).status, 200, 'genuine admin token')
    assert.equal((await call('/api/admin/products', `rk_admin=${jwt.sign({ sub: user.id, tv: 0, aud: 'admin' }, 'y'.repeat(48))}`)).status, 401, 'forged signature')
  })

  it('re-reads the role on every request, so demotion applies immediately', async () => {
    const admin = await staffAgent('admin')
    assert.equal((await admin.get('/api/admin/products')).status, 200)
    await User.updateOne({ role: 'admin' }, { role: 'student' })
    assert.equal((await admin.get('/api/admin/products')).status, 403)
  })

  it('limits editors to content work', async () => {
    const editor = await staffAgent('editor')
    assert.equal((await editor.get('/api/admin/products')).status, 200)
    assert.equal((await editor.get('/api/admin/support')).status, 200)
    for (const [, path] of ROUTES.filter(([, p]) => !p.endsWith('/products') && !p.endsWith('/support'))) {
      assert.equal((await editor.get(path)).status, 403, path)
    }
    assert.equal((await editor.post('/api/admin/coupons').send({ code: 'EDITOR90', type: 'percent', value: 90 })).status, 403)
    assert.equal((await editor.post('/api/admin/orders/507f1f77bcf86cd799439011/refund').send({})).status, 403)
  })

  it('requires the CSRF header on state-changing admin requests', async () => {
    const { user, body } = await registerUser()
    await User.updateOne({ _id: user.id }, { role: 'admin' })
    const noHeader = await request(app).post('/api/admin/auth/login').send({ email: body.email, password: body.password })
    assert.equal(noHeader.status, 403)
    const login = await request(app).post('/api/admin/auth/login').set('X-Requested-With', 'jeedge').send({ email: body.email, password: body.password })
    assert.equal(login.status, 200)
    const cookies = login.headers['set-cookie']
    assert.match(cookies.join(';'), /rk_admin=.*Path=\/api\/admin.*HttpOnly/, 'admin cookie is HttpOnly and scoped to /api/admin')
    const forged = await request(app).post('/api/admin/products').set('Cookie', cookies).send({ title: 'Forged cross-site request', price: 1 })
    assert.equal(forged.status, 403)
    assert.equal(await Product.countDocuments(), 0)
  })

  it('records admin actions in the audit log, visible only to admins', async () => {
    const admin = await adminAgent()
    await admin.post('/api/admin/products').send({ title: 'Audited', price: 10 })
    assert.ok(await AuditLog.exists({ action: 'admin.login' }))
    assert.ok(await AuditLog.exists({ action: 'product.create' }))
    const logs = await admin.get('/api/admin/audit-logs')
    assert.equal(logs.status, 200)
    assert.ok(logs.body.data.some((l) => l.action === 'product.create'))
    assert.equal((await (await staffAgent('editor')).get('/api/admin/audit-logs')).status, 403)
  })

  it('signs the admin out of every session on logout', async () => {
    const admin = await adminAgent()
    assert.equal((await admin.post('/api/admin/auth/logout')).status, 200)
    assert.equal((await admin.get('/api/admin/products')).status, 401)
  })
})

describe('admin content management', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('creates a draft from an uploaded PDF and reads its metadata', async () => {
    const admin = await adminAgent()
    const res = await upload(admin, await titledPdf('Kinematics Revision', 4), { query: '?subject=physics&classLevel=11' })
    assert.equal(res.status, 201)
    const p = res.body.data
    assert.equal(p.title, 'Kinematics Revision', 'title read from the PDF metadata')
    assert.equal(p.pages, 4)
    assert.equal(p.status, 'draft')
    assert.equal(p.subject, 'physics')
    assert.equal(p.classLevel, '11')
    assert.equal(p.hasFile, true)
    assert.equal(p.premiumEligible, true, 'included in Premium by default')
    assert.equal(p.price, 99, 'default selling price')
    assert.equal(p.mrp, 199, 'default original price')
    assert.ok(!JSON.stringify(res.body).includes('notes/'), 'storage key leaked')
    assert.equal((await client().get(`/api/products/${p.slug}`)).status, 404, 'drafts are not public')
  })

  it('falls back to the file name for the title and keeps slugs unique across a bulk upload', async () => {
    const admin = await adminAgent()
    const bytes = await samplePdf(2)
    const slugs = []
    for (let i = 0; i < 3; i += 1) {
      const res = await upload(admin, bytes, { filename: 'Class 12 - Optics_notes.pdf' })
      assert.equal(res.status, 201)
      assert.equal(res.body.data.title, 'Class 12 Optics notes')
      slugs.push(res.body.data.slug)
    }
    assert.equal(new Set(slugs).size, 3)
  })

  it('rejects files that are not real, readable PDFs', async () => {
    const admin = await adminAgent()
    const real = await samplePdf(2)
    const cases = {
      'plain text named .pdf': Buffer.from('this is not a pdf'),
      'html named .pdf': Buffer.from('<html><script>alert(1)</script></html>'),
      'PDF header only': Buffer.from('%PDF-1.7\nnothing else'),
      truncated: real.subarray(0, Math.floor(real.length / 2)),
      'png image': PNG,
      empty: Buffer.alloc(0),
    }
    for (const [name, bytes] of Object.entries(cases)) {
      const res = await upload(admin, bytes, { filename: 'evil.pdf' })
      assert.ok([400, 415].includes(res.status), `${name}: got ${res.status}`)
    }
    assert.equal(await Product.countDocuments(), 0, 'nothing was created')
    const wrongType = await admin.post('/api/admin/products/upload').set('Content-Type', 'text/html').send(real)
    assert.equal(wrongType.status, 400)
  })

  it('enforces the maximum upload size', async () => {
    const admin = await adminAgent()
    const original = env.maxPdfBytes
    env.maxPdfBytes = 500
    try {
      const res = await upload(admin, await samplePdf(10))
      assert.equal(res.status, 413)
    } finally {
      env.maxPdfBytes = original
    }
    assert.equal(await Product.countDocuments(), 0)
  })

  it('stores PDFs under server-chosen keys, whatever the client claims', async () => {
    const admin = await adminAgent()
    const res = await upload(admin, await samplePdf(1), { filename: '../../../etc/passwd.pdf' })
    assert.equal(res.status, 201)
    const stored = await Product.findById(res.body.data.id).select('+file')
    assert.match(stored.file.key, /^notes\/[0-9a-f]{24}-v1-[0-9a-f]{12}\.pdf$/)
    assert.ok(await statObject(stored.file.key))
    const bad = await upload(admin, await samplePdf(1), { filename: '%E0%A4%A.pdf' })
    assert.equal(bad.status, 201, 'a malformed encoded name must not crash the server')
  })

  it('sets the free sample for many notes at once, always keeping a page locked', async () => {
    const admin = await adminAgent()
    await makeProduct({ slug: 's1', pages: 5 })
    await makeProduct({ slug: 's2', pages: 3, previewPages: [3] })
    await makeProduct({ slug: 's3', pages: 1 })
    const first = await admin.post('/api/admin/products/sample-pages').send({ count: 2, scope: 'empty' })
    assert.equal(first.status, 200)
    assert.deepEqual(first.body.data, { changed: 1, total: 3 }) // s1 only: s2 already had one, s3 has a single page
    assert.deepEqual((await Product.findOne({ slug: 's1' })).previewPages, [1, 2])
    assert.deepEqual((await Product.findOne({ slug: 's2' })).previewPages, [3])
    const all = await admin.post('/api/admin/products/sample-pages').send({ count: 10, scope: 'all' })
    assert.equal(all.status, 200)
    assert.deepEqual((await Product.findOne({ slug: 's1' })).previewPages, [1, 2, 3, 4]) // never the whole 5 pages
    assert.deepEqual((await Product.findOne({ slug: 's2' })).previewPages, [1, 2])
    assert.deepEqual((await Product.findOne({ slug: 's3' })).previewPages, [])
    assert.equal((await admin.post('/api/admin/products/sample-pages').send({ count: 0 })).status, 200)
    assert.deepEqual((await Product.findOne({ slug: 's1' })).previewPages, [])
    assert.equal((await admin.post('/api/admin/products/sample-pages').send({ count: -1 })).status, 400)
    assert.equal((await client().post('/api/admin/products/sample-pages').send({ count: 1 })).status, 401)
    // A single note can now be given a longer sample than 30 pages.
    const long = await admin.patch(`/api/admin/products/${(await Product.findOne({ slug: 's1' }))._id}`).send({ previewPages: [1, 2, 3, 4] })
    assert.equal(long.status, 200)
  })

  it('edits metadata and validates prices', async () => {
    const admin = await adminAgent()
    const { id } = (await upload(admin, await samplePdf(3))).body.data
    const ok = await admin.patch(`/api/admin/products/${id}`).send({
      title: 'Kinematics Complete',
      subject: 'physics',
      classLevel: '11',
      chapter: 'Kinematics',
      summary: 'Short',
      description: 'Long description',
      price: 149.5,
      mrp: 299,
      tags: ['Motion', 'motion', 'JEE'],
      difficulty: 'Medium',
      contents: ['Graphs', 'Projectile motion'],
      audience: ['Class 11 students'],
      sortOrder: 3,
    })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.data.price, 149.5)
    assert.equal(ok.body.data.savings.percent, 50)
    assert.deepEqual(ok.body.data.tags, ['motion', 'jee'])
    for (const bad of [{ price: -1 }, { price: 10.123 }, { price: 'free' }, { mrp: 50 }, { classLevel: '13' }, { subject: 'biology' }, { tags: Array(30).fill('x') }]) {
      assert.equal((await admin.patch(`/api/admin/products/${id}`).send(bad)).status, 400, JSON.stringify(bad))
    }
    const cleared = await admin.patch(`/api/admin/products/${id}`).send({ mrp: null })
    assert.equal(cleared.body.data.mrp, null)
    assert.equal(cleared.body.data.savings, null, 'no discount is shown without an original price')
    assert.equal((await admin.patch('/api/admin/products/not-an-id').send({ title: 'x' })).status, 404)
  })

  it('cannot change protected fields through the API', async () => {
    const admin = await adminAgent()
    const { id } = (await upload(admin, await samplePdf(1))).body.data
    await admin.patch(`/api/admin/products/${id}`).send({ status: 'published', viewCount: 9999, file: { key: 'notes/x' }, slug: 'hijack', kind: 'plan' })
    const p = await Product.findById(id).select('+file')
    assert.equal(p.status, 'draft')
    assert.equal(p.viewCount, 0)
    assert.notEqual(p.slug, 'hijack')
    assert.equal(p.kind, 'note')
    assert.notEqual(p.file.key, 'notes/x')
  })

  it('only publishes complete notes, and unpublishing keeps buyers reading', async () => {
    const admin = await adminAgent()
    const bare = (await admin.post('/api/admin/products').send({ title: 'No file yet', price: 50, subject: 'physics', classLevel: '12' })).body.data
    assert.equal((await admin.post(`/api/admin/products/${bare.id}/publish`)).status, 409, 'needs a PDF')
    const { id } = (await upload(admin, await samplePdf(2))).body.data
    assert.equal((await admin.post(`/api/admin/products/${id}/publish`)).status, 409, 'needs subject and class')
    await admin.patch(`/api/admin/products/${id}`).send({ subject: 'physics', classLevel: '12', price: 80, title: 'Optics Notes' })
    const pub = await admin.post(`/api/admin/products/${id}/publish`)
    assert.equal(pub.status, 200)
    assert.equal(pub.body.data.status, 'published')
    const slug = pub.body.data.slug
    assert.equal((await client().get(`/api/products/${slug}`)).status, 200)

    const buyer = (await registerUser()).agent
    await buy(buyer, slug)
    await admin.post(`/api/admin/products/${id}/unpublish`)
    assert.equal((await client().get(`/api/products/${slug}`)).status, 404)
    assert.equal((await openReader(buyer, slug)).status, 201, 'owner keeps access')
    assert.equal((await buyer.post('/api/orders').send({ product: slug })).status, 404, 'cannot be bought while unpublished')
  })

  it('replaces a PDF without breaking existing purchases', async () => {
    await makeProduct({ slug: 'paid-note', price: 99, pages: 3, previewPages: [1, 3] })
    const buyer = (await registerUser()).agent
    const { orderId } = await buy(buyer, 'paid-note')
    const admin = await adminAgent()
    const { id } = (await admin.get('/api/admin/products?q=paid-note')).body.data[0]

    const replaced = await admin.put(`/api/admin/products/${id}/file`).set('Content-Type', 'application/pdf').set('X-Filename', 'v2.pdf').send(await samplePdf(2))
    assert.equal(replaced.status, 200)
    assert.equal(replaced.body.data.file.version, 2)
    assert.equal(replaced.body.data.pages, 2, 'page count follows the new file')
    assert.deepEqual(replaced.body.data.previewPages, [1], 'preview pages beyond the new length are dropped')

    const session = await openReader(buyer, 'paid-note')
    assert.equal(session.status, 201)
    assert.equal(session.body.data.document.pages, 2)
    const pdf = await PDFDocument.load((await stream(buyer, session.body.data.token)).body)
    assert.equal(pdf.getPageCount(), 2)
    const lib = (await buyer.get('/api/library')).body.data.items[0]
    assert.equal(lib.updatedSincePurchase, true)
    const order = await buyer.get(`/api/orders/${orderId}`)
    assert.equal(order.body.data.status, 'paid')

    const stored = await Product.findById(id).select('+file +fileHistory')
    assert.equal(stored.fileHistory.length, 1, 'previous version kept for rollback')
    assert.ok(await statObject(stored.fileHistory[0].key))
    assert.equal((await admin.put(`/api/admin/products/${id}/file`).set('Content-Type', 'application/pdf').send(Buffer.from('nope'))).status, 400)
  })

  it('accepts images as covers by content, and refuses SVG and disguised files', async () => {
    const admin = await adminAgent()
    const { id, slug } = (await upload(admin, await samplePdf(1))).body.data
    await admin.patch(`/api/admin/products/${id}`).send({ subject: 'physics', classLevel: '11' })
    const put = (bytes, type = 'image/png') => admin.put(`/api/admin/products/${id}/cover`).set('Content-Type', type).send(bytes)
    assert.equal((await put(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml')).status, 400)
    assert.equal((await put(Buffer.from('<html>hi</html>'))).status, 400)
    assert.equal((await put(Buffer.from('GIF89a' + 'x'.repeat(50)), 'image/png')).status, 400)
    const good = await put(PNG)
    assert.equal(good.status, 200)
    assert.equal(good.body.data.hasCover, true)
    assert.equal((await client().get(`/api/products/${slug}/cover`)).status, 404, 'draft cover is not public')
    assert.equal((await admin.get(`/api/admin/products/${id}/cover`)).status, 200)
    await admin.post(`/api/admin/products/${id}/publish`)
    const pub = await client().get(`/api/products/${slug}/cover`)
    assert.equal(pub.status, 200)
    assert.equal(pub.headers['content-type'], 'image/png')
    assert.equal(pub.headers['cross-origin-resource-policy'], 'cross-origin')
    assert.equal(pub.headers['x-content-type-options'], 'nosniff')
    const detail = await client().get(`/api/products/${slug}`)
    assert.match(detail.body.data.coverUrl, /^\/api\/products\/.+\/cover\?v=1$/)
    assert.equal((await admin.delete(`/api/admin/products/${id}/cover`)).body.data.hasCover, false)
  })

  it('only deletes products nobody has ordered or bundled; otherwise archive', async () => {
    const admin = await adminAgent()
    await makeProduct({ slug: 'sold', price: 99 })
    await makeProduct({ slug: 'unsold', price: 99 })
    await makeProduct({ slug: 'in-bundle', price: 99 })
    const buyer = (await registerUser()).agent
    await buy(buyer, 'sold')
    const list = (await admin.get('/api/admin/products?limit=50')).body.data
    const idOf = (slug) => list.find((p) => p.slug === slug).id
    const blocked = await admin.delete(`/api/admin/products/${idOf('sold')}`)
    assert.equal(blocked.status, 409)
    assert.match(blocked.body.error.message, /Archive/)
    const unsold = await Product.findById(idOf('unsold')).select('+file')
    assert.ok(await statObject(unsold.file.key))
    assert.equal((await admin.delete(`/api/admin/products/${idOf('unsold')}`)).status, 200)
    assert.equal(await statObject(unsold.file.key), null, 'files are removed with the product')
    await Product.create({ slug: 'a-bundle', title: 'Bundle', kind: 'bundle', type: 'bundle', pricePaise: 100, bundleItems: [idOf('in-bundle')] })
    assert.equal((await admin.delete(`/api/admin/products/${idOf('in-bundle')}`)).status, 409)
    assert.equal((await admin.post(`/api/admin/products/${idOf('sold')}/archive`)).body.data.status, 'archived')
  })

  it('searches, filters, sorts and paginates the notes list', async () => {
    const admin = await adminAgent()
    await makeProduct({ slug: 'phy-optics', price: 100, subject: 'physics', classLevel: '12', chapter: 'Optics', tags: ['light'] })
    await makeProduct({ slug: 'chem-bonding', price: 50, subject: 'chemistry', classLevel: '11', chapter: 'Bonding', status: 'draft' })
    await makeProduct({ slug: 'math-vectors', price: 75, subject: 'mathematics', classLevel: '12', chapter: 'Vectors', sortOrder: 5 })
    const slugs = async (q) => (await admin.get(`/api/admin/products?${q}`)).body.data.map((p) => p.slug)
    assert.deepEqual(await slugs('subject=physics'), ['phy-optics'])
    assert.deepEqual(await slugs('status=draft'), ['chem-bonding'])
    assert.deepEqual(await slugs('q=light'), ['phy-optics'])
    assert.deepEqual(await slugs('classLevel=12&sort=price'), ['math-vectors', 'phy-optics'])
    assert.deepEqual(await slugs('sort=price&limit=1&page=2'), ['math-vectors'])
    assert.equal((await admin.get('/api/admin/products?status=bogus')).status, 400)
    // Regex metacharacters in search are matched literally.
    assert.deepEqual(await slugs('q=.*'), [])
  })

  it('previews any note in the real reader, including drafts, stamped as an admin preview', async () => {
    const admin = await adminAgent()
    const { id } = (await upload(admin, await samplePdf(3))).body.data
    const res = await admin.post(`/api/admin/products/${id}/preview-session`)
    assert.equal(res.status, 201)
    assert.equal(res.body.data.mode, 'admin')
    assert.equal(res.body.data.watermark.orderRef, 'ADMIN-PREVIEW')
    assert.equal((await PDFDocument.load((await stream(client(), res.body.data.token)).body)).getPageCount(), 3)
    assert.equal((await admin.post(`/api/admin/products/${id}/preview-session?sample=1`)).status, 409, 'no preview pages set yet')
    await admin.patch(`/api/admin/products/${id}`).send({ previewPages: [2] })
    const sample = await admin.post(`/api/admin/products/${id}/preview-session?sample=1`)
    assert.equal((await PDFDocument.load((await stream(client(), sample.body.data.token)).body)).getPageCount(), 1)
    assert.equal(sample.body.data.document.totalPages, 3)
    assert.equal((await admin.patch(`/api/admin/products/${id}`).send({ previewPages: [99] })).status, 400)
    assert.equal((await (await registerUser()).agent.post(`/api/admin/products/${id}/preview-session`)).status, 401)
  })
})

describe('admin users and support', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('suspends a student: no login, no streaming; and reinstates them', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent, user, body } = await registerUser()
    await buy(agent, 'paid-note')
    const { token } = (await openReader(agent, 'paid-note')).body.data
    const admin = await adminAgent()
    assert.equal((await admin.post(`/api/admin/users/${user.id}/suspend`)).status, 200)
    assert.equal((await stream(agent, token)).status, 401)
    assert.equal((await agent.get('/api/auth/me')).status, 401)
    assert.equal((await client().post('/api/auth/login').send({ email: body.email, password: body.password })).status, 403)
    await admin.post(`/api/admin/users/${user.id}/unsuspend`)
    assert.equal((await client().post('/api/auth/login').send({ email: body.email, password: body.password })).status, 200)
  })

  it('revokes all sessions of a student, and refuses to touch staff accounts', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent, user } = await registerUser()
    await buy(agent, 'paid-note')
    const { token } = (await openReader(agent, 'paid-note')).body.data
    const admin = await adminAgent()
    assert.equal((await admin.post(`/api/admin/users/${user.id}/revoke-sessions`)).status, 200)
    assert.equal((await stream(agent, token)).status, 401)
    const staff = await User.findOne({ role: 'admin' })
    assert.equal((await admin.post(`/api/admin/users/${staff._id}/suspend`)).status, 409)
    const detail = await admin.get(`/api/admin/users/${user.id}`)
    assert.equal(detail.body.data.user.email, user.email)
    assert.ok(!JSON.stringify(detail.body).includes('passwordHash'))
  })

  it('takes support messages from students and lets staff resolve them', async () => {
    const { agent } = await registerUser()
    assert.equal((await agent.post('/api/support').send({ subject: 'x', message: 'short' })).status, 400)
    const sent = await agent.post('/api/support').send({ subject: 'Cannot open my note', message: 'The reader shows an error when I open it.' })
    assert.equal(sent.status, 201)
    assert.equal((await client().post('/api/support').send({ subject: 'Hello there', message: 'Anonymous message here' })).status, 401)
    const mine = await agent.get('/api/support')
    assert.equal(mine.body.data.items.length, 1)
    const admin = await adminAgent()
    const inbox = await admin.get('/api/admin/support?status=open')
    assert.equal(inbox.body.data.length, 1)
    assert.ok(inbox.body.data[0].user.email)
    await admin.patch(`/api/admin/support/${inbox.body.data[0].id}`).send({ status: 'resolved', adminNote: 'Fixed' })
    assert.equal((await admin.get('/api/admin/support?status=open')).body.data.length, 0)
    const other = (await registerUser()).agent
    assert.equal((await other.get('/api/support')).body.data.items.length, 0, 'students only see their own messages')
  })
})
