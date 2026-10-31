import { Product } from '../models/Product.js'
import { hasAccess } from './entitlements.js'

// Splits what a visitor put in their cart into what can be bought now and what cannot:
//  - products     published, paid notes the student does not have yet (these are priced)
//  - owned        slugs the signed-in student already has access to (they are left out of the price)
//  - unavailable  slugs that are unknown, unpublished, free, or not a single note
// Order follows the request. Duplicates are ignored.
export async function loadCart(slugs, userId) {
  const unique = [...new Set(slugs)]
  const found = await Product.find({ slug: { $in: unique }, status: 'published', kind: 'note', pricePaise: { $gt: 0 } })
  const bySlug = new Map(found.map((p) => [p.slug, p]))
  const unavailable = unique.filter((slug) => !bySlug.has(slug))
  const candidates = unique.filter((slug) => bySlug.has(slug)).map((slug) => bySlug.get(slug))
  const flags = userId ? await Promise.all(candidates.map((p) => hasAccess(userId, p))) : candidates.map(() => false)
  return {
    products: candidates.filter((_, i) => !flags[i]),
    owned: candidates.filter((_, i) => flags[i]).map((p) => p.slug),
    unavailable,
  }
}
