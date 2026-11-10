# JEEdge API

Express 5 + MongoDB (Mongoose) backend. It runs the notes catalogue and admin CMS, accounts, Razorpay payments, purchase entitlements, and the secure PDF reader (short-lived sessions, personalised watermarking, range streaming).

## Layout

```
server/
  src/
    config/env.js         environment loading + startup validation
    models/               User, Product (note | bundle | plan), Order, Payment, Entitlement, Coupon,
                          ViewerSession, ReadingProgress, AccessLog, AuditLog, PasswordReset,
                          SupportMessage, WebhookEvent
    middleware/           auth (student cookie + separate admin cookie + RBAC), security (limits, CSRF header), error
    routes/               auth, products, orders, payments, webhooks, library, reader, support
    routes/admin/         auth, products (CMS + uploads), coupons, orders, users, support, insights (stats, logs)
    services/             storage, pdf (validation), watermark, documents (derived-copy cache), reader,
                          viewerSessions, entitlements, pricing (coupons), settlement, payments/, audit, mailer
  scripts/create-admin.js first admin / editor (prompts for a hidden password)
  scripts/organize-catalog.js  JEE chapter order, the one note price, bundles and the welcome coupon (dry run first; see its header)
  tests/                  node:test + supertest + in-memory MongoDB (96 tests)
```

## Run it locally (Windows PowerShell)

```powershell
cd C:\Users\hp\Documents\Projects\jeedge\server
npm install
Copy-Item .env.example .env
# edit .env: JWT_SECRET (32+ random chars) and, if you use Atlas, MONGODB_URI

npm run dev:db          # terminal 1: local MongoDB (skip if you use Atlas or have MongoDB installed)
npm run create-admin    # terminal 2: creates your admin; asks for email, name and a hidden password (12+ chars)
npm run dev             # API on :5000

cd ..; npm install; npm run dev     # terminal 3: frontend on :5173, proxies /api to :5000
npm test                # in server/: no MongoDB install needed
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

There is no demo catalogue: every note on the site is one you upload in the admin area. After uploading, run `node scripts/organize-catalog.js` (dry run) and then with `--apply` to put notes in JEE order and build the subject bundles.

## First admin account (secure)

There is no sign-up path to admin and roles are never read from a request. Run `npm run create-admin` on the server (or any machine that can reach the database). Use `--role editor` for a content-only account. Sign in at **/admin** on the website. Admin uses its own cookie (`rk_admin`, scoped to `/api/admin`, 8 h by default) and its own login endpoint; a student session cannot act as admin. Use a dedicated admin email: signing out of Studio ends every session of that account.

## Upload and publish your Physics PDFs

1. `/admin` → **Notes & bundles** → **Upload PDFs**. Optionally pick subject, class and a default price, then select all ten files at once. Each uploads with its own progress bar and becomes a **draft**. Title and page count are read from the PDF (the file name is the fallback).
2. Open each draft (**Edit details**): set title, class, chapter, tags, short and detailed description, original and selling price, "what you receive", "who should buy", chapters covered, sample pages (e.g. `1-3`), optional cover image, display priority. **Preview in reader** shows exactly what a student will see.
3. **Publish**. It needs a PDF, a subject and a class. Select many rows to publish, unpublish or archive in bulk.
4. Bundles: **Bundles** tab → **New bundle** → pick notes → set a price (the saving against buying separately is computed for you) → publish once its notes are published.
5. Offers: **Offers** → code, percent or flat discount, limits, expiry.

Admin-created notes are **not** included in the Premium plan unless you tick *Include in Premium plan* (the Premium plan otherwise unlocks every eligible note).

## Environment variables

See [.env.example](.env.example). Required: `MONGODB_URI`, `FRONTEND_ORIGIN`, `JWT_SECRET`. Real payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (no keys = `mock` provider, refused in production). Password-reset email: `SMTP_URL`, `MAIL_FROM`. Reader tuning: `READER_*`, `DERIVED_TTL_HOURS`. Uploads: `MAX_PDF_MB`, `MAX_COVER_MB`. **Never commit `server/.env`.**

## Response format

```
success: { "success": true, "data": ..., "meta": { "page", "limit", "total", "pages" } }
error:   { "success": false, "error": { "code", "message", "details": [{ "field", "message" }] } }
```
401 unauthenticated, 403 forbidden / missing CSRF header, 404 missing (also for other people's records), 409 conflict, 413 too large, 429 rate limited. Non-GET requests must send `X-Requested-With: jeedge`.

## Endpoints

**Public / student**

| Method & path | Auth | Purpose |
|---|---|---|
| POST `/api/auth/register`, `/login`, `/logout` | - | accounts (role is always `student`) |
| POST `/api/auth/forgot-password`, `/reset-password` | - | emailed single-use link (30 min) |
| GET/PATCH `/api/auth/me`, POST `/api/auth/change-password` | user | profile, password |
| GET `/api/products` | - | `subject, class, chapter, type, tag, q, price, kind=note\|bundle\|plan\|any, sort, page, limit` |
| GET `/api/products/catalog`, `/:slug`, `/:slug/cover` | - | navigation tree; detail with bundles + related; cover image |
| POST `/api/products/:slug/quote` | - | price breakdown with a coupon |
| POST `/api/orders` | user | `{product, coupon?}`; priced on the server |
| GET `/api/orders`, `/orders/:id`; POST `/orders/:id/cancel` | user | own orders only |
| POST `/api/payments/verify` | user | Razorpay signature verified on the server |
| POST `/api/webhooks/razorpay` | signature | idempotent settlement and refunds |
| GET `/api/library` | user | owned notes with progress, source, order reference |
| POST `/api/reader/sessions` | optional | `{product, mode: full\|preview}` opens a reading session |
| GET `/api/reader/stream` | `X-Reader-Token` (+ login for `full`) | HTTP range stream of the derived PDF |
| PUT `/api/reader/progress`, DELETE `/api/reader/sessions/current` | token | last-read page; close |
| GET/POST `/api/support` | user | contact support |

**Admin** (`/api/admin`, staff cookie + permission): `auth/login|logout|me`; `products` (list/filter/sort, create, `upload`, patch, `:id/file`, `:id/cover`, publish, unpublish, archive, delete, `preview-session`); `coupons`; `orders` (+ refund); `users` (+ revoke-sessions, suspend, unsuspend); `support`; `stats`; `access-logs`; `audit-logs`; `viewer-sessions`.

Permissions: **admin** has everything; **editor** has `content` and `support` only.

## How the PDF protection works

- Originals live in private storage (`PRIVATE_STORAGE_DIR`), under server-generated keys. They are never served and no storage path is ever returned to a client.
- Opening a note creates a **reader session**: the server checks login and entitlement (purchase, bundle, Premium for eligible notes, or free), logs it, builds a **personalised copy** (tiled diagonal name/masked-email/student-ID/order watermark on every page plus footer, generated from the account, cached briefly) and returns an opaque token (only its hash is stored). The original is never modified.
- The PDF.js viewer streams that copy with range requests. Every request re-checks the token **and** the signed-in owner **and** the entitlement, so a refund, suspension, sign-out or password reset stops reading immediately. A token alone is useless.
- Sessions expire when idle (`READER_SESSION_MINUTES`), have an absolute limit, and a student can hold `READER_MAX_ACTIVE_SESSIONS` at once (the oldest closes). Per-hour open limits, multi-IP / many-documents detection, and a per-session transfer cap feed the access log. Admins can close sessions or suspend accounts.
- Free sample = a separate generated file containing **only the pages you mark free** (stamped SAMPLE). The locked pages are never in the file the browser receives, so they cannot be recovered client-side. The viewer is told the note's full page count, shows it in the page counter, and ends the sample with a single "Unlock the full notes" panel.
- The on-screen layer adds a per-session-varied tiled watermark and a page footer. Right-click, drag, save and print shortcuts are blocked and printing is disabled.

This deters sharing and makes leaks traceable. **It cannot stop screenshots, phone photos or screen recording.**

## Payments

Prices are computed on the server (coupons included). Access is granted only after the HMAC signature is verified (verify endpoint) or a signed webhook arrives; both share one idempotent routine, so retries and races create one payment and one entitlement. Amount mismatches grant nothing. Refunds revoke access (bundle refunds only remove the bundle grant).

Razorpay test mode: add test keys to `.env`, expose the API (e.g. `ngrok http 5000`), add a webhook to `https://<tunnel>/api/webhooks/razorpay` for `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`, and put the same secret in `RAZORPAY_WEBHOOK_SECRET`.

## Deployment

- **MongoDB**: Atlas cluster, database user, allow your host's IPs, set `MONGODB_URI`. **Rotate** any credential that was ever committed (an earlier `server/.env.example` contained a real-looking Atlas password and JWT secret).
- **API**: any Node 20+ host (Render, Railway, Fly, a VPS). `NODE_ENV=production`, `TRUST_PROXY=true`, `FRONTEND_ORIGIN=https://your-site`, `JWT_SECRET`, live Razorpay keys, `SMTP_URL`. HTTPS is required. Cross-site frontend/API needs `COOKIE_SAMESITE=none`; same parent domain with `lax` is simpler.
- **Private storage**: `STORAGE_DRIVER=disk` (default) keeps files under `PRIVATE_STORAGE_DIR` and needs a **persistent volume**. `STORAGE_DRIVER=gridfs` stores originals and covers inside MongoDB, which suits hosts with throw-away disks. For S3/R2, implement `src/services/storage.js` (`putObject, getObject, deleteObject, statObject, readStream, sweepPrefix`); nothing else changes.
- **Frontend**: build with Node 22.13+ (pdfjs-dist 6 requires it). Set `VITE_API_URL=https://api.example.com/api`, `npm run build`, deploy `dist/`. `npm run build` copies PDF.js fonts/WASM into `public/pdfjs` (self-hosted). Add security headers on the static host (`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`, and a CSP allowing `https://checkout.razorpay.com` and your API origin).

### Free hosting: Render + MongoDB Atlas (step by step)

One free Render service runs the API **and** the website, and your PDFs are stored inside Atlas, so no paid disk is needed. The repository's [../render.yaml](../render.yaml) sets all of it up.

1. **MongoDB Atlas (free M0).** Database Access: create a user with a **new** strong password (rotate the old one). Network Access: allow `0.0.0.0/0` (Render's outgoing addresses change; the password is what protects the database). Copy the connection string and add the database name at the end: `mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/rankora`.
2. **Push the code** to GitHub (`git add -A`, `git commit`, `git push`). Render deploys from the repository.
3. **Render**: sign in with GitHub, New, then Blueprint, choose the repository. When asked, paste `MONGODB_URI` and `FRONTEND_ORIGIN`, which is the address visitors use: `https://www.jeedge.in` (exactly this, with `https://` and `www`, no trailing slash). `JWT_SECRET` is generated for you. The first build takes about 5 to 8 minutes.
   **Custom domain (jeedge.in):** in the Render service open Settings, Custom Domains, and add `www.jeedge.in` and `jeedge.in`. Render then shows the DNS records to create at your domain registrar: a `CNAME` for `www` pointing at the service's `...onrender.com` address, and the records it lists for the bare `jeedge.in` (which it redirects to `www`). HTTPS is issued automatically once DNS has propagated, usually within minutes, sometimes a few hours.
4. **Check it**: open `https://www.jeedge.in/api/health`. It should show `"status":"ok","db":true`. Then open `https://www.jeedge.in` to see the website. Until DNS is ready, the service's own `onrender.com` address (shown in the dashboard) serves the same site. `FRONTEND_ORIGIN` is used for the links the server writes (password-reset emails and teachers' private stats links), so set it to the real domain before sharing those.
5. **Create your admin** from your own computer (PowerShell), pointed at the production database. The password is typed hidden and never saved:
   ```powershell
   cd C:\Users\hp\Documents\Projects\jeedge\server
   $env:MONGODB_URI = "mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/rankora"
   npm run create-admin
   Remove-Item Env:MONGODB_URI
   ```
6. **Sign in at `/admin`**, upload your notes, publish.
7. **Keep it awake (optional, free).** Render's free service sleeps after 15 minutes without visitors, and the next visit then waits about 50 seconds. A free monitor such as UptimeRobot that opens `https://www.jeedge.in/api/health` every 5 minutes avoids that.
8. **When you get Razorpay**: add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` under Environment, delete `PAYMENT_PROVIDER`, create a webhook in Razorpay pointing at `https://www.jeedge.in/api/webhooks/razorpay` for `payment.captured`, `order.paid`, `payment.failed` and `refund.processed`, and let it redeploy.

Until step 8 the store, uploads and free samples work, but checkout says "Payments are not open yet" and nothing can be bought or unlocked. The server never uses the test "mock" payment mode in production.

**Limits of the free setup**: the free Atlas database holds 512 MB in total (notes, covers and all your data); the free Render instance has 512 MB of memory, so keep each PDF under about 25 MB; and the first visit after a sleep is slow unless you use the monitor in step 7. When you outgrow it, move to Render's paid plan and a bigger Atlas tier; nothing in the code changes.

**Other hosts**: set `STORAGE_DRIVER=gridfs` if the host's disk is temporary, `SERVE_FRONTEND=true` to serve the website from the API, and run the website build (`npm run build` in the project root) before starting the API.

## Known limitations

- No admin two-factor sign-in. Use a long unique password; staff accounts are created only via the script.
- Local-disk storage only (S3/R2 is a documented swap point). Per-student copies are cached on disk for `DERIVED_TTL_HOURS`.
- Refunds from the admin screen are full refunds; partial refunds issued in the Razorpay dashboard are honoured.
- Coupon usage limits can be exceeded by a few redemptions under heavy simultaneous checkout.
- Page-view counts are de-duplicated in server memory (per instance); conversion is therefore approximate.
