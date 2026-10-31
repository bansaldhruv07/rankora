import crypto from 'node:crypto'
import express, { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { requirePermission } from '../../middleware/auth.js'
import { Order } from '../../models/Order.js'
import { Product } from '../../models/Product.js'
import { audit } from '../../services/audit.js'
import { extendBundleBuyers } from '../../services/entitlements.js'
import { inspectPdf, sniffImage, slugify, titleFromFilename } from '../../services/pdf.js'
import { startAdminSession, startSampleSession } from '../../services/reader.js'
import { deleteObject, getObject, putObject } from '../../services/storage.js'
import { badRequest, conflict, notFound } from '../../utils/AppError.js'
import { asyncHandler, assertObjectId, escapeRegex, ok, pageMeta, pageParams, parse } from '../../utils/http.js'
import { logger } from '../../utils/logger.js'

const router = Router()
router.use(requirePermission('content'))

const SUBJECTS = ['physics', 'chemistry', 'mathematics', 'mixed']
const MAX_HISTORY = 3

const text = (max) => z.string().trim().max(max)
const list = (max, count) => z.array(text(max).min(1)).max(count)
// Rupees with at most two decimals, stored as integer paise.
const rupees = z
  .number()
  .min(0)
  .max(100000)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'At most 2 decimals')

const fields = z.object({
  title: text(160).min(2),
  summary: text(1000),
  description: text(8000),
  subject: z.enum(SUBJECTS),
  classLevel: z.enum(['11', '12', 'both']),
  chapter: text(120),
  topic: text(120),
  type: z.enum(['notes', 'formula', 'pyq', 'mock']),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).nullable(),
  pages: z.number().int().min(1).max(5000).nullable(),
  tags: list(40, 12),
  price: rupees,
  mrp: rupees.nullable(),
  planDays: z.number().int().min(1).max(3660),
  contents: list(300, 60),
  includes: list(300, 40),
  audience: list(300, 20),
  previewPages: z.array(z.number().int().min(1).max(5000)).max(30),
  sortOrder: z.number().int().min(0).max(100000),
  premiumEligible: z.boolean(),
  bundleItems: z.array(z.string()).max(100),
})

const createSchema = fields
  .partial()
  .extend({ slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/).optional(), kind: z.enum(['note', 'bundle', 'plan']).default('note') })
  .required({ title: true, price: true })
const updateSchema = fields.partial()

function toDoc({ price, mrp, tags, difficulty, pages, bundleItems, ...rest }) {
  const doc = { ...rest }
  if (price !== undefined) doc.pricePaise = Math.round(price * 100)
  if (mrp !== undefined) doc.mrpPaise = mrp === null ? undefined : Math.round(mrp * 100)
  if (tags !== undefined) doc.tags = [...new Set(tags.map((t) => t.toLowerCase()))]
  if (difficulty !== undefined) doc.difficulty = difficulty ?? undefined
  if (pages !== undefined) doc.pages = pages ?? undefined
  if (bundleItems !== undefined) doc.bundleItems = bundleItems
  if (doc.previewPages) doc.previewPages = [...new Set(doc.previewPages)].sort((a, b) => a - b)
  return doc
}

async function findProduct(id, select = '+file +cover +fileHistory') {
  const product = await Product.findById(assertObjectId(id)).select(select)
  if (!product) throw notFound('Product not found')
  return product
}

async function uniqueSlug(base) {
  const root = slugify(base) || 'notes'
  for (let n = 1; n < 50; n += 1) {
    const candidate = n === 1 ? root : `${root.slice(0, 74)}-${n}`
    if (!(await Product.exists({ slug: candidate }))) return candidate
  }
  return `${root.slice(0, 60)}-${crypto.randomBytes(3).toString('hex')}`
}

// Bundles may only contain existing notes, never themselves, with no duplicates.
async function validateBundleItems(ids, selfId) {
  const unique = [...new Set(ids.map((id) => assertObjectId(id)))]
  if (selfId && unique.includes(String(selfId))) throw badRequest('A bundle cannot contain itself')
  const found = await Product.find({ _id: { $in: unique }, kind: 'note' }).select('_id')
  if (found.length !== unique.length) throw badRequest('Bundles can only contain existing notes')
  return unique
}

const serialiseAdmin = (product) => product.toPublic({ admin: true })

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = parse(
      z.object({
        status: z.enum(['draft', 'published', 'archived']).optional(),
        kind: z.enum(['note', 'bundle', 'plan']).optional(),
        subject: z.enum(SUBJECTS).optional(),
        classLevel: z.enum(['11', '12', 'both']).optional(),
        q: z.string().trim().max(80).optional(),
        sort: z.enum(['priority', 'newest', 'oldest', 'title', 'price', 'views']).default('priority'),
      }),
      req.query,
    )
    const { page, limit, skip } = pageParams(req.query, { maxLimit: 100 })
    const filter = {}
    for (const key of ['status', 'kind', 'subject', 'classLevel']) if (q[key]) filter[key] = q[key]
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q), 'i')
      filter.$or = [{ title: rx }, { chapter: rx }, { slug: rx }, { tags: rx }]
    }
    const sort = { priority: { sortOrder: 1, createdAt: 1 }, newest: { createdAt: -1 }, oldest: { createdAt: 1 }, title: { title: 1 }, price: { pricePaise: 1 }, views: { viewCount: -1 } }[q.sort]
    const [items, total] = await Promise.all([
      Product.find(filter).select('+file +cover').sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ])
    ok(res, items.map(serialiseAdmin), pageMeta(page, limit, total))
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => ok(res, serialiseAdmin(await findProduct(req.params.id)))),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { slug, kind, ...body } = parse(createSchema, req.body)
    const data = toDoc(body)
    if (kind === 'plan' && !data.planDays) throw badRequest('planDays is required for plans')
    if (kind === 'bundle') {
      data.bundleItems = await validateBundleItems(data.bundleItems ?? [])
      data.type = 'bundle'
      data.premiumEligible = false
    } else if (kind === 'note') {
      // New notes are sold on their own; the Premium plan only unlocks them if the admin opts in.
      data.premiumEligible ??= false
    }
    const product = await Product.create({ ...data, kind, slug: slug ?? (await uniqueSlug(data.title)), status: 'draft' })
    await audit(req, 'product.create', { type: 'product', id: product._id, summary: `Created ${kind} "${product.title}"` })
    ok(res, serialiseAdmin(product), undefined, 201)
  }),
)

// Raw PDF bodies: the admin UI uploads one file per request (with real progress), the PDF is
// validated by content, and the stored key is server-generated.
// Parsers are built per request so the size limits follow the current configuration.
const rawPdf = (req, res, next) => express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: env.maxPdfBytes })(req, res, next)
const rawImage = (req, res, next) =>
  express.raw({ type: ['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'], limit: env.maxCoverBytes })(req, res, next)

function headerFilename(req) {
  const raw = String(req.get('x-filename') || '')
  try {
    return decodeURIComponent(raw).replace(/[\r\n]/g, ' ').slice(0, 200)
  } catch {
    return raw.replace(/[\r\n%]/g, ' ').slice(0, 200)
  }
}

// Validates and stores a PDF under a fresh server-generated key. Nothing about the key comes from the client.
async function storePdf({ id, slug, current }, body, originalName) {
  const info = await inspectPdf(body)
  const version = (current?.version ?? 0) + 1
  const key = `notes/${id}-v${version}-${crypto.randomBytes(6).toString('hex')}.pdf`
  await putObject(key, body)
  return {
    info,
    file: { key, originalName: originalName || `${slug}.pdf`, size: info.size, pages: info.pages, sha256: info.sha256, version, uploadedAt: new Date() },
  }
}

const uploadQuery = z.object({
  subject: z.enum(SUBJECTS).optional(),
  classLevel: z.enum(['11', '12', 'both']).optional(),
  price: z.coerce.number().min(0).max(100000).optional(),
})

// Creates a draft note straight from a PDF (bulk upload sends these one after another).
router.post(
  '/upload',
  rawPdf,
  asyncHandler(async (req, res) => {
    const defaults = parse(uploadQuery, req.query)
    const filename = headerFilename(req)
    const _id = new mongoose.Types.ObjectId()
    const { info, file } = await storePdf({ id: _id, slug: 'notes' }, req.body, filename)
    const title = info.title || titleFromFilename(filename) || 'Untitled notes'
    try {
      const product = await Product.create({
        _id,
        slug: await uniqueSlug(title),
        title,
        kind: 'note',
        type: 'notes',
        subject: defaults.subject,
        classLevel: defaults.classLevel,
        pages: info.pages,
        length: `${info.pages} pages`,
        pricePaise: Math.round((defaults.price ?? 0) * 100),
        premiumEligible: false,
        status: 'draft',
        file,
      })
      await audit(req, 'product.upload', { type: 'product', id: product._id, summary: `Uploaded "${filename}" as draft "${title}"`, meta: { pages: info.pages, size: info.size } })
      ok(res, { ...serialiseAdmin(await findProduct(String(product._id))), suggestedFromFile: { title: info.title ?? null } }, undefined, 201)
    } catch (err) {
      await deleteObject(file.key).catch(() => {})
      throw err
    }
  }),
)

// Replaces the PDF. Purchases are attached to the product, not the file, so every buyer keeps access
// and simply reads the new version. The previous version is kept for rollback.
router.put(
  '/:id/file',
  rawPdf,
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    if (product.kind !== 'note') throw badRequest('Only notes have a PDF')
    const { info, file } = await storePdf({ id: product._id, slug: product.slug, current: product.file }, req.body, headerFilename(req))

    const previousPages = product.file?.pages
    const history = product.file?.key ? [...(product.fileHistory ?? []), product.file] : [...(product.fileHistory ?? [])]
    product.fileHistory = history.slice(-MAX_HISTORY)
    const dropped = history.slice(0, -MAX_HISTORY)
    product.file = file
    // Keep the page count in step with the file unless the admin typed a different number.
    if (!product.pages || product.pages === previousPages) {
      product.pages = info.pages
      product.length = `${info.pages} pages`
    }
    product.previewPages = product.previewPages.filter((n) => n <= info.pages)
    await product.save()
    for (const old of dropped) await deleteObject(old.key).catch(() => {})
    await audit(req, 'product.file.replace', { type: 'product', id: product._id, summary: `Replaced PDF of "${product.title}" (v${file.version})`, meta: { pages: info.pages, size: info.size } })
    ok(res, serialiseAdmin(product))
  }),
)

router.put(
  '/:id/cover',
  rawImage,
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    const type = sniffImage(req.body)
    if (!type) throw badRequest('Cover must be a PNG, JPEG or WebP image')
    const version = (product.cover?.version ?? 0) + 1
    const key = `covers/${product._id}-v${version}-${crypto.randomBytes(4).toString('hex')}`
    await putObject(key, req.body)
    const previous = product.cover?.key
    product.cover = { key, type, size: req.body.length, version }
    await product.save()
    if (previous) await deleteObject(previous).catch(() => {})
    await audit(req, 'product.cover', { type: 'product', id: product._id, summary: `Updated cover of "${product.title}"` })
    ok(res, serialiseAdmin(product))
  }),
)

router.delete(
  '/:id/cover',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    const previous = product.cover?.key
    product.cover = undefined
    await product.save()
    if (previous) await deleteObject(previous).catch(() => {})
    ok(res, serialiseAdmin(product))
  }),
)

// Covers of unpublished products are visible to staff here (the public route serves published ones).
router.get(
  '/:id/cover',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id, '+cover')
    if (!product.cover?.key) throw notFound('No cover')
    res.set({
      'Content-Type': product.cover.type,
      'Cache-Control': 'private, max-age=60',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    })
    res.send(await getObject(product.cover.key))
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    const data = toDoc(parse(updateSchema, req.body))
    if (data.bundleItems !== undefined) {
      if (product.kind !== 'bundle') throw badRequest('Only bundles have items')
      data.bundleItems = await validateBundleItems(data.bundleItems, product._id)
    }
    if (data.previewPages && product.file?.pages && data.previewPages.some((n) => n > product.file.pages)) {
      throw badRequest(`Preview pages must be within 1-${product.file.pages}`)
    }
    const before = new Set((product.bundleItems ?? []).map(String))
    product.set(data)
    await product.save()
    if (data.bundleItems) {
      await extendBundleBuyers(product._id, data.bundleItems.filter((id) => !before.has(id)))
    }
    await audit(req, 'product.update', { type: 'product', id: product._id, summary: `Edited "${product.title}"`, meta: { fields: Object.keys(req.body) } })
    ok(res, serialiseAdmin(product))
  }),
)

async function assertPublishable(product) {
  if (!product.subject || !product.classLevel) throw conflict('Set the subject and class before publishing')
  if (product.kind === 'note' && !product.file?.key) throw conflict('Upload the PDF before publishing')
  if (product.kind === 'plan' && !product.planDays) throw conflict('Set planDays before publishing')
  if (product.kind === 'bundle') {
    if (product.bundleItems.length < 2) throw conflict('A bundle needs at least two notes')
    const unpublished = await Product.find({ _id: { $in: product.bundleItems }, status: { $ne: 'published' } }).select('title')
    if (unpublished.length) throw conflict(`Publish these notes first: ${unpublished.map((p) => p.title).join(', ')}`)
  }
}

router.post(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    await assertPublishable(product)
    product.status = 'published'
    product.publishedAt ??= new Date()
    await product.save()
    await audit(req, 'product.publish', { type: 'product', id: product._id, summary: `Published "${product.title}"` })
    ok(res, serialiseAdmin(product))
  }),
)

// Taking something off sale never removes access from people who already bought it.
router.post(
  '/:id/unpublish',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    product.status = 'draft'
    await product.save()
    await audit(req, 'product.unpublish', { type: 'product', id: product._id, summary: `Unpublished "${product.title}"` })
    ok(res, serialiseAdmin(product))
  }),
)

router.post(
  '/:id/archive',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    product.status = 'archived'
    await product.save()
    await audit(req, 'product.archive', { type: 'product', id: product._id, summary: `Archived "${product.title}"` })
    ok(res, serialiseAdmin(product))
  }),
)

// Permanent deletion is only possible for products nobody has ever ordered or bundled.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    if (await Order.exists({ product: product._id })) {
      throw conflict('This product has orders, so it cannot be deleted. Archive it instead; buyers keep their access.')
    }
    const bundle = await Product.findOne({ bundleItems: product._id }).select('title')
    if (bundle) throw conflict(`It is part of the bundle "${bundle.title}". Remove it from the bundle first.`)
    await product.deleteOne()
    for (const key of [product.file?.key, product.cover?.key, ...(product.fileHistory ?? []).map((f) => f.key)]) {
      if (key) await deleteObject(key).catch((err) => logger.warn('could not delete object', { error: err.message }))
    }
    await audit(req, 'product.delete', { type: 'product', id: product._id, summary: `Deleted "${product.title}"` })
    ok(res, { deleted: true })
  }),
)

// Lets staff read any note (draft or not) in the real reader, or see exactly the sample students get.
router.post(
  '/:id/preview-session',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id)
    if (product.kind !== 'note' || !product.file?.key) throw conflict('Upload the PDF first')
    const sample = req.query.sample === '1'
    if (sample && !product.previewPages.length) throw conflict('No preview pages are set')
    const payload = sample
      ? await startSampleSession({ req, user: req.user, product })
      : await startAdminSession({ req, staff: req.user, product })
    ok(res, payload, undefined, 201)
  }),
)

export default router
