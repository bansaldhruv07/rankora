import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../../hooks/useAuth'
import { api } from '../../lib/api'
import AuthModal from './AuthModal'

const NO_ACCESS = { premium: false, premiumUntil: null, productSlugs: [] }

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, access: NO_ACCESS, loading: true })
  const [modal, setModal] = useState({ open: false, mode: 'login', key: 0 })

  const apply = useCallback((data) => setState({ user: data?.user ?? null, access: data?.access ?? NO_ACCESS, loading: false }), [])

  const refresh = useCallback(async () => {
    try {
      apply((await api('/auth/me')).data)
    } catch {
      apply(null)
    }
  }, [apply])

  useEffect(() => {
    let active = true
    api('/auth/me')
      .then((json) => active && apply(json.data))
      .catch(() => active && apply(null))
    return () => {
      active = false
    }
  }, [apply])

  const login = useCallback(
    async (email, password) => {
      apply((await api('/auth/login', { method: 'POST', body: { email, password } })).data)
    },
    [apply],
  )

  const register = useCallback(
    async (name, email, password) => {
      await api('/auth/register', { method: 'POST', body: { name, email, password } })
      await refresh()
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    apply(null)
  }, [apply])

  const openAuth = useCallback((mode = 'login') => setModal((prev) => ({ open: true, mode, key: prev.key + 1 })), [])
  const closeAuth = useCallback(() => setModal((prev) => ({ ...prev, open: false })), [])

  const value = useMemo(
    () => ({ ...state, login, register, logout, refresh, openAuth }),
    [state, login, register, logout, refresh, openAuth],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal key={modal.key} open={modal.open} initialMode={modal.mode} onClose={closeAuth} />
    </AuthContext.Provider>
  )
}
