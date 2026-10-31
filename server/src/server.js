import mongoose from 'mongoose'
import { createApp } from './app.js'
import { assertEnv, env } from './config/env.js'
import { sweepDerived } from './services/documents.js'
import { logger } from './utils/logger.js'

assertEnv()

try {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
} catch (err) {
  logger.error('could not connect to MongoDB', { error: err.message })
  process.exit(1)
}

const server = createApp().listen(env.port, () =>
  logger.info(`Rankora API listening on :${env.port}`, { provider: env.paymentProvider, origin: env.frontendOrigin }),
)

// Per-student watermarked copies are a disposable cache; remove stale ones every half hour.
const sweeper = setInterval(() => sweepDerived().catch((err) => logger.warn('derived sweep failed', { error: err.message })), 30 * 60 * 1000)
sweeper.unref()

const shutdown = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)))
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
