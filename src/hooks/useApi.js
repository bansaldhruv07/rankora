import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

// Loads `path` (skipped when null) and reloads when it changes. `reload()` refetches in place.
// Stale responses from a previous path are ignored.
export function useApi(path) {
  const [state, setState] = useState({ path: null, data: null, meta: null, error: null })
  const [tick, setTick] = useState(0)
  const latest = useRef(path)

  useEffect(() => {
    latest.current = path
    if (!path) return undefined
    let active = true
    api(path)
      .then((json) => active && setState({ path, data: json.data, meta: json.meta ?? null, error: null }))
      .catch((error) => active && setState({ path, data: null, meta: null, error }))
    return () => {
      active = false
    }
  }, [path, tick])

  const reload = useCallback(() => setTick((n) => n + 1), [])
  const settled = state.path === path
  return {
    data: settled ? state.data : null,
    meta: settled ? state.meta : null,
    error: settled ? state.error : null,
    loading: Boolean(path) && !settled,
    reload,
  }
}
