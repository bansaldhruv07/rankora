import { pipeline } from 'node:stream'
import { Router } from 'express'
import { z } from 'zod'
import { optionalAuth, studentFromRequest } from '../middleware/auth.js'
import { readerSessionLimiter, readerStreamLimiter } from '../middleware/security.js'
import { Product } from '../models/Product.js'
import { ReadingProgress } from '../models/ReadingProgress.js'
import { ViewerSession } from '../models/ViewerSession.js'
import { checkOpenAbuse, logAccess } from '../services/accessLog.js'
import { findAccess } from '../services/entitlements.js'
import { ensureSessionDocument, startFullSession, startSampleSession } from '../services/reader.js'
import { readStream } from '../services/storage.js'
import { findSession, revokeSession, touchSession } from '../services/viewerSessions.js'
import { AppError, badRequest, forbidden, notFound, unauthorized } from '../utils/AppError.js'
import { asyncHandler, ok, parse, parseRange } from '../utils/http.js'
import { logger } from '../utils/logger.js'

const router = Router()

const TOKEN_HEADER = 'x-reader-token'
const sessionEnded = () => new AppError(401, 'SESSION_EXPIRED', 'Your reading session has ended. Reopen the document to continue.')
// A session may stream a document a few times over (reloads, retries) but not endlessly.
const SESSION_BYTES_ALLOWANCE = 3
const SESSION_BYTES_SLACK = 5 * 1024 * 1024

const openSchema = z.object({
  product: z.string().trim().regex(/^[a-z0-9-]{1,80}$/),
  mode: z.enum(['full', 'preview']).default('full'),
})

// Opens a reading session. Ownership is decided here, on the server, every time.
router.post(
  '/sessions',
  readerSessionLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { product: slug, mode } = parse(openSchema, req.body)
    const product = await Product.findOne({ slug }).select('+file')
    if (!product || product.kind !== 'note' || !product.file?.key) throw notFound('Document not found')

    if (mode === 'preview') {
      if (product.status !== 'published' || !product.previewPages?.length) throw notFound('There is no free sample for this note')
      const payload = await startSampleSession({ req, user: req.user, product })
      await logAccess(req, 'preview', { product })
      return ok(res, payload, undefined, 201)
    }

    if (!req.user) throw unauthorized('Sign in to read your notes')
    const access = await findAccess(req.user._id, product)
    if (!access) {
      await logAccess(req, 'denied', { product, note: 'no entitlement' })
      throw forbidden('Buy this note to read it')
    }
    // Owners keep access after a note is taken off sale, but free notes are only readable while published.
    if (access.source === 'free' && product.status !== 'published') throw notFound('Document not found')

    const abuse = await checkOpenAbuse(req)
    if (abuse.limited) {
      await logAccess(req, 'rate_limited', { product, note: `${abuse.count} reader sessions in the last hour` })
      throw new AppError(429, 'READER_LIMIT', 'You have opened a lot of documents recently. Please try again in a little while.')
    }
    if (abuse.suspicious) {
      await logAccess(req, 'suspicious', { product, note: `${abuse.distinctIps} IPs, ${abuse.distinctProducts} documents in the last hour` })
      logger.warn('suspicious reading pattern', { userId: String(req.user._id), ips: abuse.distinctIps, documents: abuse.distinctProducts })
    }

    const progress = await ReadingProgress.findOne({ user: req.user._id, product: product._id }).lean()
    const payload = await startFullSession({ req, user: req.user, product, access, progress })
    await logAccess(req, 'open', { product })
    ok(res, payload, undefined, 201)
  }),
)

// Resolves the session from the token header and, for personalised sessions, re-verifies the signed-in
// owner and their entitlement on every request. A leaked token is useless without the owner's login.
async function authorise(req) {
  const session = await findSession(req.get(TOKEN_HEADER))
  if (!session) throw sessionEnded()
  if (session.mode === 'full') {
    const user = await studentFromRequest(req)
    if (!user || String(user._id) !== String(session.user)) throw sessionEnded()
    const product = await Product.findById(session.product)
    if (!product || !(await findAccess(user._id, product))) {
      await revokeSession(session, 'access ended')
      throw sessionEnded()
    }
    req.user = user
  }
  return session
}

// Range-capable stream of the derived (watermarked or sample) document for PDF.js.
router.get(
  '/stream',
  readerStreamLimiter,
  asyncHandler(async (req, res) => {
    const session = await authorise(req)
    const stat = await ensureSessionDocument(session)
    const range = parseRange(req.get('range'), stat.size)
    if (range === 'invalid') {
      res.set('Content-Range', `bytes */${stat.size}`)
      throw new AppError(416, 'RANGE_NOT_SATISFIABLE', 'Requested range not satisfiable')
    }
    const start = range?.start ?? 0
    const end = range?.end ?? stat.size - 1
    const length = end - start + 1
    // Bytes are counted as they are actually sent (PDF.js opens with a full-length request it then aborts),
    // and the allowance is checked before the next transfer starts.
    if (session.bytesServed > stat.size * SESSION_BYTES_ALLOWANCE + SESSION_BYTES_SLACK) {
      await revokeSession(session, 'excessive transfer')
      await logAccess(req, 'suspicious', { product: { _id: session.product }, user: { _id: session.user }, note: 'reading session closed: repeated full transfers' })
      throw new AppError(429, 'READER_LIMIT', 'This reading session transferred too much data and was closed. Reopen the document to continue.')
    }
    await touchSession(session)

    res.status(range ? 206 : 200).set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(length),
      'Accept-Ranges': 'bytes',
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${stat.size}` } : {}),
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    })
    const source = readStream(session.derivedKey, { start, end })
    let sent = 0
    source.on('data', (chunk) => {
      sent += chunk.length
    })
    pipeline(source, res, (err) => {
      if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') logger.warn('reader stream interrupted', { error: err.message })
      if (sent) ViewerSession.updateOne({ _id: session._id }, { $inc: { bytesServed: sent } }).catch(() => {})
    })
  }),
)

const progressSchema = z.object({ page: z.number().int().min(1).max(5000) })

// Remembers the last-read page. Only personalised sessions of a signed-in student keep progress.
router.put(
  '/progress',
  asyncHandler(async (req, res) => {
    const session = await authorise(req)
    if (session.mode !== 'full') throw badRequest('Progress is only saved for purchased notes')
    const { page } = parse(progressSchema, req.body)
    const clamped = Math.min(page, session.pages)
    await ReadingProgress.updateOne(
      { user: session.user, product: session.product },
      { $set: { page: clamped, pages: session.pages, lastReadAt: new Date() } },
      { upsert: true },
    )
    await touchSession(session)
    ok(res, { page: clamped })
  }),
)

// Called when the reader is closed so the session slot is freed.
router.delete(
  '/sessions/current',
  asyncHandler(async (req, res) => {
    const session = await findSession(req.get(TOKEN_HEADER))
    if (session) await revokeSession(session, 'closed by reader')
    ok(res, { closed: true })
  }),
)

export default router
