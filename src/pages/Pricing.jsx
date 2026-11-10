import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Crown, Layers } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import FaqSection from '../components/home/FaqSection'
import Button from '../components/ui/Button'
import Reveal from '../components/ui/Reveal'
import { useApi } from '../hooks/useApi'
import { formatPrice } from '../utils/format'
import { ROUTES, notePath } from '../utils/routes'
import { cn } from '../utils/cn'

const SUBJECT_PACK = /^(physics|chemistry|mathematics)-complete$/
const ALL_PACK = 'jee-complete-pcm'
const SUBJECT_NAME = { physics: 'Physics', chemistry: 'Chemistry', mathematics: 'Mathematics' }

function Bullets({ items, dark }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed">
          <Check size={18} aria-hidden="true" className={cn('mt-0.5 shrink-0', dark ? 'text-ember-400' : 'text-sage-600')} />
          {item}
        </li>
      ))}
    </ul>
  )
}

// Prices are read live from the catalogue, so this page can never disagree with what checkout charges.
// A pack that is not on sale yet simply does not appear.
export default function Pricing() {
  const { data: bundles } = useApi('/products?kind=bundle&limit=20')
  const { data: cheapest } = useApi('/products?limit=1&sort=price-asc')

  const subjectPacks = (bundles ?? []).filter((b) => SUBJECT_PACK.test(b.slug)).sort((a, b) => a.price - b.price)
  const allPack = (bundles ?? []).find((b) => b.slug === ALL_PACK)
  const fromPrice = cheapest?.[0]?.price

  return (
    <>
      <PageHeader eyebrow="Pricing" title="Pay only for what you need" description="One chapter, a whole subject, or all three. Pay once, keep it, read on any device." />

      <section className="page-container py-12 sm:py-14">
        <div className={cn('mx-auto grid max-w-6xl gap-6', 1 + (subjectPacks.length ? 1 : 0) + (allPack ? 1 : 0) >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
          <Reveal className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-7 shadow-soft sm:p-8">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ivory-200 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-ink-700">
                <BookOpen size={13} aria-hidden="true" />
                One chapter
              </span>
              <p className="mt-5 font-display text-5xl font-semibold">{fromPrice != null ? `From ${formatPrice(fromPrice)}` : 'Per chapter'}</p>
              <p className="mt-2 text-ink-600">Weak in one chapter? Buy just that note.</p>
              <Bullets items={['Free sample on notes that offer one', 'Buy once and keep it', 'Add several notes to your cart and pay once']} />
              <div className="mt-auto pt-8">
                <Button to={ROUTES.notes} variant="outline" size="lg" className="w-full" iconRight={ArrowRight}>
                  Browse the notes
                </Button>
              </div>
            </div>
          </Reveal>

          {subjectPacks.length > 0 && (
            <Reveal delay={100} className="h-full">
              <div className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-night p-7 text-white shadow-lift sm:p-8">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-500 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-white">
                  <Layers size={13} aria-hidden="true" />
                  Complete subject
                </span>
                <p className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-5xl font-semibold">{formatPrice(subjectPacks[0].price)}</span>
                  {subjectPacks[0].savings && <s className="text-lg text-white/50">{formatPrice(subjectPacks[0].savings.referencePrice)}</s>}
                </p>
                <p className="mt-2 text-white/70">Every chapter of one subject, Class 11 and 12.</p>
                <Bullets dark items={['The whole subject revised before JEE', 'Far cheaper than buying chapters one by one', 'New chapters added to the pack unlock automatically']} />
                <ul className="mt-6 space-y-2">
                  {subjectPacks.map((pack) => (
                    <li key={pack.id}>
                      <Link to={notePath(pack.slug)} className="group flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 transition hover:border-ember-400 hover:bg-white/5">
                        <span className="font-semibold">{SUBJECT_NAME[pack.subject] ?? pack.title}</span>
                        <span className="flex items-center gap-2 text-sm text-white/80">
                          {formatPrice(pack.price)}
                          <ArrowRight size={15} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}

          {allPack && (
            <Reveal delay={200} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border-2 border-ember-500 bg-surface p-7 shadow-lift sm:p-8">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-50 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-ember-700">
                  <Crown size={13} aria-hidden="true" />
                  Best value
                </span>
                <p className="mt-5 flex items-baseline gap-3">
                  <span className="font-display text-5xl font-semibold">{formatPrice(allPack.price)}</span>
                  {allPack.savings && <s className="text-lg text-ink-400">{formatPrice(allPack.savings.referencePrice)}</s>}
                </p>
                <p className="mt-2 text-ink-600">Physics, Chemistry and Mathematics together.</p>
                <Bullets items={['The full JEE syllabus in one pack', allPack.savings ? `Save ${formatPrice(allPack.savings.amount)} on the list price` : 'Lowest price per chapter', 'New chapters unlock automatically']} />
                <div className="mt-auto pt-8">
                  <Button to={notePath(allPack.slug)} variant="accent" size="lg" className="w-full" iconRight={ArrowRight}>
                    Get all three subjects
                  </Button>
                </div>
              </div>
            </Reveal>
          )}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-ink-500">
          You need an account to purchase. Payments are processed by Razorpay (UPI, cards and netbanking), and access starts as soon as the payment is verified.
        </p>
      </section>

      <FaqSection />
    </>
  )
}
