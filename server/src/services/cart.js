import { Product } from '../models/Product.js'
import { hasAccess, ownsBundle } from './entitlements.js'

// Splits what a visitor put in their cart into what can be bought now and what cannot:
//  - products     published, paid notes and packs the student does not have yet (these are priced)
//  - owned        slugs the signed-in student already has access to (they are left out of the price)
//  - covered      single notes left out because a pack in the same cart already contains them
//  - unavailable  slugs that are unknown, unpublished or free
// Order follows the request. Duplicates are ignored.
export async function loadCart(slugs, userId) {
  const unique = [...new Set(slugs)]
  const found = await Product.find({ slug: { $in: unique }, status: 'published', kind: { $in: ['note', 'bundle'] }, pricePaise: { $gt: 0 } })
  const bySlug = new Map(found.map((p) => [p.slug, p]))
  const unavailable = unique.filter((slug) => !bySlug.has(slug))
  const candidates = unique.filter((slug) => bySlug.has(slug)).map((slug) => bySlug.get(slug))
  const flags = userId ? await Promise.all(candidates.map((p) => (p.kind === 'bundle' ? ownsBundle(userId, p) : hasAccess(userId, p)))) : candidates.map(() => false)
  const open = candidates.filter((_, i) => !flags[i])

  // A note the cart already gets through a pack in it is not charged twice.
  const inPacks = new Set(open.filter((p) => p.kind === 'bundle').flatMap((p) => (p.bundleItems ?? []).map(String)))
  const covered = open.filter((p) => p.kind === 'note' && inPacks.has(String(p._id))).map((p) => p.slug)
  return {
    products: open.filter((p) => !covered.includes(p.slug)),
    owned: candidates.filter((_, i) => flags[i]).map((p) => p.slug),
    covered,
    unavailable,
  }
}
