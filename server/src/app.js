import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { apiLimiter, requireCustomHeader } from './middleware/security.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import libraryRoutes from './routes/library.js'
import orderRoutes from './routes/orders.js'
import paymentRoutes from './routes/payments.js'
import productRoutes from './routes/products.js'
import webhookRoutes from './routes/webhooks.js'
import { logger } from './utils/logger.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  if (env.trustProxy) app.set('trust proxy', 1)

  app.use(helmet())
  app.use(cors({ origin: env.frontendOrigin, credentials: true, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'X-Requested-With'] }))

  if (!env.isTest) {
    app.use((req, res, next) => {
      const start = Date.now()
      res.on('finish', () => logger.info('request', { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start }))
      next()
    })
  }

  // Webhooks need the untouched bytes for signature verification, so they are mounted before express.json.
  app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }), webhookRoutes)

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', db: mongoose.connection.readyState === 1 } })
  })

  app.use('/api', apiLimiter, cookieParser(), requireCustomHeader)
  app.use('/api', express.json({ limit: '100kb' }))
  app.use('/api/admin', adminRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/payments', paymentRoutes)
  app.use('/api/library', libraryRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
