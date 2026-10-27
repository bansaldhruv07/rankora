import { useSyncExternalStore } from 'react'
import { getSnapshot, setPlan, subscribe } from '../utils/planStore'

export function usePlan() {
  const plan = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { plan, isPremium: plan === 'premium', setPlan }
}