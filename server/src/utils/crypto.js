import crypto from 'node:crypto'

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url')
export const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex')

// Display reference for an order, also stamped on documents: RK-1A2B3C4D.
export const orderReference = (orderId) => `RK-${String(orderId).slice(-8).toUpperCase()}`

export function maskEmail(email = '') {
  const [local = '', domain = ''] = String(email).split('@')
  if (!domain) return '***'
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)
  return `${visible}***@${domain}`
}
