import { env } from '../config/env.js'
import { AccessLog } from '../models/AccessLog.js'
import { logger } from '../utils/logger.js'

const HOUR = 3600000
const MAX_DISTINCT_IPS = 4
const MAX_DISTINCT_PRODUCTS = 15

export function logAccess(req, action, { product, user, note } = {}) {
  return AccessLog.create({
    user: user?._id ?? req.user?._id,
    product: product?._id,
    action,
    ip: req.ip,
    userAgent: (req.get('user-agent') || '').slice(0, 300),
    note,
  }).catch((err) => logger.error('access log failed', { error: err.message }))
}

// Heuristics for shared accounts and scraping: too many reader sessions, one account on many IPs,
// or one account opening an unusually large number of different documents within an hour.
export async function checkOpenAbuse(req) {
  const since = new Date(Date.now() - HOUR)
  const base = { user: req.user._id, action: 'open', createdAt: { $gte: since } }
  const [count, ips, products] = await Promise.all([
    AccessLog.countDocuments(base),
    AccessLog.distinct('ip', base),
    AccessLog.distinct('product', base),
  ])
  const distinctIps = new Set([...ips, req.ip]).size
  return {
    limited: count >= env.reader.hourlyOpenLimit,
    suspicious: distinctIps > MAX_DISTINCT_IPS || products.length > MAX_DISTINCT_PRODUCTS,
    count,
    distinctIps,
    distinctProducts: products.length,
  }
}
