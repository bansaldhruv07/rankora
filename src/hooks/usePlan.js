import { useAuth } from './useAuth'

// Premium now comes from the server (a verified, unexpired purchase), not from local storage.
export function usePlan() {
  const { access } = useAuth()
  return { plan: access.premium ? 'premium' : 'free', isPremium: access.premium, premiumUntil: access.premiumUntil }
}
