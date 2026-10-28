# Rankora API

Express + MongoDB (Mongoose) backend for the Rankora frontend. Handles accounts, the notes catalogue, Razorpay payments, purchase entitlements and watermarked delivery of private PDFs.

## Layout

```
server/
  src/
    config/env.js        environment loading + startup validation
    models/              User, Product, Order, Payment, Entitlement, AccessLog, WebhookEvent
    middleware/          auth (cookie JWT), security (rate limits, CSRF header), error handler
    routes/              auth, products, orders, payments, webhooks, library, admin
    services/            payments/ (razorpay, mock), settlement, entitlements, storage, watermark, accessLog
    utils/               AppError, http helpers (validation, pagination), redacting logger
    app.js, server.js
  scripts/seed.js        loads the catalogue from the frontend data + placeholder PDFs + first admin
  scripts/dev-db.js      local MongoDB for machines without one
  tests/                 node:test + supertest + in-memory MongoDB
```

## Windows PowerShell: install, run, test

```powershell
cd C:\Users\hp\Documents\Projects\rankora\server
npm install
Copy-Item .env.example .env
# edit .env: set JWT_SECRET (>= 32 chars) and optionally ADMIN_EMAIL / ADMIN_PASSWORD

# Terminal 1: MongoDB. Skip this if you have MongoDB installed or use an Atlas URI in .env.
npm run dev:db

# Terminal 2: seed once, then run the API on :5000
npm run seed
npm run dev

# Terminal 3: frontend on :5173 (proxies /api to :5000)
cd ..
npm install
npm run dev

# Tests (no MongoDB install needed; downloads a test mongod binary on first run)
cd server
npm test
```

Generate a JWT secret:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Environment variables

See [.env.example](.env.example). Required: `MONGODB_URI`, `FRONTEND_ORIGIN`, `JWT_SECRET`. For real payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. With no Razorpay keys the server uses the `mock` provider (refused when `NODE_ENV=production`). The frontend needs only the optional `VITE_API_URL` (see the root `.env.example`).

## Response format

```
success: { "success": true, "data": ..., "meta": { "page", "limit", "total", "pages" } }   // meta on lists
error:   { "success": false, "error": { "code": "BAD_REQUEST", "message": "...", "details": [{ "field", "message" }] } }
```
Status codes: 200/201 ok, 400 validation, 401 unauthenticated, 403 forbidden (or missing CSRF header), 404 missing (also for other users' orders), 409 conflict (already owned, wrong state), 429 rate limited, 502 gateway error, 503 database unavailable.
Pagination: `?page=1&limit=20` (max 50, admin 100).

State-changing requests (non-GET) must send `X-Requested-With: rankora` (CSRF defence, the frontend client does this).

## Endpoints

| Method & path | Auth | Purpose |
|---|---|---|
| POST `/api/auth/register` | - | `{name,email,password}`, creates a student, sets cookie |
| POST `/api/auth/login` | - | `{email,password}` |
| POST `/api/auth/logout` | - | clears cookie and revokes the token |
| GET `/api/auth/me` | user | profile + `access: {premium, premiumUntil, productSlugs}` |
| PATCH `/api/auth/me` | user | `{name}` |
| POST `/api/auth/change-password` | user | revokes other sessions |
| GET `/api/products` | - | published products. Filters: `subject, chapter, type, price=free\|paid, q, kind=note\|plan` |
| GET `/api/products/catalog` | - | subject > chapter > topic tree |
| GET `/api/products/:slug` | - | product + free preview (no file info) |
| POST `/api/orders` | user | `{product: slug}`; price is read from the DB; returns order + checkout payload |
| GET `/api/orders`, `/api/orders/:id` | user | own orders only |
| POST `/api/orders/:id/cancel` | user | pending orders only |
| POST `/api/payments/verify` | user | `{orderId, razorpay_payment_id, razorpay_signature}` |
| POST `/api/payments/mock/complete` | user | sandbox only: simulates the gateway popup |
| POST `/api/webhooks/razorpay` | signature | `payment.captured`, `order.paid`, `payment.failed`, `refund.processed` |
| GET `/api/library` | user | purchased / Premium-unlocked notes |
| GET `/api/library/:slug/file` | user + entitlement | per-user watermarked PDF stream |
| GET/POST/PATCH `/api/admin/products` | admin | list (incl. drafts), create (always draft), edit (allow-listed fields) |
| POST `/api/admin/products/:id/publish` or `/unpublish` | admin | publishing a note requires an uploaded PDF |
| PUT `/api/admin/products/:id/file` | admin | raw body, `Content-Type: application/pdf`, max 25 MB, `%PDF-` checked |
| GET `/api/admin/orders`, `/orders/:id` | admin | filter `status`, `email` |
| POST `/api/admin/orders/:id/refund` | admin | full refund: gateway refund, order `refunded`, entitlement revoked |
| GET `/api/admin/access-logs` | admin | filter `action=denied\|download\|rate_limited\|suspicious` |

## Data model

- **User**: name, unique email, bcrypt `passwordHash` (never selected), role `student|admin`, `tokenVersion` (session revocation).
- **Product**: unique `slug` (equals the frontend resource id), `kind` note|plan, subject/chapter/topic, type, `pricePaise`, `status` draft|published, preview (`sample`, `contents`, `includes`), private `file` reference (never serialised), `planDays` for plans. `type` and `kind` leave room for PYQ and mock products later.
- **Order**: user, product snapshot, `amountPaise`, status `pending|paid|failed|cancelled|refunded`, unique `providerOrderId`.
- **Payment**: unique `providerPaymentId`, amounts, refund totals/ids. No card or UPI data.
- **Entitlement**: one per paid order (unique), scope `product` or `all-paid` (Premium, with `expiresAt`), status `active|revoked`.
- **AccessLog**, **WebhookEvent** (unique `eventId` for idempotency).

## Payment and access rules

1. The server prices every order from the database. Client amounts are ignored.
2. Access is granted only after `HMAC_SHA256(keySecret, providerOrderId|paymentId)` matches (verify endpoint, using the provider order id stored on our order) or after a webhook whose raw-body signature matches. A webhook amount that differs from the order grants nothing.
3. Verify and webhook share one idempotent settlement routine, so retries, duplicate event ids and verify-vs-webhook races create one payment and one entitlement.
4. Refunds: a full refund revokes that order's entitlement. A partial refund (gateway-initiated) keeps access until the refunded total reaches the paid amount. Premium access also ends at `expiresAt`.
5. Files are stored outside any public path. Every download re-checks the entitlement, stamps the buyer's email/id on each page, logs the access, and is limited to `DOWNLOAD_HOURLY_LIMIT` per hour per user. More than 4 distinct IPs in an hour is logged as `suspicious`.

Watermarking deters casual sharing and makes leaks traceable. It cannot prevent screenshots, photos or retyping.

## Verify the full purchase flow (sandbox)

Mock provider (no keys needed): sign in on the site, open a paid resource such as `/resource/phy-mechanics-formulas`, click **Buy**, then **Pay**. The sandbox payment is verified server-side, the Account page lists the note, and **Download PDF** returns a PDF stamped with your email.

Razorpay test mode:
1. In the Razorpay dashboard (Test Mode) create an API key and put `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `.env`.
2. Expose the API (for example `ngrok http 5000`), add a webhook to `https://<tunnel>/api/webhooks/razorpay` with events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`, and set the same secret as `RAZORPAY_WEBHOOK_SECRET`.
3. Restart the API, buy with a Razorpay test card/UPI, then check the order is `paid` in **Account**.
4. Refund as admin: sign in with the seeded admin, then `POST /api/admin/orders/:id/refund`. The note disappears from the buyer's library.

## Deployment

- **MongoDB**: create a MongoDB Atlas cluster, add a database user, allow your host's IPs, set `MONGODB_URI`. Run `npm run seed` once (with `ALLOW_PROD_SEED=true`) or create products through the admin API.
- **API**: any Node 20+ host (Render, Railway, Fly, a VPS). Set `NODE_ENV=production`, `TRUST_PROXY=true`, `FRONTEND_ORIGIN=https://your-site`, `JWT_SECRET`, Razorpay live keys, `COOKIE_SAMESITE=none` if the frontend and API are on different sites (use the same parent domain and `lax` if possible). HTTPS is required.
- **Private storage**: the default is local disk (`PRIVATE_STORAGE_DIR`), which needs a persistent volume. On ephemeral hosts, implement the three functions in `src/services/storage.js` against S3/R2 with server-side credentials (the rest of the code is unchanged). Never serve this directory.
- **Frontend**: set `VITE_API_URL=https://api.example.com/api`, run `npm run build`, deploy `dist/`. Configure the Razorpay webhook to the production URL.

## Known limitations

- Password reset is not implemented (needs an email provider). Add a one-time, hashed, expiring token plus email delivery.
- Logout revokes the token for all devices (it bumps `tokenVersion`).
- The local-disk storage provider is the only one implemented; S3/R2 is a documented swap point. Files are proxied through the API so they can be watermarked, so there are no signed URLs.
- Refunds from the admin API are full refunds only; partial refunds are honoured when initiated from the Razorpay dashboard.
- The catalogue pages (Explore, Home) still read the static data in the frontend. Only the resource page price, checkout, account and Premium state use the API. Keep seeded prices and `src/data/resources.js` in sync, or move Explore to `GET /api/products`.
- PYQs, mock-test attempts, bookmarks, coupons and referrals are not built. The models leave room (`Product.type`, `kind`, per-product entitlements).
