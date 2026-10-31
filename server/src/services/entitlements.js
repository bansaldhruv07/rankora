import { Entitlement } from '../models/Entitlement.js'
import { Product } from '../models/Product.js'

const DAY = 86400000

const activeFilter = (userId, now = new Date()) => ({
  user: userId,
  status: 'active',
  $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
})

// Which active entitlement (if any) lets this user read this note? Free notes need none.
// Explicit purchases win over a Premium plan so the watermark/order reference stays specific.
export async function findAccess(userId, product) {
  if (product.pricePaise === 0 && product.kind === 'note') return { source: 'free' }
  if (product.kind !== 'note') return null
  const scopes = [
    { scope: 'product', product: product._id },
    { scope: 'bundle', products: product._id },
  ]
  // Legacy products have no flag and stay Premium-eligible; admin-created notes opt in.
  if (product.premiumEligible !== false) scopes.push({ scope: 'all-paid' })
  const row = await Entitlement.findOne({ $and: [activeFilter(userId), { $or: scopes }] })
    .sort({ scope: -1 })
    .select('order scope')
    .lean()
  return row ? { source: row.scope, orderId: row.order } : null
}

export const hasAccess = async (userId, product) => Boolean(await findAccess(userId, product))

// Everything the signed-in user owns, as slugs for the frontend (products they can read or that they bought).
export async function accessSummary(userId) {
  const rows = await Entitlement.find(activeFilter(userId))
    .select('scope product products expiresAt')
    .populate('product', 'slug')
    .populate('products', 'slug')
    .lean()
  const premium = rows.filter((row) => row.scope === 'all-paid')
  const premiumUntil = premium.reduce((latest, row) => (!latest || row.expiresAt > latest ? row.expiresAt : latest), null)
  const slugs = new Set()
  for (const row of rows) {
    if (row.scope === 'all-paid') continue
    if (row.product?.slug) slugs.add(row.product.slug)
    for (const item of row.products ?? []) if (item?.slug) slugs.add(item.slug)
  }
  return { premium: premium.length > 0, premiumUntil, productSlugs: [...slugs] }
}

// product id -> { source, orderId, since, bundleId? } for explicit purchases and bundle contents.
export async function ownedMap(userId) {
  const rows = await Entitlement.find({ ...activeFilter(userId), scope: { $in: ['product', 'bundle'] } })
    .select('scope product products order createdAt')
    .lean()
  const owned = new Map()
  const put = (id, value) => {
    const key = String(id)
    if (!owned.has(key)) owned.set(key, value)
  }
  for (const row of rows) {
    if (row.scope === 'product') put(row.product, { source: 'purchase', orderId: row.order, since: row.createdAt })
    else for (const id of row.products ?? []) put(id, { source: 'bundle', bundleId: row.product, orderId: row.order, since: row.createdAt })
  }
  return owned
}

export async function premiumEntitlement(userId) {
  return Entitlement.findOne({ ...activeFilter(userId), scope: 'all-paid' }).sort({ expiresAt: -1 }).select('order expiresAt createdAt').lean()
}

export async function grantForOrder(order) {
  const set = { user: order.user, order: order._id, product: order.product, status: 'active' }
  if (order.productKind === 'plan') {
    set.scope = 'all-paid'
    set.expiresAt = new Date(Date.now() + order.planDays * DAY)
  } else if (order.productKind === 'bundle') {
    const bundle = await Product.findById(order.product).select('bundleItems').lean()
    set.scope = 'bundle'
    set.products = bundle?.bundleItems ?? []
  } else {
    set.scope = 'product'
  }
  await Entitlement.updateOne({ order: order._id }, { $setOnInsert: set }, { upsert: true })
}

export const revokeForOrder = (orderId, reason) =>
  Entitlement.updateOne(
    { order: orderId, status: 'active' },
    { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: reason } },
  )

// Notes added to a bundle after purchase are given to existing buyers; removals never revoke.
export const extendBundleBuyers = (bundleId, addedIds) =>
  addedIds.length
    ? Entitlement.updateMany({ scope: 'bundle', product: bundleId, status: 'active' }, { $addToSet: { products: { $each: addedIds } } })
    : Promise.resolve()
