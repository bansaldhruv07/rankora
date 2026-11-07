import { useState } from 'react'
import { SITE } from '../data/site'

// Whole days left until SITE.exam.date, or null when no valid future date is set.
export function useDaysToExam() {
  const [now] = useState(() => Date.now())
  const target = SITE.exam?.date ? new Date(`${SITE.exam.date}T00:00:00+05:30`).getTime() : NaN
  if (Number.isNaN(target) || target <= now) return null
  return Math.ceil((target - now) / 86_400_000)
}
