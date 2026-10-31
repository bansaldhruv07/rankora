import { readerStreamUrl } from './api'

let loading

// PDF.js is large, so it is only fetched when a reader opens. Fonts, character maps and WASM decoders
// are served from our own origin (see scripts/copy-pdfjs-assets.mjs).
export function loadPdfjs() {
  loading ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })
  return loading
}

// Opens the document through the authorised stream. The token travels in a header (never in the URL),
// and the signed-in cookie is sent alongside it. Only the byte ranges that are needed are requested.
export async function openDocument(token) {
  const pdfjs = await loadPdfjs()
  const task = pdfjs.getDocument({
    url: readerStreamUrl(),
    httpHeaders: { 'X-Reader-Token': token, 'X-Requested-With': 'rankora' },
    withCredentials: true,
    disableAutoFetch: true,
    rangeChunkSize: 131072,
    enableXfa: false,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    wasmUrl: '/pdfjs/wasm/',
    iccUrl: '/pdfjs/iccs/',
  })
  return { task, promise: task.promise, pdfjs }
}

// True when a PDF.js failure means the session ended (revoked, expired, access removed) rather than a bad file.
export function isSessionError(error) {
  return error?.status === 401 || error?.status === 403 || /\b(401|403)\b/.test(String(error?.message ?? ''))
}
