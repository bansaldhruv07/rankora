import { Router } from 'express'
import { z } from 'zod'
import { Product } from '../models/Product.js'
import { notFound } from '../utils/AppError.js'
import { asyncHandler, escapeRegex, ok, pageMeta, pageParams, parse } from '../utils/http.js'

const router = Router()

const listSchema = z.object({
  subject: z.string().trim().toLowerCase().max(40).optional(),
  chapter: z.string().trim().max(120).optional(),
  type: z.enum(['notes', 'formula', 'pyq', 'mock']).optional(),
  price: z.enum(['free', 'paid']).optional(),
  kind: z.enum(['note', 'plan']).default('note'),
  q: z.string().trim().max(80).optional(),
})

// Public catalogue: published products only, preview metadata only (never file references).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const f = parse(listSchema, req.query)
    const { page, limit, skip } = pageParams(req.query)
    const filter = { status: 'published', kind: f.kind }
    if (f.subject) filter.subject = f.subject
    if (f.chapter) filter.chapter = f.chapter
    if (f.type) filter.type = f.type
    if (f.price === 'free') filter.pricePaise = 0
    if (f.price === 'paid') filter.pricePaise = { $gt: 0 }
    if (f.q) {
      const rx = new RegExp(escapeRegex(f.q), 'i')
      filter.$or = [{ title: rx }, { summary: rx }, { chapter: rx }]
    }
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ sortOrder: 1, createdAt: 1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ])
    ok(res, items.map((p) => p.toPublic()), pageMeta(page, limit, total))
  }),
)

// Subject > chapter > topic tree for navigation.
router.get(
  '/catalog',
  asyncHandler(async (_req, res) => {
    const rows = await Product.aggregate([
      { $match: { status: 'published', kind: 'note' } },
      { $group: { _id: { subject: '$subject', chapter: '$chapter' }, count: { $sum: 1 }, topics: { $addToSet: '$topic' } } },
      { $sort: { '_id.subject': 1, '_id.chapter': 1 } },
    ])
    const tree = {}
    for (const row of rows) {
      const { subject, chapter } = row._id
      ;(tree[subject] ||= []).push({ chapter, count: row.count, topics: row.topics.filter(Boolean) })
    }
    ok(res, tree)
  }),
)

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const slug = z.string().regex(/^[a-z0-9-]{1,80}$/).safeParse(req.params.slug)
    const product = slug.success ? await Product.findOne({ slug: slug.data, status: 'published' }) : null
    if (!product) throw notFound('Product not found')
    ok(res, product.toPublic())
  }),
)

export default router
