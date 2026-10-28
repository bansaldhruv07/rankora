// Single place that talks to the backend. VITE_API_URL defaults to "/api" (Vite dev proxy / same-origin deploy).
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

// Resolves with the parsed `{ success, data, meta }` body, or throws ApiError.
export async function api(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'X-Requested-With': 'rankora', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.')
  }
  const json = await response.json().catch(() => null)
  if (!response.ok || !json?.success) {
    throw new ApiError(
      response.status,
      json?.error?.code ?? 'UNKNOWN',
      json?.error?.message ?? 'Something went wrong. Please try again.',
      json?.error?.details,
    )
  }
  return json
}

export const noteFileUrl = (slug) => `${BASE}/library/${encodeURIComponent(slug)}/file`
