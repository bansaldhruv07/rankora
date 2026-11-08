import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useFeatures } from '../../hooks/useFeatures'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { formatPrice } from '../../utils/format'

// Remembers a code from a link: /?t=CODE (a teacher's code) or /?ref=CODE (a friend's). The server keeps it for 30 days
// and applies it at checkout. Renders nothing. A given link is only reported once per browser session.
export default function GrowthCapture() {
  const { search } = useLocation()
  const features = useFeatures()
  const toast = useToast()

  useEffect(() => {
    if (!features.loaded) return
    const params = new URLSearchParams(search)
    const teacher = features.teachers ? params.get('t') : null
    const ref = features.referrals ? params.get('ref') : null
    if (!teacher && !ref) return

    const stamp = `${teacher ?? ''}|${ref ?? ''}`
    try {
      if (sessionStorage.getItem('rk-landing') === stamp) return
      sessionStorage.setItem('rk-landing', stamp)
    } catch {
      /* private mode: the server de-duplicates repeat clicks anyway */
    }

    api('/growth/landing', { method: 'POST', body: { ...(teacher ? { teacher } : {}), ...(ref ? { ref } : {}) } })
      .then(({ data }) => {
        if (!data.saved) return
        toast({
          title: ref && !teacher ? `${formatPrice(features.friendDiscount ?? 0)} off your first order` : 'Your discount is saved',
          description: 'It will be applied automatically at checkout.',
          tone: 'info',
        })
      })
      .catch(() => {})
  }, [search, features, toast])

  return null
}
