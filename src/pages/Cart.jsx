import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Check, Info, ShoppingBag, Tag, Trash2, X } from 'lucide-react'
import ProductCover from '../components/store/ProductCover'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useToast } from '../hooks/useToast'
import { api } from '../lib/api'
import { payOrder } from '../lib/checkout'
import { CLASS_LABELS, formatPrice, pluralize } from '../utils/format'
import { ROUTES, notePath } from '../utils/routes'

const INPUT = 'h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-sm uppercase tracking-wide focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15'

export default function Cart() {
  const { user, loading: authLoading, openAuth, refresh } = useAuth()
  const { slugs, remove } = useCart()
  const toast = useToast()
  const [quote, setQuote] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponError, setCouponError] = useState('')
  const [phase, setPhase] = useState('idle') // idle | working | done
  const [error, setError] = useState('')
  const [sandbox, setSandbox] = useState(false)
  const [bought, setBought] = useState(null)

  // The server prices the cart (ownership, volume discount, coupon). This only displays its answer.
  useEffect(() => {
    if (!slugs.length) return undefined
    let active = true
    api('/cart/quote', { method: 'POST', body: { items: slugs, ...(coupon ? { coupon } : {}) } })
      .then(({ data }) => {
        if (!active) return
        setQuote(data)
        setLoadError('')
        const gone = [...data.owned, ...data.unavailable]
        if (gone.length) {
          remove(...gone)
          toast({
            title: data.owned.length ? 'Some notes are already yours' : 'Some notes are no longer for sale',
            description: `${pluralize(gone.length, 'note')} taken out of your cart.`,
            tone: 'info',
          })
        }
      })
      .catch((err) => {
        if (!active) return
        if (coupon) {
          setCouponError(err.message)
          setCoupon('')
        } else setLoadError(err.message)
      })
    return () => {
      active = false
    }
  }, [slugs, coupon, user?.id, remove, toast])

  const applyCoupon = (event) => {
    event.preventDefault()
    setCouponError('')
    setCoupon(couponInput.trim())
  }
  const removeCoupon = () => {
    setCoupon('')
    setCouponInput('')
    setCouponError('')
  }

  const pay = async () => {
    if (!user) return openAuth('login')
    setPhase('working')
    setError('')
    try {
      await payOrder({ items: slugs, ...(quote.couponCode ? { coupon: quote.couponCode } : {}) }, pluralize(quote.count, 'note'), {
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
        <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Add a few notes and the more you buy together, the more you save.">
          <Button to={ROUTES.notes} variant="accent">
            Browse notes
          </Button>
        </EmptyState>
      </section>
    )
  }

  const lines = (quote?.lines ?? []).filter((line) => slugs.includes(line.slug))
  const next = quote?.nextTier

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

            {quote && (
              <p className={`mt-4 flex gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed ${quote.volumePercent > 0 ? 'bg-sage-50 text-sage-700' : 'bg-ivory-100 text-ink-700'}`}>
                <Tag size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span>
                  {quote.volumePercent > 0 && <strong>You&apos;re saving {quote.volumePercent}% for buying together. </strong>}
                  {next ? `Add ${pluralize(next.needed, 'more note')} to save ${next.percent}%.` : quote.volumePercent > 0 ? 'That is our biggest discount.' : ''}
                </span>
              </p>
            )}

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Subtotal{quote ? ` · ${pluralize(quote.count, 'note')}` : ''}</dt>
                <dd className="tabular font-semibold text-ink-900">{quote ? formatPrice(quote.list) : '…'}</dd>
              </div>
              {quote?.volumeDiscount > 0 && (
                <div className="flex justify-between gap-4 text-sage-700">
                  <dt>Buying together ({quote.volumePercent}%)</dt>
                  <dd className="tabular font-semibold">− {formatPrice(quote.volumeDiscount)}</dd>
                </div>
              )}
              {quote?.couponDiscount > 0 && (
                <div className="flex justify-between gap-4 text-sage-700">
                  <dt>Coupon {quote.couponCode}</dt>
                  <dd className="tabular font-semibold">− {formatPrice(quote.couponDiscount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                <dt className="font-semibold text-ink-900">Total</dt>
                <dd className="tabular font-display text-3xl font-semibold text-ink-900">{quote ? formatPrice(quote.total) : '…'}</dd>
              </div>
            </dl>

            {quote?.couponCode ? (
              <p className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-sage-50 px-4 py-2.5 text-sm text-sage-700">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Tag size={14} aria-hidden="true" />
                  {quote.couponCode} applied
                </span>
                <button type="button" onClick={removeCoupon} aria-label="Remove coupon" className="grid size-7 place-items-center rounded-full hover:bg-sage-100">
                  <X size={14} aria-hidden="true" />
                </button>
              </p>
            ) : (
              <form onSubmit={applyCoupon} className="mt-4">
                <label htmlFor="cart-coupon" className="sr-only">
                  Coupon code
                </label>
                <div className="flex gap-2">
                  <input id="cart-coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" autoComplete="off" maxLength={30} className={INPUT} />
                  <Button type="submit" variant="outline" disabled={!couponInput.trim() || !quote}>
                    Apply
                  </Button>
                </div>
                {couponError && (
                  <p role="alert" className="mt-2 text-sm text-ember-700">
                    {couponError}
                  </p>
                )}
              </form>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
                {error}
              </p>
            )}

            <Button variant="accent" size="lg" className="mt-5 w-full" onClick={pay} disabled={!quote || quote.count === 0 || phase === 'working' || authLoading}>
              {phase === 'working' ? 'Processing…' : !user ? 'Sign in to check out' : quote ? `Pay ${formatPrice(quote.total)}` : 'Pay'}
            </Button>

            <p className="mt-4 flex gap-2 text-sm leading-relaxed text-ink-600">
              <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-500" />
              {sandbox ? 'Sandbox mode: this server has no payment gateway configured, so the payment is simulated.' : 'Payments are handled by Razorpay. Rankora never sees your card or UPI details.'}
            </p>
          </Card>
        </aside>
      </div>
    </section>
  )
}
