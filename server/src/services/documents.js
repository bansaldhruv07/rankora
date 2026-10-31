import { env } from '../config/env.js'
import { getObject, putObject, statObject, sweepPrefix } from './storage.js'
import { sha256Hex } from '../utils/crypto.js'
import { buildSamplePdf, watermarkPdf } from './watermark.js'

// Bump when the watermark layout changes so cached copies are rebuilt.
const WATERMARK_VERSION = 2
// Bump when the sample layout changes so cached sample files are rebuilt.
const SAMPLE_VERSION = 3

// Readers receive a derived copy of the original: personalised for a student, or a sample extract.
// Derived copies live in a disposable cache; the stored original is never touched or served.

const inflight = new Map()
let running = 0
const waiting = []
const MAX_PARALLEL_BUILDS = 2

async function limited(task) {
  if (running >= MAX_PARALLEL_BUILDS) await new Promise((resolve) => waiting.push(resolve))
  running += 1
  try {
    return await task()
  } finally {
    running -= 1
    waiting.shift()?.()
  }
}

// Builds the object once even when several requests ask for it at the same moment.
async function ensureObject(key, build) {
  if (await statObject(key)) return key
  if (!inflight.has(key)) {
    const job = limited(async () => putObject(key, await build())).finally(() => inflight.delete(key))
    inflight.set(key, job)
  }
  await inflight.get(key)
  return key
}

export const watermarkedKey = ({ userId, product, orderRef }) =>
  `derived/wm-${sha256Hex(`${userId}|${product._id}|v${product.file.version}|${orderRef}|${WATERMARK_VERSION}`).slice(0, 40)}.pdf`

export const sampleKey = (product) =>
  `derived/pv-${sha256Hex(`${product._id}|v${product.file.version}|${product.previewPages.join(',')}|s${SAMPLE_VERSION}`).slice(0, 40)}.pdf`

export const ensureWatermarked = (key, product, identity) =>
  ensureObject(key, async () => watermarkPdf(await getObject(product.file.key), identity))

export const ensureSample = (key, product) =>
  ensureObject(key, async () => buildSamplePdf(await getObject(product.file.key), product.previewPages))

export const sweepDerived = () => sweepPrefix('derived', env.reader.derivedTtlHours * 3600 * 1000)
