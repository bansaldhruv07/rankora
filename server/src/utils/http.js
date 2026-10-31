import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { badRequest, notFound } from './AppError.js'

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export const ok = (res, data, meta, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) })

export function parse(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) throw zodToError(result.error)
  return result.data
}

export function zodToError(error) {
  const details = error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
  return badRequest('Validation failed', details)
}

export function assertObjectId(id) {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id) || String(new mongoose.Types.ObjectId(id)) !== id) {
    throw notFound()
  }
  return id
}

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function pageParams(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit))
  return { page, limit, skip: (page - 1) * limit }
}

// Parses a single-range `Range: bytes=...` header. Returns null (no header), 'invalid', or { start, end } (inclusive).
export function parseRange(header, size) {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === '' && match[2] === '')) return 'invalid'
  let start
  let end
  if (match[1] === '') {
    const suffix = Number.parseInt(match[2], 10)
    if (!suffix) return 'invalid'
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number.parseInt(match[1], 10)
    end = match[2] === '' ? size - 1 : Math.min(Number.parseInt(match[2], 10), size - 1)
  }
  return start >= size || start > end ? 'invalid' : { start, end }
}

export const pageMeta =(page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) || 1 })

export { ZodError }
