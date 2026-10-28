import { useState } from 'react'
import PageHeader from '../components/common/PageHeader'
import FaqSection from '../components/home/FaqSection'
import CheckoutModal from '../components/pricing/CheckoutModal'
import ComparisonTable from '../components/pricing/ComparisonTable'
import PlanCards from '../components/pricing/PlanCards'
import Chip from '../components/ui/Chip'
import Reveal from '../components/ui/Reveal'
import SectionHeading from '../components/ui/SectionHeading'
import { usePlan } from '../hooks/usePlan'
import { useToast } from '../hooks/useToast'
import { CHECKOUT_NOTE } from '../data/plans'

export default function Pricing() {
  const toast = useToast()
  const { isPremium, setPlan } = usePlan()
  const [billing, setBilling] = useState('yearly')
  const [checkout, setCheckout] = useState({ open: false, key: 0 })

  const openCheckout = () => setCheckout((prev) => ({ open: true, key: prev.key + 1 }))
  const closeCheckout = () => setCheckout((prev) => ({ ...prev, open: false }))

  const confirmUpgrade = () => {
    setPlan('premium')
    toast({ title: 'Premium unlocked on this device', description: 'Demo mode, nothing was charged.' })
  }

  const downgrade = () => {
    setPlan('free')
    toast({ title: 'Switched back to Free', description: 'Premium items are locked again.', tone: 'info' })
  }

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Start free. Upgrade for the full set."
        description="Free gives you real notes, practice and a full mock. Premium unlocks every chapter set, formula sheet and mock test."
      >
        <div className="flex gap-2" role="group" aria-label="Billing period">
          <Chip active={billing === 'monthly'} onClick={() => setBilling('monthly')}>
            Monthly
          </Chip>
          <Chip active={billing === 'yearly'} onClick={() => setBilling('yearly')}>
            Yearly
          </Chip>
        </div>
      </PageHeader>

      <section className="page-container py-12 sm:py-16">
        <PlanCards billing={billing} isPremium={isPremium} onUpgrade={openCheckout} onDowngrade={downgrade} />
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-ink-500">{CHECKOUT_NOTE}</p>
      </section>

      <section className="page-container pb-16 sm:pb-20">
        <Reveal>
          <SectionHeading
            eyebrow="Compare"
            title="What is in each plan"
            description="Everything in Free stays free. Premium adds the complete set."
          />
        </Reveal>
        <Reveal delay={100} className="mt-8">
          <ComparisonTable />
        </Reveal>
      </section>

      <FaqSection />

      <CheckoutModal
        key={checkout.key}
        open={checkout.open}
        onClose={closeCheckout}
        billing={billing}
        onConfirm={confirmUpgrade}
      />
    </>
  )
}