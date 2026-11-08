import { useState } from 'react'
import { BookOpen, Check, Info, ShieldCheck, Smartphone } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import OfferBox from './OfferBox'
import { useAuth } from '../../hooks/useAuth'
import { useLiveQuote } from '../../hooks/useLiveQuote'
import { payOrder } from '../../lib/checkout'
import { formatPrice } from '../../utils/format'
import { ROUTES, readPath } from '../../utils/routes'

// Buys one product (a note, a bundle or a Premium plan) by slug. The price shown comes from the
// server (including any coupon), and the server prices the order again, so nothing here can change
// what is charged.
export default function CheckoutModal({ open, onClose, slug, title, fallbackAmount, details = [], kind = 'note', itemCount, onPurchased }) {
  const { user, loading, openAuth, refresh } = useAuth()
  const [phase, setPhase] = useState('idle') // idle | working | done
  const [error, setError] = useState('')
  const [sandbox, setSandbox] = useState(false)

  // The live price (not the page's cached copy) is what the student is shown before paying. A code typed here is
  // checked as they type; the server prices the order again when it is created.
  const live = useLiveQuote({ path: `/products/${encodeURIComponent(slug)}/quote`, base: {}, enabled: open && Boolean(user), refreshKey: user?.id })
  const quote = live.quote ?? { list: fallbackAmount, discount: 0, total: fallbackAmount, credit: 0, discountLabel: null }

  const pay = async () => {
    setPhase('working')
    setError('')
    try {
      await payOrder({ product: slug, ...(live.appliedCode ? { coupon: live.appliedCode } : {}), ...(live.useCredit ? { useCredit: true } : {}) }, title, {
        onCheckout: (checkout) => setSandbox(checkout.provider === 'mock'),
      })
      await refresh()
      setPhase('done')
      onPurchased?.()
    } catch (err) {
      setPhase('idle')
      if (err.code === 'DISMISSED') return
      if (err.code === 'CONFLICT') await refresh()
      setError(err.message)
    }
  }

  if (phase === 'done') {
    const isNote = kind === 'note'
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="You're all set"
        description={isNote ? `${title} is now in your library.` : kind === 'bundle' ? `All ${itemCount ? `${itemCount} ` : ''}notes in ${title} are now in your library.` : `${title} is now active on your account.`}
        footer={
          <>
            <Button to={ROUTES.library} variant="outline" onClick={onClose}>
              Go to my library
            </Button>
            {isNote && (
              <Button to={readPath(slug)} variant="accent" icon={BookOpen} onClick={onClose}>
                Start reading
              </Button>
            )}
          </>
        }
      >
        <p className="flex items-center gap-2 rounded-xl bg-sage-50 px-4 py-3 text-sm font-medium text-sage-700">
          <Check size={16} aria-hidden="true" />
          Payment verified by our server.
        </p>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-700">
          <li className="flex gap-3">
            <BookOpen size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-ember-600" />
            Notes open in the Rankora reader and your place is saved, so you can pick up where you stopped.
          </li>
          <li className="flex gap-3">
            <Smartphone size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-ember-600" />
            Read on your phone or laptop with the same account.
          </li>
          <li className="flex gap-3">
            <ShieldCheck size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-ember-600" />
            Each page carries your name as a watermark, so please keep your account to yourself.
          </li>
        </ul>
      </Modal>
    )
  }

  if (!user) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Sign in to continue"
        description="Purchases are tied to your account so your notes stay in your library."
        footer={
          <Button variant="accent" disabled={loading} onClick={() => openAuth('login')}>
            Sign in or create an account
          </Button>
        }
      />
    )
  }

  const rows = [['Item', title], ...(itemCount ? [['Includes', `${itemCount} notes`]] : []), ...details, ['Price', formatPrice(quote.list)]]
  if (quote.discount > 0) rows.push([quote.discountLabel ?? 'Discount', `− ${formatPrice(quote.discount)}`])
  if (quote.credit > 0) rows.push(['Store credit', `− ${formatPrice(quote.credit)}`])

  return (
    <Modal
      open={open}
      onClose={phase === 'working' ? () => {} : onClose}
      title="Checkout"
      description="Review your order, then pay securely."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={phase === 'working'}>
            Cancel
          </Button>
          <Button variant="accent" onClick={pay} disabled={phase === 'working' || live.loading || live.status === 'checking'}>
            {phase === 'working' ? 'Processing…' : `Pay ${formatPrice(quote.total)}`}
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-line-soft rounded-xl border border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-ink-500">{label}</dt>
            <dd className="text-right text-sm font-semibold text-ink-900">{value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 bg-ivory-100 px-4 py-3.5">
          <dt className="text-sm font-semibold text-ink-900">Total</dt>
          <dd className="tabular font-display text-xl font-semibold text-ink-900">{formatPrice(quote.total)}</dd>
        </div>
      </dl>

      <OfferBox live={live} className="mt-4" />

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
          {error}
        </p>
      )}
      <p className="mt-4 flex gap-2 text-sm leading-relaxed text-ink-600">
        <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-500" />
        {sandbox
          ? 'Sandbox mode: this server has no payment gateway configured, so the payment is simulated.'
          : 'Payments are handled by Razorpay. Rankora never sees your card or UPI details.'}
      </p>
    </Modal>
  )
}
