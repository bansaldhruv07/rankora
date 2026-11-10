// Single place that talks to the backend. VITE_API_URL defaults to "/api" (Vite dev proxy / same-origin deploy).
export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.'

function toError(status, json) {
  return new ApiError(
    status,
    json?.error?.code ?? 'UNKNOWN',
    json?.error?.message ?? 'Something went wrong. Please try again.',
    json?.error?.details,
  )
}

// Resolves with the parsed `{ success, data, meta }` body, or throws ApiError.
export async function api(path, { method = 'GET', body, headers } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'X-Requested-With': 'jeedge', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', NETWORK_MESSAGE)
  }
  const json = await response.json().catch(() => null)
  if (!response.ok || !json?.success) throw toError(response.status, json)
  return json
}

// Uploads one file as a raw body with real progress (fetch cannot report upload progress).
export function uploadFile(path, file, { method = 'POST', onProgress, headers, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `${API_BASE}${path}`)
    xhr.withCredentials = true
    xhr.setRequestHeader('X-Requested-With', 'jeedge')
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    for (const [key, value] of Object.entries(headers ?? {})) xhr.setRequestHeader(key, value)
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total)
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK', NETWORK_MESSAGE))
    xhr.onabort = () => reject(new ApiError(0, 'ABORTED', 'Upload cancelled'))
    xhr.onload = () => {
      let json = null
      try {
        json = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.success) resolve(json)
      else reject(toError(xhr.status, json))
    }
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(file)
  })
}

// Image URLs returned by the API are paths like "/api/products/x/cover"; on a separate API origin they need that origin.
export function assetUrl(path) {
  if (!path) return null
  if (/^https?:/.test(API_BASE)) return `${new URL(API_BASE).origin}${path}`
  return path
}

export const readerStreamUrl = () => `${API_BASE}/reader/stream`
