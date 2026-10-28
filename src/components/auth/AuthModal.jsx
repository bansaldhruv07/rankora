import { useId, useState } from 'react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

const INPUT =
  'h-12 w-full rounded-xl border border-line bg-[#fffdf8] px-4 text-[0.95rem] text-ink-900 transition placeholder:text-ink-400 hover:border-ink-900/30 focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15'

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

export default function AuthModal({ open, initialMode, onClose }) {
  const { login, register } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const isRegister = mode === 'register'
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register')
    setError('')
    setFieldErrors({})
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
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
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={isRegister ? 'Create your account' : 'Sign in'}
      description={isRegister ? 'Needed to buy notes and keep them in your library.' : 'Welcome back to Rankora.'}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {isRegister && (
          <Field label="Name" value={form.name} onChange={set('name')} autoComplete="name" required error={fieldErrors.name} />
        )}
        <Field label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required error={fieldErrors.email} />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          error={fieldErrors.password}
        />
        {error && !Object.keys(fieldErrors).length && (
          <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
            {error}
          </p>
        )}
        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-600">
        {isRegister ? 'Already have an account?' : 'New to Rankora?'}{' '}
        <button type="button" onClick={switchMode} className="font-semibold text-ember-600 underline-offset-4 hover:underline">
          {isRegister ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </Modal>
  )
}
