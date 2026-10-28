import mongoose from 'mongoose'

const sampleSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, maxlength: 200 },
    points: [{ type: String, trim: true, maxlength: 500 }],
    formulas: [{ _id: false, label: { type: String, maxlength: 120 }, expr: { type: String, maxlength: 200 } }],
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    summary: { type: String, trim: true, maxlength: 1000, default: '' },
    // `note` is a purchasable resource; `plan` grants access to every paid resource for `planDays`.
    kind: { type: String, enum: ['note', 'plan'], default: 'note' },
    // Subject > chapter > topic organisation. `type` stays open for future PYQ / mock products.
    subject: { type: String, trim: true, lowercase: true, maxlength: 40 },
    chapter: { type: String, trim: true, maxlength: 120 },
    topic: { type: String, trim: true, maxlength: 120 },
    type: { type: String, enum: ['notes', 'formula', 'pyq', 'mock', 'plan'], default: 'notes' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
    length: { type: String, trim: true, maxlength: 60 },
    pricePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    currency: { type: String, default: 'INR', enum: ['INR'] },
    planDays: { type: Number, min: 1, max: 3660 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    contents: [{ type: String, trim: true, maxlength: 300 }],
    includes: [{ type: String, trim: true, maxlength: 300 }],
    sample: sampleSchema,
    mockTestId: { type: String, trim: true, maxlength: 80 },
    sortOrder: { type: Number, default: 0 },
    // Private storage reference. Never serialised to clients.
    file: {
      type: new mongoose.Schema({ key: String, originalName: String, size: Number, uploadedAt: Date }, { _id: false }),
      select: false,
    },
  },
  { timestamps: true },
)

productSchema.index({ status: 1, kind: 1, subject: 1, chapter: 1 })

productSchema.methods.toPublic = function toPublic({ admin = false } = {}) {
  const sample = this.sample
  const out = {
    id: String(this._id),
    slug: this.slug,
    title: this.title,
    summary: this.summary,
    kind: this.kind,
    subject: this.subject,
    chapter: this.chapter,
    topic: this.topic,
    type: this.type,
    difficulty: this.difficulty,
    length: this.length,
    currency: this.currency,
    planDays: this.planDays,
    mockTestId: this.mockTestId,
    contents: [...(this.contents || [])],
    includes: [...(this.includes || [])],
    price: this.pricePaise / 100,
    sample: {
      heading: sample?.heading ?? '',
      points: [...(sample?.points || [])],
      formulas: (sample?.formulas || []).map((f) => ({ label: f.label, expr: f.expr })),
    },
  }
  if (admin) {
    out.hasFile = Boolean(this.file?.key)
    out.status = this.status
    out.sortOrder = this.sortOrder
    out.createdAt = this.createdAt
    out.updatedAt = this.updatedAt
    if (this.file?.key) {
      out.file = { originalName: this.file.originalName, size: this.file.size, uploadedAt: this.file.uploadedAt }
    }
  }
  return out
}

export const Product = mongoose.model('Product', productSchema)
