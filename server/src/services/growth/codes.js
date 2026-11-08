import crypto from 'node:crypto'
import { Coupon } from '../../models/Coupon.js'
import { Teacher } from '../../models/Teacher.js'
import { User } from '../../models/User.js'
import { randomToken } from '../../utils/crypto.js'

// Codes are case-insensitive and trimmed everywhere.
export const normalizeCode = (value) => String(value ?? '').trim().toUpperCase()

export const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '')
// Compares phone numbers by their last 10 digits so "+91 98765 43210" and "9876543210" match.
export const phoneKey = (value) => {
  const digits = digitsOnly(value)
  return digits.length >= 7 ? digits.slice(-10) : ''
}

// No 0/O/1/I so codes survive being read out or typed from a screenshot.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomCode(length, alphabet = ALPHABET) {
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

// Referral codes always start with RK, and teacher codes never do, so the two cannot be confused.
export const REFERRAL_PREFIX = 'RK'
export const newReferralCode = () => `${REFERRAL_PREFIX}${randomCode(6)}`
export const newStatsToken = () => randomToken(32)

// A code may not exist as a teacher code, a coupon or somebody's referral code.
export async function codeInUse(code) {
  const [teacher, coupon, user] = await Promise.all([Teacher.exists({ code }), Coupon.exists({ code }), User.exists({ referralCode: code })])
  return Boolean(teacher || coupon || user)
}

// Suggests a readable teacher code from a name, e.g. "Anita Sharma" -> ANITA42.
export async function suggestTeacherCode(name) {
  const letters = String(name ?? '').toUpperCase().replace(/[^A-Z]/g, '')
  let base = (letters || 'TEACH').slice(0, 5)
  if (base.length < 3) base = base.padEnd(3, 'X')
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = `${base}${String(crypto.randomInt(10, 100))}${attempt > 10 ? randomCode(2) : ''}`
    if (!code.startsWith(REFERRAL_PREFIX) && !(await codeInUse(code))) return code
  }
  return `${base}${randomCode(6)}`
}
