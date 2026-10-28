import { useEffect, useState } from 'react'
import { Check, Info } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../lib/api'
import { loadRazorpay } from '../../lib/razorpay'
import { formatPrice } from '../../utils/format'
import { ROUTES } from '../../utils/routes'

// Buys one product (a note or a Premium plan) by slug. The price shown is fetched from the
// server and the server prices the order again, so nothing here can change what is charged.
export default function CheckoutModal({ open, onClose, slug, title, fallbackAmount, details = [] }) {
  const { user, loading, openAuth, refresh } = useAuth()
  const [amount, setAmount] = useState(fallbackAmount)
  const [phase, setPhase] = useState('idle') // idle | working | done
  const [error, setError] = useState('')
  const [sandbox, setSandbox] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    let active = true
    api(`/products/${encodeURIComponent(slug)}`)
      .then((json) => active && setAmount(json.data.price))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [open, slug])

  const pay = async () => {
    setPhase('working')
    setError('')
    try {
      const { order, checkout } = (await api('/orders', { method: 'POST', body: { product: slug } })).data
      setSandbox(checkout.provider === 'mock')
      const proof =
        checkout.provider === 'mock'
          ? (await api('/payments/mock/complete', { method: 'POST', body: { orderId: order.id } })).data
          : await loadRazorpay().then((Razorpay) => openRazorpay(Razorpay, checkout, title))
      await api('/payments/verify', { method: 'POST', body: { orderId: order.id, ...proof } })
      await refresh()
      setPhase('done')
    } catch (err) {
      setPhase('idle')
      if (err.code === 'DISMISSED') return
      if (err.code === 'CONFLICT') await refresh()
      setError(err.message)
    }
  }

  if (phase === 'done') {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Payment successful"
        description={`${title} is now unlocked on your account.`}
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button to={ROUTES.account} variant="accent" onClick={onClose}>
              Go to my library
            </Button>
          </>
        }
      >
        <p className="flex items-center gap-2 rounded-xl bg-sage-50 px-4 py-3 text-sm font-medium text-sage-700">
          <Check size={16} aria-hidden="true" />
          Verified by the server. You can download it any time from your account.
        </p>
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
          <Button variant="accent" onClick={pay} disabled={phase === 'working'}>
            {phase === 'working' ? 'Processing…' : `Pay ${formatPrice(amount)}`}
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-line-soft rounded-xl border border-line">
        {[['Item', title], ...details, ['Total', formatPrice(amount)]].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-ink-500">{label}</dt>
            <dd className="text-right text-sm font-semibold text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>
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

function openRazorpay(Razorpay, checkout, title) {
  return new Promise((resolve, reject) => {
    const instance = new Razorpay({
      key: checkout.key,
      amount: checkout.amountPaise,
      currency: checkout.currency,
      order_id: checkout.providerOrderId,
      name: 'Rankora',
      description: title,
      prefill: checkout.prefill,
      theme: { color: '#c2571a' },
      handler: (response) =>
        resolve({ razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }),
      modal: { ondismiss: () => reject(Object.assign(new Error('Payment cancelled'), { code: 'DISMISSED' })) },
    })
    instance.on('payment.failed', (response) =>
      reject(new Error(response.error?.description || 'Payment failed. You have not been charged.')),
    )
    instance.open()
  })
}
