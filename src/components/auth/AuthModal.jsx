import { useId, useState } from 'react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'

const INPUT =
  'h-12 w-full rounded-xl border border-line bg-surface px-4 text-[0.95rem] text-ink-900 transition placeholder:text-ink-400 hover:border-ink-900/30 focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15'

function Field({ label, error, ...props }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-800">
        {label}
      </label>
      <input id={id} aria-invalid={Boolean(error)} className={INPUT} {...props} />
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-ember-700">
          {error}
        </p>
      )}
    </div>
  )
}

const COPY = {
  login: { title: 'Sign in', description: 'Welcome back to Rankora.', cta: 'Sign in' },
  register: { title: 'Create your account', description: 'Needed to buy notes and keep them in your library.', cta: 'Create account' },
  forgot: { title: 'Reset your password', description: 'Enter your account email and we will send you a link to choose a new password.', cta: 'Send reset link' },
}

export default function AuthModal({ open, initialMode, onClose }) {
  const { login, register } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'
  const copy = COPY[mode]
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const go = (next) => {
    setMode(next)
    setError('')
    setSent(false)
    setFieldErrors({})
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      if (isForgot) {
        await api('/auth/forgot-password', { method: 'POST', body: { email: form.email } })
        setSent(true)
        return
      }
      if (isRegister) await register(form.name, form.email, form.password)
      else await login(form.email, form.password)
      toast({ title: isRegister ? 'Account created' : 'Signed in' })
      onClose()
    } catch (err) {
      setError(err.message)
      setFieldErrors(Object.fromEntries((err.details ?? []).map((detail) => [detail.field, detail.message])))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title={copy.title} description={sent ? undefined : copy.description}>
      {sent ? (
        <div>
          <p className="rounded-xl bg-sage-50 px-4 py-3 text-sm leading-relaxed text-sage-700">
            If an account exists for <strong>{form.email}</strong>, a reset link is on its way. It works once and expires in 30 minutes. Check your spam folder if it does not arrive.
          </p>
          <button type="button" onClick={() => go('login')} className="mt-5 text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">
            Back to sign in
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {isRegister && <Field label="Name" value={form.name} onChange={set('name')} autoComplete="name" required error={fieldErrors.name} />}
            <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldErrors.email} />
            {!isForgot && (
              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={set('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                error={fieldErrors.password}
              />
            )}
            {error && !Object.keys(fieldErrors).length && (
              <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
                {error}
              </p>
            )}
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : copy.cta}
            </Button>
          </form>
          {mode === 'login' && (
            <p className="mt-4 text-center text-sm">
              <button type="button" onClick={() => go('forgot')} className="font-semibold text-ink-600 underline-offset-4 hover:text-ember-600 hover:underline">
                Forgot your password?
              </button>
            </p>
          )}
          <p className="mt-5 text-center text-sm text-ink-600">
            {isForgot ? (
              <button type="button" onClick={() => go('login')} className="font-semibold text-ember-600 underline-offset-4 hover:underline">
                Back to sign in
              </button>
            ) : (
              <>
                {isRegister ? 'Already have an account?' : 'New to Rankora?'}{' '}
                <button type="button" onClick={() => go(isRegister ? 'login' : 'register')} className="font-semibold text-ember-600 underline-offset-4 hover:underline">
                  {isRegister ? 'Sign in' : 'Create an account'}
                </button>
              </>
            )}
          </p>
        </>
      )}
    </Modal>
  )
}
