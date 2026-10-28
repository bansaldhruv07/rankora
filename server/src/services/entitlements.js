import { Entitlement } from '../models/Entitlement.js'

const DAY = 86400000

const activeFilter = (userId, now = new Date()) => ({
  user: userId,
  status: 'active',
  $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
})

// Free notes need no entitlement. Paid notes need an active product entitlement
// or an active, unexpired all-paid (Premium) entitlement.
export async function hasAccess(userId, product) {
  if (product.pricePaise === 0) return true
  if (product.kind !== 'note') return false
  const found = await Entitlement.exists({
    ...activeFilter(userId),
    $and: [{ $or: [{ scope: 'all-paid' }, { scope: 'product', product: product._id }] }],
  })
  return Boolean(found)
}

export async function accessSummary(userId) {
  const rows = await Entitlement.find(activeFilter(userId)).select('scope product expiresAt').populate('product', 'slug').lean()
  const premium = rows.filter((row) => row.scope === 'all-paid')
  const premiumUntil = premium.reduce((latest, row) => (!latest || row.expiresAt > latest ? row.expiresAt : latest), null)
  return {
    premium: premium.length > 0,
    premiumUntil,
    productSlugs: rows.filter((row) => row.scope === 'product' && row.product).map((row) => row.product.slug),
  }
}

export async function grantForOrder(order) {
  const isPlan = order.productKind === 'plan'
  await Entitlement.updateOne(
    { order: order._id },
    {
      $setOnInsert: {
        user: order.user,
        order: order._id,
        product: order.product,
        scope: isPlan ? 'all-paid' : 'product',
        status: 'active',
        expiresAt: isPlan ? new Date(Date.now() + order.planDays * DAY) : undefined,
      },
    },
    { upsert: true },
  )
}

export const revokeForOrder = (orderId, reason) =>
  Entitlement.updateOne(
    { order: orderId, status: 'active' },
    { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: reason } },
  )
