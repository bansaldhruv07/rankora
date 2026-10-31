// Creates or promotes a staff account. This is the ONLY way to obtain an admin or editor role:
// there is no web endpoint for it, and roles are never read from a request.
//
//   npm run create-admin                     prompts for email, name and (hidden) password
//   npm run create-admin -- --role editor    creates an editor (content only) instead of an admin
//
// Non-interactive (CI / hosting shells): ADMIN_EMAIL, ADMIN_PASSWORD and optionally ADMIN_NAME.
// Prefer the prompt; environment variables can end up in shell history and process lists.
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import readline from 'node:readline'
import { assertEnv, env } from '../src/config/env.js'
import { User } from '../src/models/User.js'

const MIN_PASSWORD = 12
const roleArg = process.argv.indexOf('--role')
const role = roleArg > -1 ? process.argv[roleArg + 1] : 'admin'
if (!['admin', 'editor'].includes(role)) {
  console.error('--role must be "admin" or "editor"')
  process.exit(1)
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (question) => new Promise((resolve) => rl.question(question, resolve))

// Reads a line without echoing it, so the password never appears on screen or in terminal scrollback.
function askHidden(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return rl.question(question, resolve)
    process.stdout.write(question)
    const original = rl._writeToOutput
    rl._writeToOutput = () => {}
    rl.question('', (answer) => {
      rl._writeToOutput = original
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

assertEnv()
let email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
let password = process.env.ADMIN_PASSWORD || ''
let name = (process.env.ADMIN_NAME || '').trim()

if (!email) email = (await ask('Email: ')).trim().toLowerCase()
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('That does not look like an email address.')
  process.exit(1)
}

await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
const existing = await User.findOne({ email }).select('+passwordHash')

if (!password) {
  const prompt = existing ? `New password for ${email} (leave empty to keep the current one): ` : `Password (min ${MIN_PASSWORD} characters): `
  password = await askHidden(prompt)
  if (password && !existing) {
    const confirm = await askHidden('Repeat password: ')
    if (confirm !== password) {
      console.error('Passwords do not match.')
      process.exit(1)
    }
  }
}
if (password && password.length < MIN_PASSWORD) {
  console.error(`Staff passwords must be at least ${MIN_PASSWORD} characters.`)
  process.exit(1)
}
if (!existing && !password) {
  console.error('A password is required for a new account.')
  process.exit(1)
}
if (!existing && !name) name = (await ask('Display name: ')).trim() || 'Admin'
rl.close()

const update = { role }
if (password) {
  update.passwordHash = await bcrypt.hash(password, env.bcryptRounds)
  update.$inc = { tokenVersion: 1 } // signs out any session that used the old password
}
const { $inc, ...set } = update
await User.updateOne({ email }, { $set: set, ...($inc ? { $inc } : {}), $setOnInsert: { name: name || 'Admin', email } }, { upsert: true })
console.log(`${existing ? 'Updated' : 'Created'} ${role} account for ${email}. Sign in at /admin.`)
await mongoose.disconnect()
