import { ArrowRight, Check } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import { PLANS } from '../../data/plans'
import { formatPrice } from '../../utils/format'
import { ROUTES } from '../../utils/routes'
import { cn } from '../../utils/cn'

export default function PlanCards({ billing, isPremium, onUpgrade }) {
  const [free, premium] = PLANS
  const yearly = billing === 'yearly'
  const price = yearly ? premium.price.yearly : premium.price.monthly
  const perMonth = Math.round(premium.price.yearly / 12)
  const savings = premium.price.monthly * 12 - premium.price.yearly

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <Reveal className="h-full">
        <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-7 shadow-soft sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">{free.name}</h2>
            
          </div>
          <p className="mt-2 leading-relaxed text-ink-600">{free.blurb}</p>
          <p className="mt-6 font-display text-5xl font-semibold">Per note</p>
          <p className="mt-1 text-sm text-ink-500">Prices are shown on each note</p>
          <ul className="mt-7 space-y-3">
            {free.highlights.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-600" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            {isPremium ? (
              <Button to={ROUTES.account} variant="outline" size="lg" className="w-full">
                View my account
              </Button>
            ) : (
              <Button to={ROUTES.notes} variant="outline" size="lg" className="w-full">
                {free.cta}
              </Button>
            )}
          </div>
        </div>
      </Reveal>

      <Reveal delay={100} className="h-full">
        <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-night p-7 text-white shadow-lift sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-white">{premium.name}</h2>
            {isPremium && (
              <Badge tone="sage" icon={Check}>
                Active
              </Badge>
            )}
          </div>
          <p className="mt-2 leading-relaxed text-white/70">{premium.blurb}</p>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="tabular font-display text-5xl font-semibold">{formatPrice(price)}</span>
            <span className="text-sm text-white/70">{yearly ? 'per year' : 'per month'}</span>
          </p>
          <p className="mt-1 min-h-5 text-sm text-white/70">
            {yearly
              ? `About ${formatPrice(perMonth)} a month${savings > 0 ? `, saving ${formatPrice(savings)} a year` : ''}`
              : 'Billed once for 30 days, no auto-renewal'}
          </p>
          <ul className="mt-7 space-y-3">
            {premium.highlights.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed">
                <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-ember-400" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            {isPremium ? (
              <Button to={ROUTES.library} variant="accent" size="lg" className="w-full" iconRight={ArrowRight}>
                Open my library
              </Button>
            ) : (
              <Button variant="accent" size="lg" className={cn('w-full')} iconRight={ArrowRight} onClick={onUpgrade}>
                {premium.cta}
              </Button>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  )
}