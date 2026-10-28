import fs from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'

// Private object storage. Local disk by default, outside any public/static path.
// To use S3/R2, implement the same three functions and keep credentials server-side.
const root = () => path.resolve(env.storageDir)

function resolveKey(key) {
  const target = path.resolve(root(), key)
  if (!target.startsWith(root() + path.sep)) throw new Error('Invalid storage key')
  return target
}

export async function putObject(key, buffer) {
  const target = resolveKey(key)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, buffer)
}

export const getObject = (key) => fs.readFile(resolveKey(key))

export const deleteObject = (key) => fs.rm(resolveKey(key), { force: true })
