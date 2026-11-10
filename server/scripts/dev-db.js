// Local-only MongoDB for machines without a MongoDB install. Data persists in server/.data.
// Production uses a real MongoDB / Atlas via MONGODB_URI; never point this at real data.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { MongoMemoryServer } from 'mongodb-memory-server'

const dbPath = fileURLToPath(new URL('../.data', import.meta.url))
fs.mkdirSync(dbPath, { recursive: true })

const mongod = await MongoMemoryServer.create({
  instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' },
})
console.log(`Dev MongoDB running at ${mongod.getUri()}rankora (Ctrl+C to stop)`)

const stop = () => mongod.stop().then(() => process.exit(0))
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

