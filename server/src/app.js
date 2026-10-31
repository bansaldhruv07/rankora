import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { apiLimiter, requireCustomHeader } from './middleware/security.js'
import adminRoutes from './routes/admin/index.js'
import authRoutes from './routes/auth.js'
import cartRoutes from './routes/cart.js'
import libraryRoutes from './routes/library.js'
import orderRoutes from './routes/orders.js'
import paymentRoutes from './routes/payments.js'
import productRoutes from './routes/products.js'
import readerRoutes from './routes/reader.js'
import supportRoutes from './routes/support.js'
import webhookRoutes from './routes/webhooks.js'
import { logger } from './utils/logger.js'

// Content-Security-Policy for the website when this server serves it. Inline scripts in index.html (the
// pre-paint theme script) are allowed by hash, not by a blanket 'unsafe-inline'. Browsers normalise line breaks to
// LF before hashing, so the text is normalised the same way (a CRLF build would otherwise never match).
function websiteCsp(indexHtml) {
  const hashes = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1].replace(/\r\n?/g, '\n')).digest('base64')}'`)
  return {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      // wasm-unsafe-eval: PDF.js decodes some images with WebAssembly. Razorpay's checkout script is the only third-party script.
      'script-src': ["'self'", "'wasm-unsafe-eval'", 'https://checkout.razorpay.com', ...hashes],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https://*.razorpay.com'],
      'connect-src': ["'self'", 'https://*.razorpay.com'],
      'worker-src': ["'self'", 'blob:'],
      'frame-src': ['https://*.razorpay.com'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
    },
  }
}

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  if (env.trustProxy) app.set('trust proxy', 1)

  const indexFile = path.join(env.frontendDir, 'index.html')
  let indexHtml = ''
  if (env.serveFrontend) {
    try {
      indexHtml = readFileSync(indexFile, 'utf8')
    } catch {
      throw new Error(`SERVE_FRONTEND is on but ${indexFile} does not exist. Run "npm run build" in the project root first.`)
    }
  }
  app.use(helmet(env.serveFrontend ? { contentSecurityPolicy: websiteCsp(indexHtml) } : undefined))
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-Reader-Token', 'X-Filename', 'Range'],
      // PDF.js needs these to do ranged loading when the API is on another origin.
      exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
    }),
  )

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

  // The reader streams a PDF as many small range requests, so it sits ahead of the general limiter
  // and has its own (see middleware/security.js). Per-session byte caps bound abuse instead.
  app.use('/api/reader', cookieParser(), requireCustomHeader, express.json({ limit: '10kb' }), readerRoutes)

  app.use('/api', apiLimiter, cookieParser(), requireCustomHeader)
  app.use('/api', express.json({ limit: '100kb' }))
  app.use('/api/admin', adminRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/cart', cartRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/payments', paymentRoutes)
  app.use('/api/library', libraryRoutes)
  app.use('/api/support', supportRoutes)

  if (env.serveFrontend) {
    // Hashed build files never change, so they are cached for a year; everything else is revalidated.
    app.use(
      express.static(env.frontendDir, {
        index: false,
        dotfiles: 'ignore',
        setHeaders: (res, file) => {
          res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
        },
      }),
    )
    // Any other page address belongs to the single-page app (client-side routing).
    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api')) return next()
      res.setHeader('Cache-Control', 'no-cache')
      res.type('html').send(indexHtml)
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
