import { env } from '../config/env.js'
import { AccessLog } from '../models/AccessLog.js'
import { logger } from '../utils/logger.js'

const HOUR = 3600000
const MAX_DISTINCT_IPS = 4

export function logAccess(req, action, { product, note } = {}) {
  return AccessLog.create({
    user: req.user?._id,
    product: product?._id,
    action,
    ip: req.ip,
    userAgent: (req.get('user-agent') || '').slice(0, 300),
    note,
  }).catch((err) => logger.error('access log failed', { error: err.message }))
}

// Heuristics for shared accounts / scraping: too many downloads, or one account on many IPs in an hour.
export async function checkDownloadAbuse(req) {
  const since = new Date(Date.now() - HOUR)
  const base = { user: req.user._id, action: 'download', createdAt: { $gte: since } }
  const [count, ips] = await Promise.all([AccessLog.countDocuments(base), AccessLog.distinct('ip', base)])
  const distinct = new Set([...ips, req.ip]).size
  return { limited: count >= env.downloadHourlyLimit, suspicious: distinct > MAX_DISTINCT_IPS, count, distinct }
}
