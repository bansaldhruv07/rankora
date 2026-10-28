import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { Entitlement } from '../models/Entitlement.js'
import { Product } from '../models/Product.js'
import { checkDownloadAbuse, logAccess } from '../services/accessLog.js'
import { accessSummary, hasAccess } from '../services/entitlements.js'
import { getObject } from '../services/storage.js'
import { watermarkPdf } from '../services/watermark.js'
import { AppError, forbidden, notFound } from '../utils/AppError.js'
import { asyncHandler, ok } from '../utils/http.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAuth)

// Purchased (or Premium-unlocked) notes for the signed-in user.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const access = await accessSummary(req.user._id)
    const filter = { status: 'published', kind: 'note', pricePaise: { $gt: 0 } }
    if (!access.premium) {
      const ids = await Entitlement.distinct('product', { user: req.user._id, status: 'active', scope: 'product' })
      filter._id = { $in: ids }
    }
    const items = await Product.find(filter).sort({ sortOrder: 1 })
    ok(res, { items: items.map((p) => p.toPublic()), access })
  }),
)

// Authorised file delivery. Ownership is checked on every request; files are never public.
router.get(
  '/:slug/file',
  asyncHandler(async (req, res) => {
    const slug = z.string().regex(/^[a-z0-9-]{1,80}$/).safeParse(req.params.slug)
    const product = slug.success ? await Product.findOne({ slug: slug.data, status: 'published' }).select('+file') : null
    if (!product || product.kind !== 'note') throw notFound('Product not found')

    if (!(await hasAccess(req.user._id, product))) {
      await logAccess(req, 'denied', { product, note: 'no entitlement' })
      throw forbidden('Purchase this note to download it')
    }
    if (!product.file?.key) throw notFound('File not available yet')

    const abuse = await checkDownloadAbuse(req)
    if (abuse.limited) {
      await logAccess(req, 'rate_limited', { product, note: `${abuse.count} downloads in the last hour` })
      throw new AppError(429, 'DOWNLOAD_LIMIT', 'Download limit reached, please try again later')
    }
    if (abuse.suspicious) {
      await logAccess(req, 'suspicious', { product, note: `${abuse.distinct} distinct IPs in the last hour` })
      logger.warn('suspicious download pattern', { userId: String(req.user._id), ips: abuse.distinct })
    }

    const original = await getObject(product.file.key)
    const stamped = await watermarkPdf(original, { email: req.user.email, userId: req.user._id, orderRef: product.slug })
    await logAccess(req, 'download', { product })

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${product.slug}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    res.send(stamped)
  }),
)

export default router
