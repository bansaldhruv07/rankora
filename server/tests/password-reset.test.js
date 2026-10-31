import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { buy, client, makeProduct, openReader, registerUser, resetDb, startDb, stopDb, stream } from './helpers.js'

const { setMailer } = await import('../src/services/mailer.js')
const { PasswordReset } = await import('../src/models/PasswordReset.js')

describe('password reset', () => {
  let sent
  before(async () => {
    await startDb()
    setMailer(async (mail) => {
      sent.push(mail)
      return true
    })
  })
  after(async () => {
    setMailer(undefined)
    await stopDb()
  })
  beforeEach(async () => {
    sent = []
    await resetDb()
  })

  const tokenFrom = (mail) => /token=([\w-]+)/.exec(mail.text)[1]

  it('emails a single-use link and lets the student choose a new password', async () => {
    const { body } = await registerUser()
    const res = await client().post('/api/auth/forgot-password').send({ email: body.email })
    assert.equal(res.status, 200)
    assert.equal(sent.length, 1)
    assert.equal(sent[0].to, body.email)
    assert.match(sent[0].text, /http:\/\/localhost:5173\/reset-password\?token=/)
    const token = tokenFrom(sent[0])

    assert.equal((await client().post('/api/auth/reset-password').send({ token, password: 'short' })).status, 400, 'weak password')
    const reset = await client().post('/api/auth/reset-password').send({ token, password: 'brand-new-pass-1' })
    assert.equal(reset.status, 200)
    assert.equal((await client().post('/api/auth/login').send({ email: body.email, password: body.password })).status, 401)
    assert.equal((await client().post('/api/auth/login').send({ email: body.email, password: 'brand-new-pass-1' })).status, 200)
    assert.equal((await client().post('/api/auth/reset-password').send({ token, password: 'another-pass-22' })).status, 400, 'a link works once')
  })

  it('does not reveal whether an email has an account', async () => {
    const known = await registerUser()
    const a = await client().post('/api/auth/forgot-password').send({ email: known.body.email })
    const b = await client().post('/api/auth/forgot-password').send({ email: 'nobody@example.com' })
    assert.equal(a.status, b.status)
    assert.deepEqual(a.body, b.body)
    assert.equal(sent.length, 1)
    assert.equal((await client().post('/api/auth/forgot-password').send({ email: 'not-an-email' })).status, 400)
  })

  it('stores only a hash of the token and rejects expired or invented tokens', async () => {
    const { body } = await registerUser()
    await client().post('/api/auth/forgot-password').send({ email: body.email })
    const token = tokenFrom(sent[0])
    const row = await PasswordReset.findOne()
    assert.notEqual(row.tokenHash, token)
    assert.ok(!JSON.stringify(row).includes(token))
    for (const bad of ['x'.repeat(43), 'short', token.slice(0, -1) + (token.at(-1) === 'a' ? 'b' : 'a')]) {
      assert.equal((await client().post('/api/auth/reset-password').send({ token: bad, password: 'brand-new-pass-1' })).status, 400)
    }
    await PasswordReset.updateOne({}, { expiresAt: new Date(Date.now() - 1000) })
    assert.equal((await client().post('/api/auth/reset-password').send({ token, password: 'brand-new-pass-1' })).status, 400, 'expired')
  })

  it('invalidates older links when a new one is requested, and signs out existing sessions', async () => {
    await makeProduct({ slug: 'paid-note', price: 99 })
    const { agent, body } = await registerUser()
    await buy(agent, 'paid-note')
    const { token: readerToken } = (await openReader(agent, 'paid-note')).body.data
    await client().post('/api/auth/forgot-password').send({ email: body.email })
    await client().post('/api/auth/forgot-password').send({ email: body.email })
    const [first, second] = sent.map(tokenFrom)
    assert.equal((await client().post('/api/auth/reset-password').send({ token: first, password: 'brand-new-pass-1' })).status, 400)
    assert.equal((await client().post('/api/auth/reset-password').send({ token: second, password: 'brand-new-pass-1' })).status, 200)
    assert.equal((await agent.get('/api/auth/me')).status, 401, 'old login is dead')
    assert.equal((await stream(agent, readerToken)).status, 401, 'open readers are closed')
  })

  it('stays quiet about accounts that are suspended', async () => {
    const { user, body } = await registerUser()
    const { User } = await import('../src/models/User.js')
    await User.updateOne({ _id: user.id }, { suspendedAt: new Date() })
    assert.equal((await client().post('/api/auth/forgot-password').send({ email: body.email })).status, 200)
    assert.equal(sent.length, 0)
  })
})
