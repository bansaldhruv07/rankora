import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Check, Info, ShoppingBag, Trash2 } from 'lucide-react'
import OfferBox from '../components/pricing/OfferBox'
import ProductCover from '../components/store/ProductCover'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useLiveQuote } from '../hooks/useLiveQuote'
import { useToast } from '../hooks/useToast'
import { payOrder } from '../lib/checkout'
import { CLASS_LABELS, formatPrice, pluralize } from '../utils/format'
import { ROUTES, notePath } from '../utils/routes'

export default function Cart() {
  const { user, loading: authLoading, openAuth, refresh } = useAuth()
  const { slugs, remove } = useCart()
  const toast = useToast()
  const [phase, setPhase] = useState('idle') // idle | working | done
  const [error, setError] = useState('')
  const [sandbox, setSandbox] = useState(false)
  const [bought, setBought] = useState(null)

  // The server prices the cart (ownership, the one discount that applies, store credit). This only displays
  // its answer, and a typed code is checked as the student types.
  const live = useLiveQuote({ path: '/cart/quote', base: { items: slugs }, enabled: slugs.length > 0, refreshKey: user?.id })
  const quote = live.quote
  const loadError = !quote && live.failure ? live.failure.message : ''

  // Notes the student already owns, or that went off sale, are taken out of the cart once the server says so.
  const handled = useRef(null)
  useEffect(() => {
    if (!quote || handled.current === quote) return
    handled.current = quote
    const gone = [...quote.owned, ...quote.unavailable]
    if (!gone.length) return
    remove(...gone)
    toast({
      title: quote.owned.length ? 'Some notes are already yours' : 'Some notes are no longer for sale',
      description: `${pluralize(gone.length, 'note')} taken out of your cart.`,
      tone: 'info',
    })
  }, [quote, remove, toast])

  const pay = async () => {
    if (!user) return openAuth('login')
    setPhase('working')
    setError('')
    try {
      await payOrder({ items: slugs, ...(live.appliedCode ? { coupon: live.appliedCode } : {}), ...(live.useCredit ? { useCredit: true } : {}) }, pluralize(quote.count, 'note'), {
        onCheckout: (checkout) => setSandbox(checkout.provider === 'mock'),
      })
      const summary = { count: quote.count, total: quote.total }
      remove(...quote.lines.map((line) => line.slug))
      await refresh()
      setBought(summary)
      setPhase('done')
    } catch (err) {
      setPhase('idle')
      if (err.code === 'DISMISSED') return
      if (err.code === 'CONFLICT') await refresh()
      setError(err.message)
    }
  }

  if (phase === 'done' && bought) {
    return (
      <section className="page-container max-w-2xl py-16">
        <Card className="p-8 text-center sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-sage-100 text-sage-700">
            <Check size={26} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold">You&apos;re all set</h1>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-600">
            {pluralize(bought.count, 'note')} {bought.count === 1 ? 'is' : 'are'} now in your library. You paid {formatPrice(bought.total)}.
          </p>
          <Button to={ROUTES.library} variant="accent" size="lg" icon={BookOpen} className="mt-7">
            Go to my library
          </Button>
        </Card>
      </section>
    )
  }

  if (slugs.length === 0) {
    return (
      <section className="page-container py-16">
        <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Add the notes you want and pay for them together, once.">
          <Button to={ROUTES.notes} variant="accent">
            Browse notes
          </Button>
        </EmptyState>
      </section>
    )
  }

  const lines = (quote?.lines ?? []).filter((line) => slugs.includes(line.slug))

  return (
    <section className="page-container py-10 sm:py-14">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">Your cart</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{pluralize(slugs.length, 'note')} ready to buy</h1>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <div>
          {loadError && (
            <p role="alert" className="mb-4 rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
              {loadError}
            </p>
          )}
          {!quote && !loadError ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading your cart">
              {slugs.map((slug) => (
                <div key={slug} className="h-28 animate-pulse rounded-2xl bg-ivory-200" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li key={line.slug} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3 sm:p-4">
                  <div className="w-16 shrink-0 sm:w-20">
                    <ProductCover product={line} compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={notePath(line.slug)} className="block font-display text-lg font-semibold leading-snug hover:text-ember-600">
                      {line.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-600">{[line.classLevel && CLASS_LABELS[line.classLevel], line.pages > 0 && pluralize(line.pages, 'page')].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-display text-lg font-semibold text-ink-900">{formatPrice(line.price)}</p>
                    {line.savings && <s className="tabular text-xs text-ink-400">{formatPrice(line.savings.referencePrice)}</s>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.slug)}
                    aria-label={`Remove ${line.title}`}
                    disabled={phase === 'working'}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-ink-500 transition hover:bg-ivory-200 hover:text-danger-500 disabled:opacity-50"
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to={ROUTES.notes} className="mt-5 inline-block text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">
            ← Keep browsing
          </Link>
        </div>

        <aside aria-label="Order summary" className="lg:sticky lg:top-24">
          <Card className="p-6 sm:p-7">
            <h2 className="text-xl font-semibold">Order summary</h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Subtotal{quote ? ` · ${pluralize(quote.count, 'note')}` : ''}</dt>
                <dd className="tabular font-semibold text-ink-900">{quote ? formatPrice(quote.list) : '…'}</dd>
              </div>
              {quote?.couponDiscount > 0 && (
                <div className="flex justify-between gap-4 text-sage-700">
                  <dt>{quote.discountLabel ?? 'Discount'}</dt>
                  <dd className="tabular font-semibold">− {formatPrice(quote.couponDiscount)}</dd>
                </div>
              )}
              {quote?.credit > 0 && (
                <div className="flex justify-between gap-4 text-sage-700">
                  <dt>Store credit</dt>
                  <dd className="tabular font-semibold">− {formatPrice(quote.credit)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="font-semibold text-ink-900">Total</dt>
                <dd className="tabular font-display text-3xl font-semibold text-ink-900">{quote ? formatPrice(quote.total) : '…'}</dd>
              </div>
            </dl>

            <OfferBox live={live} className="mt-4" />

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
                {error}
              </p>
            )}

            <Button variant="accent" size="lg" className="mt-5 w-full" onClick={pay} disabled={!quote || quote.count === 0 || phase === 'working' || authLoading || live.status === 'checking'}>
              {phase === 'working' ? 'Processing…' : !user ? 'Sign in to check out' : quote ? `Pay ${formatPrice(quote.total)}` : 'Pay'}
            </Button>

            <p className="mt-4 flex gap-2 text-sm leading-relaxed text-ink-600">
              <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-500" />
              {sandbox ? 'Sandbox mode: this server has no payment gateway configured, so the payment is simulated.' : 'Payments are handled by Razorpay. JEEdge never sees your card or UPI details.'}
            </p>
          </Card>
        </aside>
      </div>
    </section>
  )
}
