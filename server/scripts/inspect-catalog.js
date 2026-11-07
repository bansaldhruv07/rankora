// Read-only: prints every note, bundle and plan with the fields that matter for ordering and pricing.
//   node scripts/inspect-catalog.js
import mongoose from 'mongoose'
import { assertEnv, env } from '../src/config/env.js'
import { Product } from '../src/models/Product.js'
import { Coupon } from '../src/models/Coupon.js'

assertEnv()
await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
const rows = await Product.find().sort({ kind: 1, subject: 1, classLevel: 1, sortOrder: 1, title: 1 })
for (const p of rows) {
  console.log(
    [
      p.kind.padEnd(6),
      (p.status ?? '').padEnd(9),
      (p.subject ?? '-').padEnd(11),
      String(p.classLevel ?? '-').padEnd(4),
      `₹${p.pricePaise / 100}/${p.mrpPaise != null ? p.mrpPaise / 100 : '-'}`.padEnd(11),
      `so=${p.sortOrder}`.padEnd(8),
      `d=${p.difficulty ?? '-'}`.padEnd(9),
      `pe=${p.premiumEligible}`.padEnd(9),
      `ch="${p.chapter ?? ''}"`.padEnd(40),
      `title="${p.title}"`,
      p.kind === 'bundle' ? `items=${p.bundleItems.length}` : '',
    ].join(' '),
  )
}
console.log('\ntotal products:', rows.length)
const coupons = await Coupon.find()
console.log('coupons:', coupons.map((c) => `${c.code}(${c.type}:${c.value}${c.active ? '' : ',inactive'})`).join(', ') || 'none')
await mongoose.disconnect()
