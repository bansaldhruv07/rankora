// Creates (or updates) the two Premium plan products that the Pricing page sells: premium-monthly and
// premium-yearly. Safe to run in production and safe to re-run: it upserts by slug, and the prices come
// from src/data/plans.js so the site and the database agree.
//   npm run setup-plans
import mongoose from 'mongoose'
import { PLANS } from '../../src/data/plans.js'
import { assertEnv, env } from '../src/config/env.js'
import { Product } from '../src/models/Product.js'

assertEnv()
const premium = PLANS.find((plan) => plan.id === 'premium')

await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
for (const [slug, title, planDays, price] of [
  ['premium-monthly', 'Rankora Premium (30 days)', 30, premium.price.monthly],
  ['premium-yearly', 'Rankora Premium (1 year)', 365, premium.price.yearly],
]) {
  await Product.updateOne(
    { slug },
    { $set: { slug, title, summary: premium.blurb, kind: 'plan', type: 'plan', planDays, pricePaise: price * 100, status: 'published' } },
    { upsert: true },
  )
  console.log(`${slug}: ₹${price} for ${planDays} days`)
}
await mongoose.disconnect()
