import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { api, noteFileUrl } from '../lib/api'
import { formatPrice } from '../utils/format'
import { ROUTES, explorePath, resourcePath } from '../utils/routes'

const STATUS_TONE = { paid: 'sage', refunded: 'neutral', pending: 'neutral', failed: 'neutral', cancelled: 'neutral' }
const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function useAccountData(userId) {
  const [data, setData] = useState({ status: 'loading', notes: [], orders: [], error: '' })

  useEffect(() => {
    if (!userId) return undefined
    let active = true
    Promise.all([api('/library'), api('/orders?limit=50')])
      .then(([library, orders]) => active && setData({ status: 'ready', notes: library.data.items, orders: orders.data, error: '' }))
      .catch((err) => active && setData({ status: 'error', notes: [], orders: [], error: err.message }))
    return () => {
      active = false
    }
  }, [userId])

  return userId ? data : { status: 'loading', notes: [], orders: [], error: '' }
}

export default function Account() {
  const { user, access, loading, logout, openAuth } = useAuth()
  const toast = useToast()
  const { status, notes, orders, error } = useAccountData(user?.id)

  if (loading) return <section className="page-container py-20 text-ink-600">Loading your account…</section>

  if (!user) {
    return (
      <section className="page-container py-20">
        <EmptyState title="Sign in to see your library" description="Your purchased notes and order history live in your account.">
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
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </PageHeader>

      <section className="page-container space-y-12 py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-3">
          {access.premium ? (
            <Badge tone="sage">Premium active until {formatDate(access.premiumUntil)}</Badge>
          ) : (
            <>
              <Badge tone="neutral">Free plan</Badge>
              <Button to={ROUTES.pricing} size="sm" variant="accent">
                See Premium
              </Button>
            </>
          )}
        </div>

        {status === 'error' && (
          <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
            {error}
          </p>
        )}

        <div>
          <h2 className="text-2xl font-semibold">Your notes</h2>
          {status === 'loading' ? (
            <p className="mt-4 text-ink-600">Loading…</p>
          ) : notes.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No purchased notes yet" description="Notes you buy, or everything unlocked by Premium, will show up here.">
                <Button to={explorePath({ price: 'premium' })} variant="accent">
                  Browse paid notes
                </Button>
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {notes.map((note) => (
                <li key={note.id}>
                  <Card className="flex h-full flex-col gap-3 p-5">
                    <Link to={resourcePath(note.slug)} className="font-display text-lg font-semibold hover:text-ember-600">
                      {note.title}
                    </Link>
                    <p className="text-sm text-ink-600">{note.chapter}</p>
                    {note.type !== 'mock' && (
                      <Button href={noteFileUrl(note.slug)} target="_blank" rel="noopener" variant="outline" size="sm" icon={Download} className="mt-auto self-start">
                        Download PDF
                      </Button>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Order history</h2>
          {status === 'ready' && orders.length === 0 ? (
            <p className="mt-4 text-ink-600">No orders yet.</p>
          ) : (
            <ul className="mt-5 divide-y divide-line-soft rounded-2xl border border-line bg-[#fffdf8]">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium text-ink-900">{order.productTitle}</p>
                    <p className="text-sm text-ink-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular font-semibold">{formatPrice(order.amount)}</span>
                    <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
