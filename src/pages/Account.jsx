import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Mail } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { TabPanel, Tabs } from '../components/ui/Tabs'
import { useAuth } from '../hooks/useAuth'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import { formatLongDate, formatPrice } from '../utils/format'
import { ROUTES, notePath } from '../utils/routes'

const INPUT =
  'h-12 w-full rounded-xl border border-line bg-surface px-4 text-[0.95rem] text-ink-900 transition placeholder:text-ink-400 hover:border-ink-900/30 focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15'

// What each order status means for the student, in plain words.
const PAYMENT = {
  paid: { tone: 'sage', label: 'Paid', note: 'Payment verified. Access granted.' },
  pending: { tone: 'neutral', label: 'Awaiting payment', note: 'Not completed yet. No access has been granted.' },
  failed: { tone: 'danger', label: 'Payment failed', note: 'You were not charged for a failed payment.' },
  cancelled: { tone: 'neutral', label: 'Cancelled', note: 'This order was cancelled.' },
  refunded: { tone: 'neutral', label: 'Refunded', note: 'Refunded to the original payment method. Access has ended.' },
}

function Field({ label, error, hint, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>
      <input aria-invalid={Boolean(error)} className={INPUT} {...props} />
      {hint && !error && <span className="mt-1.5 block text-sm text-ink-500">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1.5 block text-sm text-ember-700">
          {error}
        </span>
      )}
    </label>
  )
}

function useForm(initial, submit, success, { reset = true } = {}) {
  const toast = useToast()
  const [values, setValues] = useState(initial)
  const [state, setState] = useState({ busy: false, error: '', fields: {} })
  const set = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }))
  const onSubmit = async (event) => {
    event.preventDefault()
    setState({ busy: true, error: '', fields: {} })
    try {
      await submit(values)
      toast({ title: success })
      if (reset) setValues(initial)
      setState({ busy: false, error: '', fields: {} })
    } catch (err) {
      setState({ busy: false, error: err.message, fields: Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message])) })
    }
  }
  return { values, set, onSubmit, ...state }
}

function Orders() {
  const toast = useToast()
  const { data, error, loading, reload } = useApi('/orders?limit=50')
  const cancel = async (id) => {
    try {
      await api(`/orders/${id}/cancel`, { method: 'POST' })
      toast({ title: 'Order cancelled', tone: 'info' })
      reload()
    } catch (err) {
      toast({ title: err.message, tone: 'info' })
    }
  }
  if (loading) return <p className="text-ink-600">Loading orders…</p>
  if (error) return <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">{error.message}</p>
  if (!data.length) {
    return (
      <EmptyState icon={BookOpen} title="No orders yet" description="When you buy a note it appears here with its payment status.">
        <Button to={ROUTES.notes} variant="accent">
          Browse notes
        </Button>
      </EmptyState>
    )
  }
  return (
    <ul className="divide-y divide-line-soft rounded-2xl border border-line bg-surface">
      {data.map((order) => {
        const status = PAYMENT[order.status]
        return (
          <li key={order.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink-900">
                {order.productSlug ? (
                  <Link to={notePath(order.productSlug)} className="hover:text-ember-600">
                    {order.productTitle}
                  </Link>
                ) : (
                  order.productTitle
                )}
              </p>
              <p className="mt-0.5 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-400">
                {order.reference} · {formatLongDate(order.createdAt)}
              </p>
              <p className="mt-1.5 text-sm text-ink-600">{status.note}</p>
              {order.status === 'pending' && (
                <button type="button" onClick={() => cancel(order.id)} className="mt-1.5 text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">
                  Cancel this order
                </button>
              )}
            </div>
            <div className="text-right">
              <p className="tabular font-semibold">{formatPrice(order.amount)}</p>
              {order.discount > 0 && (
                <p className="tabular text-xs text-ink-500">
                  {order.couponCode} saved {formatPrice(order.discount)}
                </p>
              )}
              <Badge tone={status.tone} className="mt-1.5">
                {status.label}
              </Badge>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Profile() {
  const { user, refresh } = useAuth()
  const profile = useForm({ name: user.name }, async ({ name }) => {
    await api('/auth/me', { method: 'PATCH', body: { name } })
    await refresh()
  }, 'Profile updated', { reset: false })
  const password = useForm({ currentPassword: '', newPassword: '' }, (values) => api('/auth/change-password', { method: 'POST', body: values }), 'Password changed')

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 sm:p-7">
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-ink-600">Your name appears on the watermark of every page you read.</p>
        <form onSubmit={profile.onSubmit} className="mt-5 space-y-4" noValidate>
          <Field label="Name" value={profile.values.name} onChange={profile.set('name')} autoComplete="name" error={profile.fields.name} />
          <Field label="Email" value={user.email} readOnly disabled hint="Contact support to change the email on your account." />
          {profile.error && !Object.keys(profile.fields).length && <p role="alert" className="text-sm text-ember-700">{profile.error}</p>}
          <Button type="submit" variant="primary" disabled={profile.busy || profile.values.name.trim() === user.name}>
            {profile.busy ? 'Saving…' : 'Save name'}
          </Button>
        </form>
      </Card>

      <Card className="p-6 sm:p-7">
        <h2 className="text-xl font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-ink-600">Changing it signs out your other devices.</p>
        <form onSubmit={password.onSubmit} className="mt-5 space-y-4" noValidate>
          <Field label="Current password" type="password" autoComplete="current-password" value={password.values.currentPassword} onChange={password.set('currentPassword')} error={password.fields.currentPassword} />
          <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." value={password.values.newPassword} onChange={password.set('newPassword')} error={password.fields.newPassword} />
          {password.error && !Object.keys(password.fields).length && <p role="alert" className="text-sm text-ember-700">{password.error}</p>}
          <Button type="submit" variant="primary" disabled={password.busy || !password.values.currentPassword || !password.values.newPassword}>
            {password.busy ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

function Support() {
  const { data, reload } = useApi('/support')
  const form = useForm(
    { subject: '', message: '' },
    async (values) => {
      await api('/support', { method: 'POST', body: values })
      reload()
    },
    'Message sent. We will reply by email.',
  )
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="p-6 sm:p-7">
        <h2 className="text-xl font-semibold">Contact support</h2>
        <p className="mt-1 text-sm text-ink-600">Payment not showing, a page not loading, or a question about a note? Tell us what happened.</p>
        <form onSubmit={form.onSubmit} className="mt-5 space-y-4" noValidate>
          <Field label="Subject" value={form.values.subject} onChange={form.set('subject')} maxLength={120} error={form.fields.subject} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-800">Message</span>
            <textarea rows={5} value={form.values.message} onChange={form.set('message')} maxLength={4000} aria-invalid={Boolean(form.fields.message)} className={`${INPUT} h-auto py-3`} />
            {form.fields.message && <span role="alert" className="mt-1.5 block text-sm text-ember-700">{form.fields.message}</span>}
          </label>
          {form.error && !Object.keys(form.fields).length && <p role="alert" className="text-sm text-ember-700">{form.error}</p>}
          <Button type="submit" variant="accent" disabled={form.busy}>
            {form.busy ? 'Sending…' : 'Send message'}
          </Button>
        </form>
        {data?.supportEmail && (
          <p className="mt-5 flex items-center gap-2 text-sm text-ink-600">
            <Mail size={15} aria-hidden="true" />
            Or email <span className="font-semibold text-ink-900">{data.supportEmail}</span>
          </p>
        )}
      </Card>
      <div>
        <h2 className="text-xl font-semibold">Your messages</h2>
        {data?.items.length ? (
          <ul className="mt-4 space-y-3">
            {data.items.map((m) => (
              <li key={m.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink-900">{m.subject}</p>
                  <Badge tone={m.status === 'resolved' ? 'sage' : 'neutral'}>{m.status}</Badge>
                </div>
                <p className="mt-1 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-400">{formatLongDate(m.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-600">Nothing sent yet.</p>
        )}
      </div>
    </div>
  )
}

export default function Account() {
  const { user, access, loading, logout, openAuth } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('orders')

  if (loading) return <section className="page-container py-20 text-ink-600">Loading your account…</section>
  if (!user) {
    return (
      <section className="page-container py-20">
        <EmptyState title="Sign in to see your account" description="Your orders, profile and support messages live here.">
          <Button variant="accent" onClick={() => openAuth('login')}>
            Sign in
          </Button>
        </EmptyState>
      </section>
    )
  }

  const signOut = async () => {
    await logout()
    toast({ title: 'Signed out', tone: 'info' })
  }

  return (
    <>
      <PageHeader eyebrow="Account" title={`Hello, ${user.name.split(' ')[0]}`} description={user.email}>
        <div className="flex flex-wrap gap-3">
          <Button to={ROUTES.library} variant="accent" icon={BookOpen}>
            My library
          </Button>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </PageHeader>

      <section className="page-container space-y-8 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-3">
          {access.premium ? (
            <Badge tone="sage">Premium active until {formatLongDate(access.premiumUntil)}</Badge>
          ) : (
            <>
              <Badge tone="neutral">Free plan</Badge>
              <Button to={ROUTES.pricing} size="sm" variant="outline">
                See Premium
              </Button>
            </>
          )}
        </div>

        <Tabs
          tabs={[
            { id: 'orders', label: 'Orders' },
            { id: 'profile', label: 'Profile & security' },
            { id: 'support', label: 'Support' },
          ]}
          value={tab}
          onChange={setTab}
          idPrefix="account"
          label="Account sections"
        />
        <TabPanel idPrefix="account" id="orders" value={tab} className="outline-none">
          <Orders />
        </TabPanel>
        <TabPanel idPrefix="account" id="profile" value={tab} className="outline-none">
          <Profile />
        </TabPanel>
        <TabPanel idPrefix="account" id="support" value={tab} className="outline-none">
          <Support />
        </TabPanel>
      </section>
    </>
  )
}
