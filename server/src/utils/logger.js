import { env } from '../config/env.js'

const SENSITIVE = /pass|token|secret|signature|authorization|cookie|key/i

function redact(value, depth = 0) {
  if (depth > 4 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SENSITIVE.test(key) ? '[redacted]' : redact(item, depth + 1)]),
  )
}

const write = (level, message, meta) => {
  if (env.isTest) return
  const line = { level, time: new Date().toISOString(), message, ...(meta ? { meta: redact(meta) } : {}) }
  ;(level === 'error' ? console.error : console.log)(JSON.stringify(line))
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
}
