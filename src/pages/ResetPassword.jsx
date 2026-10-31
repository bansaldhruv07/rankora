import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { ROUTES } from '../utils/routes'

const INPUT =
  'h-12 w-full rounded-xl border border-line bg-surface px-4 text-[0.95rem] text-ink-900 placeholder:text-ink-400 hover:border-ink-900/30 focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15'

// Landing page for the emailed link: /reset-password?token=...
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { openAuth } = useAuth()
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ busy: false, done: false, error: '' })

  const submit = async (event) => {
    event.preventDefault()
    setState({ busy: true, done: false, error: '' })
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } })
      setState({ busy: false, done: true, error: '' })
    } catch (err) {
      const detail = err.details?.[0]?.message
      setState({ busy: false, done: false, error: detail || err.message })
    }
  }

  return (
    <section className="page-container grid place-items-center py-16 sm:py-24">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <span className="grid size-12 place-items-center rounded-full bg-ember-50 text-ember-600">
          <KeyRound size={22} aria-hidden="true" />
        </span>
        {state.done ? (
          <>
            <h1 className="mt-5 text-3xl font-semibold">Password updated</h1>
            <p className="mt-3 leading-relaxed text-ink-600">You&apos;ve been signed out everywhere. Sign in with your new password.</p>
            <Button variant="accent" size="lg" className="mt-6 w-full" onClick={() => openAuth('login')}>
              Sign in
            </Button>
          </>
        ) : !token ? (
          <>
            <h1 className="mt-5 text-3xl font-semibold">This link is incomplete</h1>
            <p className="mt-3 leading-relaxed text-ink-600">Open the full link from your email, or ask for a new one.</p>
            <Button variant="accent" className="mt-6" onClick={() => openAuth('forgot')}>
              Send a new link
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-3xl font-semibold">Choose a new password</h1>
            <p className="mt-3 leading-relaxed text-ink-600">Use at least 8 characters. This link works once.</p>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-800">New password</span>
                <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} autoFocus />
              </label>
              {state.error && (
                <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
                  {state.error}{' '}
                  <button type="button" onClick={() => openAuth('forgot')} className="font-semibold underline">
                    Get a new link
                  </button>
                </p>
              )}
              <Button type="submit" variant="accent" size="lg" className="w-full" disabled={state.busy || password.length < 8}>
                {state.busy ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          </>
        )}
        <p className="mt-6 text-center text-sm text-ink-600">
          <Link to={ROUTES.home} className="font-semibold text-ember-600 underline-offset-4 hover:underline">
            Back to Rankora
          </Link>
        </p>
      </Card>
    </section>
  )
}
