import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, beforeEach, describe, it } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { adminAgent, buy, client, makeProduct, openReader, registerUser, request, resetDb, samplePdf, startDb, stopDb, stream } from './helpers.js'

const { env } = await import('../src/config/env.js')
const { createApp } = await import('../src/app.js')
const storage = await import('../src/services/storage.js')

describe('free hosting: files stored in MongoDB (GridFS)', () => {
  before(async () => {
    await startDb()
    env.storageDriver = 'gridfs'
  })
  after(async () => {
    env.storageDriver = 'disk'
    await stopDb()
  })
  beforeEach(resetDb)

  it('stores, reads, ranges, replaces and deletes objects', async () => {
    const data = Buffer.from('0123456789'.repeat(100))
    await storage.putObject('notes/a.pdf', data)
    assert.deepEqual((await storage.statObject('notes/a.pdf')).size, 1000)
    assert.ok((await storage.getObject('notes/a.pdf')).equals(data))
    const part = []
    for await (const chunk of storage.readStream('notes/a.pdf', { start: 10, end: 19 })) part.push(chunk)
    assert.equal(Buffer.concat(part).toString(), '0123456789', 'inclusive range, like HTTP')
    await storage.putObject('notes/a.pdf', Buffer.from('replaced'))
    assert.equal((await storage.getObject('notes/a.pdf')).toString(), 'replaced')
    assert.equal(await storage.statObject('missing.pdf'), null)
    await assert.rejects(() => storage.getObject('notes/missing.pdf'))
    await storage.deleteObject('notes/a.pdf')
    assert.equal(await storage.statObject('notes/a.pdf'), null)
    await storage.deleteObject('notes/a.pdf') // deleting twice is harmless
  })

  it('keeps the disposable cache on local disk, not in the database', async () => {
    await storage.putObject(`derived/test-${process.pid}.pdf`, Buffer.from('cache'))
    assert.equal(await storage.statObject(`derived/test-${process.pid}.pdf`).then((s) => s.size), 5)
    const { default: mongoose } = await import('mongoose')
    assert.equal(await mongoose.connection.db.collection('files.files').countDocuments({ filename: /^derived\// }), 0)
    await storage.deleteObject(`derived/test-${process.pid}.pdf`)
  })

  it('runs the whole flow: upload, publish, buy, read, replace, delete with no PDF on disk', async () => {
    const admin = await adminAgent()
    const up = await admin.post('/api/admin/products/upload').set('Content-Type', 'application/pdf').set('X-Filename', 'Optics.pdf').send(await samplePdf(4))
    assert.equal(up.status, 201)
    const { id, slug } = up.body.data
    await admin.patch(`/api/admin/products/${id}`).send({ subject: 'physics', classLevel: '12', price: 50, previewPages: [1] })
    assert.equal((await admin.post(`/api/admin/products/${id}/publish`)).status, 200)

    const { Product } = await import('../src/models/Product.js')
    const stored = await Product.findById(id).select('+file')
    assert.ok(!fs.existsSync(path.join(env.storageDir, stored.file.key)), 'the original is not on the local disk')

    const anon = client()
    const sample = await openReader(anon, slug, 'preview')
    assert.equal((await PDFDocument.load((await stream(anon, sample.body.data.token)).body)).getPageCount(), 1)

    const { agent } = await registerUser()
    await buy(agent, slug)
    const full = await openReader(agent, slug)
    assert.equal(full.status, 201)
    const served = await stream(agent, full.body.data.token)
    assert.equal((await PDFDocument.load(served.body)).getPageCount(), 4)
    assert.equal((await stream(agent, full.body.data.token, 'bytes=0-99')).status, 206)

    const replaced = await admin.put(`/api/admin/products/${id}/file`).set('Content-Type', 'application/pdf').send(await samplePdf(2))
    assert.equal(replaced.status, 200)
    assert.equal((await openReader(agent, slug)).body.data.document.pages, 2)
  })

  it('serves covers from the database too', async () => {
    const admin = await adminAgent()
    await makeProduct({ slug: 'with-cover', price: 10, subject: 'physics', classLevel: '11' })
    const { Product } = await import('../src/models/Product.js')
    const id = String((await Product.findOne({ slug: 'with-cover' }))._id)
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)])
    assert.equal((await admin.put(`/api/admin/products/${id}/cover`).set('Content-Type', 'image/png').send(png)).status, 200)
    const res = await client().get('/api/products/with-cover/cover').buffer(true).parse((r, cb) => {
      const c = []
      r.on('data', (d) => c.push(d))
      r.on('end', () => cb(null, Buffer.concat(c)))
    })
    assert.equal(res.status, 200)
    assert.ok(res.body.equals(png))
  })
})

describe('free hosting: the API serves the website', () => {
  let dir
  let app
  before(async () => {
    await startDb()
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rk-site-'))
    fs.mkdirSync(path.join(dir, 'assets'))
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><head><script>window.__theme=1</script></head><body><div id="root"></div></body></html>')
    fs.writeFileSync(path.join(dir, 'assets', 'app-123.js'), 'console.log(1)')
    fs.writeFileSync(path.join(dir, 'secret-outside.txt'), 'x')
    env.serveFrontend = true
    env.frontendDir = path.join(dir, 'site')
    fs.mkdirSync(env.frontendDir)
    fs.renameSync(path.join(dir, 'index.html'), path.join(env.frontendDir, 'index.html'))
    fs.renameSync(path.join(dir, 'assets'), path.join(env.frontendDir, 'assets'))
    app = createApp()
  })
  after(async () => {
    env.serveFrontend = false
    fs.rmSync(dir, { recursive: true, force: true })
    await stopDb()
  })

  it('returns the app for the home page and for client-side routes', async () => {
    for (const route of ['/', '/notes', '/notes/some-slug', '/library', '/read/x?preview=1', '/admin/orders']) {
      const res = await request(app).get(route)
      assert.equal(res.status, 200, route)
      assert.match(res.text, /id="root"/)
      assert.match(res.headers['content-type'], /text\/html/)
      assert.equal(res.headers['cache-control'], 'no-cache')
    }
  })

  it('serves built files with long-lived caching, and the API is unaffected', async () => {
    const js = await request(app).get('/assets/app-123.js')
    assert.equal(js.status, 200)
    assert.match(js.headers['cache-control'], /immutable/)
    const health = await request(app).get('/api/health')
    assert.equal(health.status, 200)
    assert.equal(health.body.success, true)
    const missing = await request(app).get('/api/does-not-exist').set('X-Requested-With', 'rankora')
    assert.equal(missing.status, 404)
    assert.equal(missing.body.error.code, 'NOT_FOUND', 'unknown API paths stay JSON, not the web page')
  })

  it('sends a strict content-security policy that allows only the inline script it knows', async () => {
    const res = await request(app).get('/')
    const csp = res.headers['content-security-policy']
    assert.match(csp, /default-src 'self'/)
    assert.match(csp, /frame-ancestors 'none'/)
    assert.match(csp, /object-src 'none'/)
    assert.match(csp, /script-src[^;]*'sha256-/)
    assert.doesNotMatch(csp.match(/script-src[^;]*/)[0], /unsafe-inline/)
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
  })

  it('hashes the inline script the way a browser does, even when the build has Windows line endings', async () => {
    const { createHash } = await import('node:crypto')
    const script = '\n  (function () {\n    window.__theme = 1\n  })()\n'
    fs.writeFileSync(path.join(env.frontendDir, 'index.html'), `<!doctype html><html><head><script>${script.replace(/\n/g, '\r\n')}</script></head><body><div id="root"></div></body></html>`)
    const res = await request(createApp()).get('/')
    const expected = `'sha256-${createHash('sha256').update(script).digest('base64')}'`
    assert.ok(res.headers['content-security-policy'].includes(expected), 'the policy must contain the LF-normalised hash')
  })

  it('cannot be used to read files outside the website folder', async () => {
    for (const route of ['/../secret-outside.txt', '/%2e%2e/secret-outside.txt', '/..%2fsecret-outside.txt', '/assets/../../secret-outside.txt']) {
      const res = await request(app).get(route)
      assert.ok(!res.text.includes('x') || /id="root"/.test(res.text) || res.status >= 400, route)
      assert.notEqual(res.text, 'x', route)
    }
    assert.equal((await request(app).get('/.env')).text.includes('JWT_SECRET'), false)
  })

  it('refuses to start in this mode if the site was not built', () => {
    const before = env.frontendDir
    env.frontendDir = path.join(dir, 'nowhere')
    assert.throws(() => createApp(), /npm run build/)
    env.frontendDir = before
  })
})
