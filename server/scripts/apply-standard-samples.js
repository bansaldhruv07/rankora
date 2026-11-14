// Gives every note the standard free sample for its length (see services/samplePages.js).
//   node scripts/apply-standard-samples.js            dry run: shows what would change
//   node scripts/apply-standard-samples.js --apply    writes it
// Notes whose sample was already chosen by an admin are changed too, so only run it when that is what you want.
import mongoose from 'mongoose'
import { assertEnv, env } from '../src/config/env.js'
import { Product } from '../src/models/Product.js'
import { standardSamplePages } from '../src/services/samplePages.js'

const apply = process.argv.includes('--apply')
assertEnv()
await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })

const notes = await Product.find({ kind: 'note', 'file.key': { $exists: true } }).select('title previewPages file.pages')
const tally = new Map()
let changed = 0
for (const note of notes) {
  const next = standardSamplePages(note.file?.pages ?? 0)
  const key = `${note.file?.pages ?? 0} pages -> ${next.length} free`
  tally.set(key, (tally.get(key) ?? 0) + 1)
  if (next.join(',') === (note.previewPages ?? []).join(',')) continue
  changed += 1
  if (apply) await Product.updateOne({ _id: note._id }, { $set: { previewPages: next } })
}
for (const [key, n] of [...tally].sort()) console.log(`${String(n).padStart(3)} notes: ${key}`)
console.log(`\n${apply ? 'Changed' : 'Would change'} ${changed} of ${notes.length} notes.${apply ? '' : ' Run with --apply to write it.'}`)
await mongoose.disconnect()
