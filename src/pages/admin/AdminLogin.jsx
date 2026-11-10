import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogoMark } from '../../components/common/Logo'
import Button from '../../components/ui/Button'
import { Field } from '../../components/admin/ui'
import { useAdmin } from './adminContext'

export default function AdminLogin() {
  const { staff, loading, login } = useAdmin()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [state, setState] = useState({ busy: false, error: '' })

  if (!loading && staff) return <Navigate to={location.state?.from ?? '/admin'} replace />

  const submit = async (event) => {
    event.preventDefault()
    setState({ busy: true, error: '' })
    try {
      await login(form.email, form.password)
      navigate(location.state?.from ?? '/admin', { replace: true })
    } catch (err) {
      setState({ busy: false, error: err.status === 429 ? 'Too many attempts. Wait a few minutes and try again.' : err.message })
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ink-900 px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-ivory-50 p-8 shadow-lift">
        <div className="flex items-center gap-3">
          <LogoMark size={36} />
          <div>
            <h1 className="font-display text-2xl font-semibold leading-none">JEEdge Studio</h1>
            <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-ink-500">Staff sign-in</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <Field label="Email" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Field label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {state.error && (
            <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
              {state.error}
            </p>
          )}
          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={state.busy || !form.email || !form.password}>
            {state.busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-5 text-xs leading-relaxed text-ink-500">Student accounts cannot sign in here. Staff accounts are created by the site owner from the server.</p>
      </div>
    </main>
  )
}
