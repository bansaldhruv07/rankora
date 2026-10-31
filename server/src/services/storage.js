import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'

// Private object storage. Local disk by default, outside any public/static path.
// To use S3/R2, implement the same functions (statObject, readStream with {start,end} maps to a
// ranged GetObject) and keep credentials server-side. Keys are always server-generated.
//   notes/    original PDFs (never served as-is)
//   covers/   cover images (public marketing assets, served through the API)
//   derived/  per-student watermarked copies and sample extracts (disposable cache)
const root = () => path.resolve(env.storageDir)

function resolveKey(key) {
  const target = path.resolve(root(), key)
  if (!target.startsWith(root() + path.sep)) throw new Error('Invalid storage key')
  return target
}

export async function putObject(key, buffer) {
  const target = resolveKey(key)
  await fs.mkdir(path.dirname(target), { recursive: true })
  // Write-then-rename so a reader never observes a half-written file.
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temp, buffer)
  await fs.rename(temp, target)
}

export const getObject = (key) => fs.readFile(resolveKey(key))

export const deleteObject = (key) => fs.rm(resolveKey(key), { force: true })

// Resolves to { size, mtimeMs } or null when the object does not exist.
export async function statObject(key) {
  try {
    const stat = await fs.stat(resolveKey(key))
    return stat.isFile() ? { size: stat.size, mtimeMs: stat.mtimeMs } : null
  } catch {
    return null
  }
}

// Inclusive byte range, like HTTP Range.
export const readStream = (key, range) => createReadStream(resolveKey(key), range ? { start: range.start, end: range.end } : undefined)

// Removes objects under `prefix` that are older than maxAgeMs. Returns how many were removed.
export async function sweepPrefix(prefix, maxAgeMs) {
  const dir = resolveKey(prefix)
  let removed = 0
  let entries
  try {
    entries = await fs.readdir(dir)
  } catch {
    return 0
  }
  for (const name of entries) {
    const file = path.join(dir, name)
    try {
      const stat = await fs.stat(file)
      if (stat.isFile() && Date.now() - stat.mtimeMs > maxAgeMs) {
        await fs.rm(file, { force: true })
        removed += 1
      }
    } catch {
      /* raced with another sweep */
    }
  }
  return removed
}
