import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { env } from '../config/env.js'

// Private object storage. Keys are always server-generated.
//   notes/    original PDFs (never served as-is)
//   covers/   cover images (public marketing assets, served through the API)
//   derived/  per-student watermarked copies and sample extracts: a disposable cache, always on local disk
//
// Two drivers for the durable prefixes (STORAGE_DRIVER):
//   disk    (default) files under PRIVATE_STORAGE_DIR; needs a persistent volume in production
//   gridfs  files inside MongoDB (GridFS); survives hosts with throw-away disks, so a free host works
// To use S3/R2 instead, implement the same functions; nothing else in the app changes.
const root = () => path.resolve(env.storageDir)
const isCache = (key) => key.startsWith('derived/')
const useGridFs = (key) => env.storageDriver === 'gridfs' && !isCache(key)

function resolveKey(key) {
  const target = path.resolve(root(), key)
  if (!target.startsWith(root() + path.sep)) throw new Error('Invalid storage key')
  return target
}

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'files' })

async function gridFile(key) {
  return (await bucket().find({ filename: key }).limit(1).toArray())[0] ?? null
}

async function removeGrid(key) {
  const b = bucket()
  for (const file of await b.find({ filename: key }).toArray()) await b.delete(file._id)
}

export async function putObject(key, buffer) {
  if (useGridFs(key)) {
    await removeGrid(key) // keys are unique per upload, but never leave two files under one name
    await new Promise((resolve, reject) => {
      const upload = bucket().openUploadStream(key)
      upload.once('error', reject)
      upload.once('finish', resolve)
      upload.end(buffer)
    })
    return
  }
  const target = resolveKey(key)
  await fs.mkdir(path.dirname(target), { recursive: true })
  // Write-then-rename so a reader never observes a half-written file.
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(temp, buffer)
  await fs.rename(temp, target)
}

export async function getObject(key) {
  if (useGridFs(key)) {
    if (!(await gridFile(key))) throw Object.assign(new Error('Object not found'), { code: 'ENOENT' })
    const chunks = []
    for await (const chunk of bucket().openDownloadStreamByName(key)) chunks.push(chunk)
    return Buffer.concat(chunks)
  }
  return fs.readFile(resolveKey(key))
}

export async function deleteObject(key) {
  if (useGridFs(key)) return removeGrid(key)
  return fs.rm(resolveKey(key), { force: true })
}

// Resolves to { size, mtimeMs } or null when the object does not exist.
export async function statObject(key) {
  if (useGridFs(key)) {
    const file = await gridFile(key)
    return file ? { size: file.length, mtimeMs: file.uploadDate.getTime() } : null
  }
  try {
    const stat = await fs.stat(resolveKey(key))
    return stat.isFile() ? { size: stat.size, mtimeMs: stat.mtimeMs } : null
  } catch {
    return null
  }
}

// Inclusive byte range, like HTTP Range.
export function readStream(key, range) {
  if (useGridFs(key)) {
    return bucket().openDownloadStreamByName(key, range ? { start: range.start, end: range.end + 1 } : undefined)
  }
  return createReadStream(resolveKey(key), range ? { start: range.start, end: range.end } : undefined)
}

// Removes cached objects under `prefix` that are older than maxAgeMs. Only the local-disk cache is swept.
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
