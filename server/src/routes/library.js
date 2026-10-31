import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Product } from '../models/Product.js'
import { ReadingProgress } from '../models/ReadingProgress.js'
import { accessSummary, ownedMap, premiumEntitlement } from '../services/entitlements.js'
import { orderReference } from '../utils/crypto.js'
import { asyncHandler, ok } from '../utils/http.js'

const router = Router()
router.use(requireAuth)

// The signed-in student's notes: explicit purchases, bundle contents and (for eligible notes) Premium.
// Files are never linked from here; reading goes through POST /api/reader/sessions.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user._id
    const [owned, premium, access] = await Promise.all([ownedMap(userId), premiumEntitlement(userId), accessSummary(userId)])

    const or = [{ _id: { $in: [...owned.keys()] } }]
    if (premium) or.push({ status: 'published', premiumEligible: { $ne: false } })
    const products = await Product.find({ kind: 'note', pricePaise: { $gt: 0 }, 'file.key': { $exists: true }, $or: or })
      .select('+file')
      .sort({ subject: 1, classLevel: 1, sortOrder: 1, title: 1 })

    const progress = await ReadingProgress.find({ user: userId, product: { $in: products.map((p) => p._id) } }).lean()
    const progressBy = new Map(progress.map((p) => [String(p.product), p]))

    const items = products.map((product) => {
      const own = owned.get(String(product._id))
      const source = own?.source ?? 'premium'
      const orderId = own?.orderId ?? premium?.order
      const since = own?.since ?? premium?.createdAt
      const read = progressBy.get(String(product._id))
      return {
        product: product.toPublic(),
        source,
        purchasedAt: since,
        orderReference: orderId ? orderReference(orderId) : null,
        expiresAt: source === 'premium' ? premium?.expiresAt : null,
        pages: product.file.pages ?? product.pages ?? null,
        progress: read ? { page: read.page, pages: read.pages, lastReadAt: read.lastReadAt } : null,
        // Surfaces replaced PDFs (corrections, new editions) that were uploaded after the student got access.
        updatedSincePurchase: Boolean(product.file.version > 1 && since && product.file.uploadedAt > since),
        updatedAt: product.file.uploadedAt,
      }
    })
    const continueReading = items
      .filter((item) => item.progress)
      .sort((a, b) => new Date(b.progress.lastReadAt) - new Date(a.progress.lastReadAt))[0]?.product.slug
    ok(res, { items, access, continueReading: continueReading ?? null })
  }),
)

export default router
