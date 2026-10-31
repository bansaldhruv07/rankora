import { Router } from 'express'
import { z } from 'zod'
import { optionalAuth } from '../middleware/auth.js'
import { Product } from '../models/Product.js'
import { quote, quoteToPublic } from '../services/pricing.js'
import { getObject } from '../services/storage.js'
import { notFound } from '../utils/AppError.js'
import { asyncHandler, escapeRegex, ok, pageMeta, pageParams, parse } from '../utils/http.js'

const router = Router()

const slugParam = z.string().regex(/^[a-z0-9-]{1,80}$/)

const listSchema = z.object({
  subject: z.string().trim().toLowerCase().max(40).optional(),
  class: z.enum(['11', '12', 'both']).optional(),
  chapter: z.string().trim().max(120).optional(),
  type: z.enum(['notes', 'formula', 'pyq', 'mock']).optional(),
  price: z.enum(['free', 'paid']).optional(),
  kind: z.enum(['note', 'bundle', 'plan', 'any']).default('note'),
  tag: z.string().trim().toLowerCase().max(40).optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc']).default('featured'),
})

const SORTS = {
  featured: { sortOrder: 1, createdAt: 1 },
  newest: { publishedAt: -1, createdAt: -1 },
  'price-asc': { pricePaise: 1, sortOrder: 1 },
  'price-desc': { pricePaise: -1, sortOrder: 1 },
}

// Sum of the current selling prices of a bundle's published notes: the honest "bought separately" total.
async function bundleContext(bundles) {
  const ids = [...new Set(bundles.flatMap((b) => b.bundleItems.map(String)))]
  const items = ids.length ? await Product.find({ _id: { $in: ids }, status: 'published', kind: 'note' }) : []
  const byId = new Map(items.map((item) => [String(item._id), item]))
  return (bundle) => {
    const own = bundle.bundleItems.map((id) => byId.get(String(id))).filter(Boolean)
    return { items: own, separatePaise: own.reduce((sum, item) => sum + item.pricePaise, 0) }
  }
}

async function serialise(products, extra = {}) {
  const bundles = products.filter((p) => p.kind === 'bundle')
  const contextFor = bundles.length ? await bundleContext(bundles) : null
  return products.map((p) => {
    const ctx = p.kind === 'bundle' ? contextFor(p) : {}
    return {
      ...p.toPublic(ctx),
      ...(p.kind === 'note' ? { premiumIncluded: p.premiumEligible !== false } : {}),
      ...(extra[String(p._id)] ?? {}),
    }
  })
}

// Public catalogue: published products only, preview metadata only (never file references).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const f = parse(listSchema, req.query)
    const { page, limit, skip } = pageParams(req.query)
    const filter = { status: 'published' }
    if (f.kind !== 'any') filter.kind = f.kind
    if (f.subject) filter.subject = f.subject
    if (f.class) filter.classLevel = { $in: f.class === 'both' ? ['both'] : [f.class, 'both'] }
    if (f.chapter) filter.chapter = f.chapter
    if (f.type) filter.type = f.type
    if (f.tag) filter.tags = f.tag
    if (f.price === 'free') filter.pricePaise = 0
    if (f.price === 'paid') filter.pricePaise = { $gt: 0 }
    if (f.q) {
      const rx = new RegExp(escapeRegex(f.q), 'i')
      filter.$or = [{ title: rx }, { summary: rx }, { chapter: rx }, { tags: rx }]
    }
    const [items, total] = await Promise.all([
      Product.find(filter).sort(SORTS[f.sort]).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ])
    ok(res, await serialise(items), pageMeta(page, limit, total))
  }),
)

// Subject > class > chapter navigation, counted from published notes.
router.get(
  '/catalog',
  asyncHandler(async (_req, res) => {
    const rows = await Product.aggregate([
      { $match: { status: 'published', kind: 'note' } },
      { $group: { _id: { subject: '$subject', classLevel: '$classLevel', chapter: '$chapter' }, count: { $sum: 1 } } },
      { $sort: { '_id.subject': 1, '_id.chapter': 1 } },
    ])
    const tree = {}
    for (const { _id, count } of rows) {
      const subject = (tree[_id.subject ?? 'other'] ||= { count: 0, classes: {}, chapters: [] })
      subject.count += count
      if (_id.classLevel) subject.classes[_id.classLevel] = (subject.classes[_id.classLevel] ?? 0) + count
      if (_id.chapter) subject.chapters.push({ chapter: _id.chapter, classLevel: _id.classLevel ?? null, count })
    }
    ok(res, tree)
  }),
)

// Price breakdown for a coupon before an order exists. Read-only; the order is priced again when created.
router.post(
  '/:slug/quote',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const slug = slugParam.safeParse(req.params.slug)
    const product = slug.success ? await Product.findOne({ slug: slug.data, status: 'published' }) : null
    if (!product) throw notFound('Product not found')
    const { coupon } = parse(z.object({ coupon: z.string().trim().max(30).optional() }), req.body ?? {})
    const q = await quote({ product, couponCode: coupon, userId: req.user?._id })
    ok(res, quoteToPublic(q))
  }),
)

// Page views, de-duplicated per visitor and note for a while so refreshing does not inflate the metric.
const recentViews = new Map()
const VIEW_WINDOW_MS = 30 * 60 * 1000
function countView(req, product) {
  if (/bot|crawl|spider|preview|monitor/i.test(req.get('user-agent') || '')) return
  const key = `${req.ip}|${product._id}`
  const now = Date.now()
  if (now - (recentViews.get(key) ?? 0) < VIEW_WINDOW_MS) return
  if (recentViews.size > 20000) for (const [k, t] of recentViews) if (now - t > VIEW_WINDOW_MS) recentViews.delete(k)
  recentViews.set(key, now)
  Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } }).catch(() => {})
}

router.get(
  '/:slug/cover',
  asyncHandler(async (req, res) => {
    const slug = slugParam.safeParse(req.params.slug)
    const product = slug.success ? await Product.findOne({ slug: slug.data, status: 'published' }).select('+cover') : null
    if (!product?.cover?.key) throw notFound('No cover')
    res.set({
      'Content-Type': product.cover.type,
      // Versioned by ?v=, so it can be cached for a year; cross-origin so the SPA can embed it.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    })
    res.send(await getObject(product.cover.key))
  }),
)

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = slugParam.safeParse(req.params.slug)
    const product = slug.success ? await Product.findOne({ slug: slug.data, status: 'published' }) : null
    if (!product) throw notFound('Product not found')
    countView(req, product)

    const [detail] = await serialise([product])
    const result = { ...detail }

    if (product.kind === 'note') {
      // Bundles that include this note, with the saving measured against buying the notes separately.
      const bundles = await Product.find({ status: 'published', kind: 'bundle', bundleItems: product._id }).sort({ pricePaise: 1 }).limit(4)
      result.bundles = await serialise(bundles)
      const sameSubject = { status: 'published', kind: 'note', _id: { $ne: product._id }, subject: product.subject, pricePaise: { $gt: 0 } }
      const related = await Product.find(sameSubject).sort({ sortOrder: 1, createdAt: 1 }).limit(12)
      // Same class first, then everything else in the subject.
      related.sort((a, b) => Number(b.classLevel === product.classLevel) - Number(a.classLevel === product.classLevel))
      result.related = await serialise(related.slice(0, 3))
    }
    ok(res, result)
  }),
)

export default router
