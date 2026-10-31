import { env } from '../config/env.js'
import { ViewerSession } from '../models/ViewerSession.js'
import { randomToken, sha256Hex } from '../utils/crypto.js'
import { logAccess } from './accessLog.js'

const MINUTE = 60000
const HOUR = 3600000

// Creates a session and returns the one-time plaintext token. Only its hash is stored.
export async function openSession({ req, user, product, mode, orderRef, derivedKey, fileSize }) {
  const token = randomToken(32)
  const now = Date.now()
  const session = await ViewerSession.create({
    tokenHash: sha256Hex(token),
    user: user?._id,
    product: product._id,
    mode,
    orderRef,
    fileVersion: product.file.version,
    derivedKey,
    pages: mode === 'preview' ? product.previewPages.length : product.file.pages,
    fileSize,
    ip: req.ip,
    userAgent: (req.get('user-agent') || '').slice(0, 300),
    expiresAt: new Date(now + env.reader.idleMinutes * MINUTE),
    hardExpiresAt: new Date(now + env.reader.maxHours * HOUR),
  })
  if (mode === 'full') await enforceSessionLimit(req, user._id, session._id)
  return { session, token }
}

// A student may hold a few sessions (phone + laptop). Opening another closes the oldest, which the
// reader reports clearly and offers to resume; this is what makes shared logins unattractive.
async function enforceSessionLimit(req, userId, keepId) {
  const active = await ViewerSession.find({ user: userId, mode: 'full', status: 'active', expiresAt: { $gt: new Date() } })
    .sort({ createdAt: 1 })
    .select('_id product')
  const excess = active.length - env.reader.maxActiveSessions
  if (excess <= 0) return
  const victims = active.filter((s) => String(s._id) !== String(keepId)).slice(0, excess)
  await ViewerSession.updateMany({ _id: { $in: victims.map((s) => s._id) } }, { $set: { status: 'revoked', revokedReason: 'session limit' } })
  await logAccess(req, 'revoked', { note: `closed ${victims.length} older reading session(s): limit ${env.reader.maxActiveSessions}` })
}

// Finds a usable session for a token, or null. Revoked and expired sessions are treated alike.
export async function findSession(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null
  const now = new Date()
  return ViewerSession.findOne({ tokenHash: sha256Hex(token), status: 'active', expiresAt: { $gt: now }, hardExpiresAt: { $gt: now } })
}

// Records served bytes and slides the idle timeout (never past the absolute limit).
export async function touchSession(session, bytes = 0) {
  const idle = Date.now() + env.reader.idleMinutes * MINUTE
  const next = new Date(Math.min(idle, session.hardExpiresAt.getTime()))
  const updated = await ViewerSession.findOneAndUpdate(
    { _id: session._id, status: 'active' },
    { $inc: { bytesServed: bytes }, $set: { lastSeenAt: new Date(), expiresAt: next } },
    { returnDocument: 'after' },
  )
  return updated
}

export const revokeSession = (session, reason) =>
  ViewerSession.updateOne({ _id: session._id }, { $set: { status: 'revoked', revokedReason: reason } })

export const revokeUserSessions = (userId, reason) =>
  ViewerSession.updateMany({ user: userId, status: 'active' }, { $set: { status: 'revoked', revokedReason: reason } })

export const revokeUserProductSessions = (userId, productIds, reason) =>
  ViewerSession.updateMany({ user: userId, product: { $in: productIds }, status: 'active' }, { $set: { status: 'revoked', revokedReason: reason } })
