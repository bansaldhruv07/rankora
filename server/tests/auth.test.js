import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { app, client, registerUser, request, resetDb, startDb, stopDb } from './helpers.js'

describe('auth', () => {
  before(startDb)
  after(stopDb)
  beforeEach(resetDb)

  it('registers, never exposes the hash, and always creates a student', async () => {
    const agent = client()
    const res = await agent.post('/api/auth/register').send({ name: 'Asha', email: 'Asha@Example.com', password: 'longenough1', role: 'admin' })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.user.email, 'asha@example.com')
    assert.equal(res.body.data.user.role, 'student')
    assert.ok(!JSON.stringify(res.body).includes('passwordHash'))
    assert.ok(res.headers['set-cookie'][0].includes('HttpOnly'))
  })

  it('rejects duplicate emails and weak input', async () => {
    const { body } = await registerUser()
    assert.equal((await client().post('/api/auth/register').send(body)).status, 409)
    assert.equal((await client().post('/api/auth/register').send({ ...body, email: 'new@example.com', password: 'short' })).status, 400)
  })

  it('logs in, returns /me, and rejects invalid credentials', async () => {
    const { body } = await registerUser()
    const agent = client()
    assert.equal((await agent.post('/api/auth/login').send({ email: body.email, password: 'wrong-password' })).status, 401)
    assert.equal((await agent.post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever12' })).status, 401)
    assert.equal((await agent.post('/api/auth/login').send({ email: body.email, password: body.password })).status, 200)
    const me = await agent.get('/api/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.body.data.user.email, body.email)
    assert.equal(me.body.data.access.premium, false)
  })

  it('blocks unauthenticated and operator-injected requests', async () => {
    assert.equal((await client().get('/api/auth/me')).status, 401)
    assert.equal((await client().get('/api/orders')).status, 401)
    assert.equal((await client().post('/api/auth/login').send({ email: { $ne: '' }, password: { $ne: '' } })).status, 400)
  })

  it('rejects state-changing requests without the CSRF header', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' })
    assert.equal(res.status, 403)
  })

  it('logout revokes the token even if the old cookie is replayed', async () => {
    const res = await client().post('/api/auth/register').send({ name: 'Replay', email: 'replay@example.com', password: 'longenough1' })
    const cookie = res.headers['set-cookie'][0].split(';')[0]
    const replay = () => request(app).get('/api/auth/me').set('Cookie', cookie)
    assert.equal((await replay()).status, 200)
    await request(app).post('/api/auth/logout').set('X-Requested-With', 'rankora').set('Cookie', cookie)
    assert.equal((await replay()).status, 401)
  })
})
