import mongoose from 'mongoose'

const sampleSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, maxlength: 200 },
    points: [{ type: String, trim: true, maxlength: 500 }],
    formulas: [{ _id: false, label: { type: String, maxlength: 120 }, expr: { type: String, maxlength: 200 } }],
  },
  { _id: false },
)

const fileSchema = new mongoose.Schema(
  {
    key: String,
    originalName: String,
    size: Number,
    pages: Number,
    sha256: String,
    version: { type: Number, default: 1 },
    uploadedAt: Date,
  },
  { _id: false },
)

export const PRODUCT_STATUSES = ['draft', 'published', 'archived']
export const PRODUCT_KINDS = ['note', 'bundle', 'plan']
export const CLASS_LEVELS = ['11', '12', 'both']

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    summary: { type: String, trim: true, maxlength: 1000, default: '' },
    description: { type: String, trim: true, maxlength: 8000, default: '' },
    // `note` is one PDF; `bundle` grants a set of notes; `plan` grants every Premium-eligible note for `planDays`.
    kind: { type: String, enum: PRODUCT_KINDS, default: 'note' },
    subject: { type: String, trim: true, lowercase: true, maxlength: 40 },
    classLevel: { type: String, enum: CLASS_LEVELS },
    chapter: { type: String, trim: true, maxlength: 120 },
    topic: { type: String, trim: true, maxlength: 120 },
    // `type` stays open for the legacy PYQ / mock catalogue.
    type: { type: String, enum: ['notes', 'formula', 'pyq', 'mock', 'plan', 'bundle'], default: 'notes' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
    length: { type: String, trim: true, maxlength: 60 },
    pages: { type: Number, min: 0, max: 5000 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    // Selling price. `mrpPaise` is the optional original price; a discount is only ever shown when mrp > price.
    pricePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    mrpPaise: { type: Number, min: 0, validate: Number.isInteger },
    currency: { type: String, default: 'INR', enum: ['INR'] },
    planDays: { type: Number, min: 1, max: 3660 },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft' },
    publishedAt: Date,
    contents: [{ type: String, trim: true, maxlength: 300 }],
    includes: [{ type: String, trim: true, maxlength: 300 }],
    audience: [{ type: String, trim: true, maxlength: 300 }],
    sample: sampleSchema,
    mockTestId: { type: String, trim: true, maxlength: 80 },
    // Display priority: lower numbers first.
    sortOrder: { type: Number, default: 0 },
    // Legacy products predate this flag and keep Premium access; admin-created notes default to excluded.
    premiumEligible: { type: Boolean, default: true },
    // 1-based page numbers shown as the free sample.
    previewPages: [{ type: Number, min: 1, max: 5000 }],
    bundleItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    viewCount: { type: Number, default: 0 },
    // Cover image reference. Public marketing asset: only `coverUrl` is ever serialised, never the key.
    cover: new mongoose.Schema({ key: String, type: String, size: Number, version: Number }, { _id: false }),
    // Private storage reference. Never serialised to clients.
    file: { type: fileSchema, select: false },
    fileHistory: { type: [fileSchema], select: false },
  },
  { timestamps: true },
)

productSchema.index({ status: 1, kind: 1, subject: 1, chapter: 1 })
productSchema.index({ status: 1, sortOrder: 1, createdAt: 1 })
productSchema.index({ bundleItems: 1 })

productSchema.pre('validate', function checkPrices() {
  if (this.mrpPaise != null && this.mrpPaise < this.pricePaise) {
    this.invalidate('mrpPaise', 'Original price cannot be lower than the selling price')
  }
})

// Savings are only reported when they are real: against an explicit MRP, or (bundles) the sum of
// the included notes' current selling prices.
export function savingsFor(pricePaise, referencePaise) {
  if (!referencePaise || referencePaise <= pricePaise) return null
  const amount = referencePaise - pricePaise
  return { amount: amount / 100, percent: Math.round((amount / referencePaise) * 100), referencePrice: referencePaise / 100 }
}

productSchema.methods.toPublic = function toPublic({ admin = false, items, separatePaise } = {}) {
  const sample = this.sample
  const reference = this.kind === 'bundle' ? Math.max(this.mrpPaise ?? 0, separatePaise ?? 0) : this.mrpPaise
  const out = {
    id: String(this._id),
    slug: this.slug,
    title: this.title,
    summary: this.summary,
    description: this.description,
    kind: this.kind,
    subject: this.subject,
    classLevel: this.classLevel,
    chapter: this.chapter,
    topic: this.topic,
    type: this.type,
    difficulty: this.difficulty,
    length: this.length,
    pages: this.pages,
    tags: [...(this.tags || [])],
    currency: this.currency,
    planDays: this.planDays,
    mockTestId: this.mockTestId,
    contents: [...(this.contents || [])],
    includes: [...(this.includes || [])],
    audience: [...(this.audience || [])],
    price: this.pricePaise / 100,
    mrp: this.mrpPaise != null ? this.mrpPaise / 100 : null,
    savings: savingsFor(this.pricePaise, reference),
    previewPageCount: this.previewPages?.length ?? 0,
    hasCover: Boolean(this.cover?.key),
    coverUrl: this.cover?.key ? `/api/products/${this.slug}/cover?v=${this.cover.version ?? 1}` : null,
    sortOrder: this.sortOrder,
    publishedAt: this.publishedAt,
    sample: {
      heading: sample?.heading ?? '',
      points: [...(sample?.points || [])],
      formulas: (sample?.formulas || []).map((f) => ({ label: f.label, expr: f.expr })),
    },
  }
  if (this.kind === 'bundle') {
    out.items = (items ?? []).map((item) => item.toPublic())
    out.separatePrice = separatePaise != null ? separatePaise / 100 : null
  }
  if (admin) {
    out.hasFile = Boolean(this.file?.key)
    out.status = this.status
    out.premiumEligible = this.premiumEligible
    out.previewPages = [...(this.previewPages || [])]
    out.bundleItemIds = (this.bundleItems || []).map((id) => String(id._id ?? id))
    out.viewCount = this.viewCount
    out.createdAt = this.createdAt
    out.updatedAt = this.updatedAt
    if (this.file?.key) {
      out.file = {
        originalName: this.file.originalName,
        size: this.file.size,
        pages: this.file.pages,
        version: this.file.version,
        uploadedAt: this.file.uploadedAt,
      }
    }
  }
  return out
}

export const Product = mongoose.model('Product', productSchema)
