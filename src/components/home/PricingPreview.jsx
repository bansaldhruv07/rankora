import { ArrowRight, Check } from 'lucide-react'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { CHECKOUT_NOTE, PLANS } from '../../data/plans'
import { formatPrice } from '../../utils/format'
import { ROUTES } from '../../utils/routes'
import { cn } from '../../utils/cn'

export default function PricingPreview() {
  return (
    <section className="page-container py-20 sm:py-24">
      <Reveal>
        <SectionHeading
          align="center"
          eyebrow="Pricing"
          title="Buy the notes you need, or read everything in Premium"
          description="Pay once for a single note or a bundle, or choose Premium for every note that is included in it."
        />
      </Reveal>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {PLANS.map((plan, index) => {
          const premium = plan.id === 'premium'
          return (
            <Reveal key={plan.id} delay={index * 100} className="h-full">
              <div className={cn('flex h-full flex-col rounded-2xl border p-7 sm:p-8', premium ? 'border-white/10 bg-night text-white shadow-lift' : 'border-line bg-surface shadow-soft')}>
                <h3 className={cn('text-2xl font-semibold', premium && 'text-white')}>{plan.name}</h3>
                <p className={cn('mt-2 leading-relaxed', premium ? 'text-white/70' : 'text-ink-600')}>{plan.blurb}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-semibold">{premium ? formatPrice(plan.price.monthly) : 'Per note'}</span>
                  {premium && <span className="text-sm text-white/70">for 30 days</span>}
                </p>
                <p className={cn('mt-1 text-sm', premium ? 'text-white/70' : 'text-ink-500')}>
                  {premium ? `or ${formatPrice(plan.price.yearly)} for a year` : 'Prices are shown on each note'}
                </p>
                <ul className="mt-7 space-y-3">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <Check size={18} aria-hidden="true" className={cn('mt-0.5 shrink-0', premium ? 'text-ember-400' : 'text-sage-600')} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  {premium ? (
                    <Button to={ROUTES.pricing} variant="accent" size="lg" className="w-full" iconRight={ArrowRight}>
                      {plan.cta}
                    </Button>
                  ) : (
                    <Button to={ROUTES.notes} variant="outline" size="lg" className="w-full">
                      {plan.cta}
                    </Button>
                  )}
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-ink-500">{CHECKOUT_NOTE}</p>
    </section>
  )
}
