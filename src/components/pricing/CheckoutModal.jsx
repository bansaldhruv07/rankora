import { useState } from 'react'
import { Check, Info } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { CHECKOUT_NOTE, PLANS } from '../../data/plans'
import { formatPrice } from '../../utils/format'
import { explorePath } from '../../utils/routes'

export default function CheckoutModal({ open, onClose, billing, onConfirm }) {
  const [done, setDone] = useState(false)
  const premium = PLANS.find((plan) => plan.id === 'premium')
  const yearly = billing === 'yearly'
  const amount = yearly ? premium.price.yearly : premium.price.monthly

  const confirm = () => {
    onConfirm()
    setDone(true)
  }

  if (done) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Premium is active on this device"
        description="Every Premium resource and mock test is now unlocked here. Nothing was charged and no account was created."
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button to={explorePath({ price: 'premium' })} variant="accent" onClick={onClose}>
              Browse Premium resources
            </Button>
          </>
        }
      >
        <p className="flex items-center gap-2 rounded-xl bg-sage-50 px-4 py-3 text-sm font-medium text-sage-700">
          <Check size={16} aria-hidden="true" />
          You can switch back to Free from the pricing page at any time.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Demo checkout"
      description="Review the plan below. This is a walkthrough of the upgrade flow only."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={confirm}>
            Unlock Premium (demo)
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-line-soft rounded-xl border border-line">
        {[
          ['Plan', 'Premium'],
          ['Billing', yearly ? 'Yearly' : 'Monthly'],
          ['Demo price', `${formatPrice(amount)} ${yearly ? 'per year' : 'per month'}`],
          ['Amount charged today', '₹0, nothing is collected'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-ink-500">{label}</dt>
            <dd className="text-right text-sm font-semibold text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 flex gap-2 text-sm leading-relaxed text-ink-600">
        <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-500" />
        {CHECKOUT_NOTE} No card, UPI or personal details are requested.
      </p>
    </Modal>
  )
}