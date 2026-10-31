import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { orderReference } from '../utils/crypto.js'
import { notFound } from '../utils/AppError.js'
import { ensureSample, ensureWatermarked, sampleKey, watermarkedKey } from './documents.js'
import { openSession } from './viewerSessions.js'
import { statObject } from './storage.js'
import { watermarkIdentity } from './watermark.js'

// Everything the viewer needs and nothing about storage: no keys, paths or URLs to the original.
function sessionPayload({ session, token, product, identity, progress }) {
  return {
    token,
    sessionId: String(session._id),
    expiresAt: session.expiresAt,
    mode: session.mode,
    // `pages` is what the file contains; `totalPages` is the full length of the note (shown to the student in a sample).
    document: { slug: product.slug, title: product.title, pages: session.pages, totalPages: product.file.pages, size: session.fileSize },
    // Text for the on-screen watermark layer. Built here from the authenticated account, never from the client.
    watermark: identity ? { ...identity, seed: Number.parseInt(String(session._id).slice(-6), 16) } : { label: 'SAMPLE', seed: 0 },
    progress: progress ? { page: progress.page } : null,
  }
}

export async function startFullSession({ req, user, product, access, progress }) {
  const orderRef = access.orderId ? orderReference(access.orderId) : 'FREE'
  const identity = watermarkIdentity({ user, orderRef })
  const derivedKey = watermarkedKey({ userId: user._id, product, orderRef })
  await ensureWatermarked(derivedKey, product, identity)
  const stat = await statObject(derivedKey)
  const { session, token } = await openSession({ req, user, product, mode: 'full', orderRef, derivedKey, fileSize: stat.size })
  return sessionPayload({ session, token, product, identity, progress })
}

export async function startSampleSession({ req, user, product }) {
  const derivedKey = sampleKey(product)
  await ensureSample(derivedKey, product)
  const stat = await statObject(derivedKey)
  const { session, token } = await openSession({ req, user, product, mode: 'preview', derivedKey, fileSize: stat.size })
  return sessionPayload({ session, token, product })
}

// Admin proofing of any note, including drafts. Stamped with the admin's identity like any reader.
export async function startAdminSession({ req, staff, product }) {
  const orderRef = 'ADMIN-PREVIEW'
  const identity = watermarkIdentity({ user: staff, orderRef })
  const derivedKey = watermarkedKey({ userId: staff._id, product, orderRef })
  await ensureWatermarked(derivedKey, product, identity)
  const stat = await statObject(derivedKey)
  const { session, token } = await openSession({ req, user: staff, product, mode: 'admin', orderRef, derivedKey, fileSize: stat.size })
  return sessionPayload({ session, token, product, identity })
}

// The derived cache is disposable, so a session may outlive its file. Rebuild it on demand.
export async function ensureSessionDocument(session) {
  const stat = await statObject(session.derivedKey)
  if (stat) return stat
  const product = await Product.findById(session.product).select('+file')
  if (!product?.file?.key) throw notFound('Document not available')
  if (session.mode === 'preview') {
    await ensureSample(session.derivedKey, product)
  } else {
    const user = await User.findById(session.user)
    if (!user) throw notFound('Document not available')
    await ensureWatermarked(session.derivedKey, product, watermarkIdentity({ user, orderRef: session.orderRef }))
  }
  return statObject(session.derivedKey)
}
