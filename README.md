# JEEdge

JEE notes site: a **notes marketplace** where students buy chapter notes (singly or in subject bundles) made by an IIT Delhi student and read them in a secure in-site PDF reader. React 19 + Vite + Tailwind 4 frontend; Express + MongoDB API in [server/](server/README.md).

```
src/
  pages/            Notes (store), NoteDetails, Library, Reader, Account, Policies, ResetPassword, admin/*
  components/store  ProductCover (generated covers), ProductCard, BundleCard, PriceTag
  components/reader PdfViewer (PDF.js), WatermarkLayer, ReaderScreen (session lifecycle)
  components/admin  shared admin UI, UploadPanel
  lib/              api (fetch + upload progress), pdf (PDF.js loader), reader
server/             API, models, tests: see server/README.md
```

## Quick start

```powershell
cd server; npm install; Copy-Item .env.example .env   # fill in JWT_SECRET, MONGODB_URI
npm run dev:db        # local MongoDB (or use Atlas)
npm run create-admin  # your admin account
npm run dev           # API :5000
cd ..; npm install; npm run dev   # site :5173, admin at /admin
```

Everything about uploading and publishing notes, the PDF protection model, endpoints, environment variables and deployment is in [server/README.md](server/README.md).

Scripts: `npm run dev`, `npm run build` (also copies PDF.js assets to `public/pdfjs`), `npm run lint`. Needs Node 22.13+ to build (pdfjs-dist 6).
