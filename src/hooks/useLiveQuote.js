import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

// Prices an order on the server and keeps the answer in step with what the student types.
//
//   path         the quote endpoint, e.g. /cart/quote or /products/<slug>/quote
//   base         the request body without the code (e.g. { items: [...] })
//   refreshKey   anything that should trigger a fresh quote when it changes (e.g. the signed-in user)
//
// A typed code is checked after a short pause, so the student sees "accepted" or the exact reason it was refused while
// they type. A refused code never leaves the order unpriced: the quote falls back to the order without it. The
// server prices every order again when it is created, so this only ever shows the server's answer.
export function useLiveQuote({ path, base, enabled = true, refreshKey = null }) {
  const [code, setCode] = useState('')
  const [debounced, setDebounced] = useState('')
  const [useCredit, setUseCredit] = useState(false)
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState({ key: null, quote: null, error: '', failure: null })
  const baseKey = JSON.stringify(base)
  const key = `${path}|${baseKey}|${debounced}|${useCredit}|${refreshKey}|${tick}`

  useEffect(() => {
    const typed = code.trim()
    const timer = setTimeout(() => setDebounced(typed), typed ? 450 : 0)
    return () => clearTimeout(timer)
  }, [code])

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    const body = (withCode) => ({ ...JSON.parse(baseKey), ...(withCode && debounced ? { coupon: debounced } : {}), ...(useCredit ? { useCredit: true } : {}) })
    api(path, { method: 'POST', body: body(true) })
      .then(({ data }) => active && setResult({ key, quote: data, error: '', failure: null }))
      .catch(async (err) => {
        if (!active) return
        if (!debounced) return setResult((r) => ({ ...r, key, error: '', failure: err }))
        try {
          const { data } = await api(path, { method: 'POST', body: body(false) })
          if (active) setResult({ key, quote: data, error: err.message, failure: null })
        } catch (fallback) {
          if (active) setResult((r) => ({ ...r, key, error: err.message, failure: fallback }))
        }
      })
    return () => {
      active = false
    }
    // `key` already covers path, baseKey, debounced, useCredit, refreshKey and tick.
  }, [enabled, path, baseKey, debounced, useCredit, key])

  const typed = code.trim()
  const current = result.key === key
  const status = !typed ? 'idle' : typed !== debounced || !current ? 'checking' : result.error ? 'error' : 'ok'
  const reload = useCallback(() => setTick((n) => n + 1), [])

  return {
    quote: result.quote,
    failure: current ? result.failure : null,
    loading: enabled && !current,
    code,
    setCode,
    status,
    error: status === 'error' ? result.error : '',
    // The code the server accepted (empty when none was typed or it was refused): this is what goes on the order.
    appliedCode: status === 'ok' ? debounced : '',
    useCredit,
    setUseCredit,
    reload,
  }
}
