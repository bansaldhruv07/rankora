import { API_BASE, api } from './api'

const headers = (token) => ({ 'X-Reader-Token': token })

// Opens a reading session. The server decides from the signed-in account whether this is allowed.
export const openReaderSession = (slug, mode = 'full') => api('/reader/sessions', { method: 'POST', body: { product: slug, mode } }).then((json) => json.data)

export const saveProgress = (token, page) => api('/reader/progress', { method: 'PUT', body: { page }, headers: headers(token) })

// Used when the tab is being closed or hidden: keepalive lets the request outlive the page.
export function saveProgressOnExit(token, page) {
  try {
    fetch(`${API_BASE}/reader/progress`, {
      method: 'PUT',
      keepalive: true,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'jeedge', ...headers(token) },
      body: JSON.stringify({ page }),
    })
  } catch {
    /* best effort */
  }
}

// Frees the session slot when the reader closes.
export function closeSession(token) {
  try {
    fetch(`${API_BASE}/reader/sessions/current`, {
      method: 'DELETE',
      keepalive: true,
      credentials: 'include',
      headers: { 'X-Requested-With': 'jeedge', ...headers(token) },
    })
  } catch {
    /* best effort */
  }
}
