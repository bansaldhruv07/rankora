import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

// Email goes through one function so tests (and other providers) can replace it.
//  - SMTP_URL set:        sent with nodemailer (any SMTP provider)
//  - development, no SMTP: the message is written to the server log so the flow can be tried locally
//  - production, no SMTP:  an error is logged; nothing is claimed as sent
let transport
let override

export const setMailer = (fn) => {
  override = fn
}

async function smtp() {
  if (!env.smtpUrl) return null
  if (!transport) {
    const { default: nodemailer } = await import('nodemailer')
    transport = nodemailer.createTransport(env.smtpUrl)
  }
  return transport
}

export async function sendMail({ to, subject, text }) {
  if (override) return override({ to, subject, text })
  const t = await smtp()
  if (t) {
    await t.sendMail({ from: env.mailFrom, to, subject, text })
    return true
  }
  if (env.isProd) {
    logger.error('email not sent: SMTP_URL is not configured', { subject })
    return false
  }
  logger.info('email (development, not sent)', { to, subject, text })
  return false
}
