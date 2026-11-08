import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Which growth programs the server has switched on (REFERRALS_ENABLED / TEACHER_PROGRAM_ENABLED), plus the rates to
// quote in the copy. Fetched once per page load and shared. Until it answers, both are treated as off.
const OFF = { referrals: false, teachers: false }
let cached = null
let inflight = null

function load() {
  inflight ??= api('/growth/features')
    .then(({ data }) => (cached = data))
    .catch(() => (cached = OFF))
  return inflight
}

export function useFeatures() {
  const [features, setFeatures] = useState(cached ?? OFF)
  const [loaded, setLoaded] = useState(Boolean(cached))
  useEffect(() => {
    if (cached) return undefined
    let active = true
    load().then((data) => {
      if (!active) return
      setFeatures(data)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])
  return { ...features, loaded }
}
