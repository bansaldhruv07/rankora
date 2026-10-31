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
import { CHECKOUT_NOTE, PLANS } from '../data/plans'

export default function Pricing() {
  const { isPremium } = usePlan()
  const [billing, setBilling] = useState('yearly')
  const [checkout, setCheckout] = useState({ open: false, key: 0 })

  const openCheckout = () => setCheckout((prev) => ({ open: true, key: prev.key + 1 }))
  const closeCheckout = () => setCheckout((prev) => ({ ...prev, open: false }))

  const premium = PLANS.find((plan) => plan.id === 'premium')
  const yearly = billing === 'yearly'

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Pay per note, or read everything in Premium"
        description="Buy a single note or a bundle and keep it, or take Premium to read every note that is included in it for the period you choose."
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
        <PlanCards billing={billing} isPremium={isPremium} onUpgrade={openCheckout} />
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-ink-500">{CHECKOUT_NOTE}</p>
      </section>

      <section className="page-container pb-16 sm:pb-20">
        <Reveal>
          <SectionHeading
            eyebrow="Compare"
            title="Pay per note or Premium"
            description="Both use the same reader. The difference is how you get access."
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
        slug={yearly ? 'premium-yearly' : 'premium-monthly'}
        title={yearly ? 'Rankora Premium (Yearly)' : 'Rankora Premium (Monthly)'}
        fallbackAmount={yearly ? premium.price.yearly : premium.price.monthly}
        details={[['Access', yearly ? '365 days' : '30 days']]}
      />
    </>
  )
}