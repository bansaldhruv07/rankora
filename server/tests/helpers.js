import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { PDFDocument } from 'pdf-lib'

// Must run before the app modules are imported: config is read at import time.
export const MOCK_SECRET = 'test-mock-secret'
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'x'.repeat(48),
  PAYMENT_PROVIDER: 'mock',
  MOCK_PAYMENT_SECRET: MOCK_SECRET,
  RATE_LIMIT_MAX: '100000',
  AUTH_RATE_LIMIT_MAX: '100000',
  // Both growth programs are on in tests; individual tests switch them off to check the flags.
  REFERRALS_ENABLED: 'true',
  TEACHER_PROGRAM_ENABLED: 'true',
  PRIVATE_STORAGE_DIR: path.join(os.tmpdir(), `jeedge-test-${process.pid}`),
})

const { default: mongoose } = await import('mongoose')
const { MongoMemoryServer } = await import('mongodb-memory-server')
const { createApp } = await import('../src/app.js')
const { Product } = await import('../src/models/Product.js')
const { User } = await import('../src/models/User.js')
const { putObject } = await import('../src/services/storage.js')
const { default: request } = await import('supertest')

let mongod
export const app = createApp()

export async function startDb() {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()))
}

export async function stopDb() {
  await mongoose.disconnect()
  await mongod?.stop()
}

export const resetDb = () => mongoose.connection.dropDatabase().then(() => Promise.all(Object.values(mongoose.models).map((m) => m.init())))

export const client = () => request.agent(app).set('X-Requested-With', 'jeedge')

let counter = 0
export async function registerUser(agent = client(), overrides = {}) {
  counter += 1
  const body = { name: 'Test Student', email: `student${counter}@example.com`, password: 'correct-horse-9', ...overrides }
  const res = await agent.post('/api/auth/register').send(body)
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { agent, user: res.body.data.user, body }
}

// Registers an account, promotes it directly in the database (as the create-admin script does) and
// signs in through the separate admin endpoint.
export async function staffAgent(role = 'admin') {
  const { agent, user, body } = await registerUser()
  await User.updateOne({ _id: user.id }, { role })
  const login = await agent.post('/api/admin/auth/login').send({ email: body.email, password: body.password })
  if (login.status !== 200) throw new Error(`admin login failed: ${login.status} ${JSON.stringify(login.body)}`)
  return agent
}
export const adminAgent = () => staffAgent('admin')

async function pdfBuffer(text, pages = 1) {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < pages; i += 1) pdf.addPage([300, 300]).drawText(`${text} p${i + 1}`)
  return Buffer.from(await pdf.save())
}

export async function makeProduct({ slug, price = 99, kind = 'note', status = 'published', withFile = true, pages = 3, ...rest } = {}) {
  const doc = {
    slug,
    title: `Product ${slug}`,
    kind,
    type: kind === 'plan' ? 'plan' : kind === 'bundle' ? 'bundle' : 'notes',
    pricePaise: price * 100,
    status,
    ...(kind === 'plan' ? { planDays: 30 } : {}),
    ...rest,
  }
  if (withFile && kind === 'note') {
    const key = `notes/${slug}.pdf`
    const buffer = await pdfBuffer(`secret ${slug}`, pages)
    await putObject(key, buffer)
    doc.file = { key, originalName: `${slug}.pdf`, size: buffer.length, pages, version: 1, uploadedAt: new Date() }
  }
  return Product.create(doc)
}

export async function samplePdf(pages = 3) {
  return pdfBuffer('uploaded', pages)
}

// Opens a reader session through the real endpoint. Returns the full response.
export const openReader = (agent, slug, mode = 'full') => agent.post('/api/reader/sessions').send({ product: slug, mode })

// Reads from the stream endpoint (optionally a byte range) and returns the raw bytes.
export const stream = (agent, token, range) => {
  let req = agent.get('/api/reader/stream').set('X-Reader-Token', token)
  if (range) req = req.set('Range', range)
  return req.buffer(true).parse((r, cb) => {
    const chunks = []
    r.on('data', (c) => chunks.push(c))
    r.on('end', () => cb(null, Buffer.concat(chunks)))
  })
}

export const sign = (payload, secret = MOCK_SECRET) => crypto.createHmac('sha256', secret).update(payload).digest('hex')

// Runs checkout through the real endpoints using the mock gateway.
export async function buy(agent, slug) {
  const created = await agent.post('/api/orders').send({ product: slug })
  if (created.status >= 300) throw new Error(`order failed ${created.status}`)
  const orderId = created.body.data.order.id
  const paid = await agent.post('/api/payments/mock/complete').send({ orderId })
  const verified = await agent.post('/api/payments/verify').send({ orderId, ...paid.body.data })
  return { orderId, created, verified, payment: paid.body.data }
}

export const webhook = (event, { id = `evt_${crypto.randomUUID()}`, secret = MOCK_SECRET, signature } = {}) => {
  const raw = JSON.stringify(event)
  return request(app)
    .post('/api/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Event-Id', id)
    .set('X-Razorpay-Signature', signature ?? sign(raw, secret))
    .send(raw)
}

export { mongoose, request }
