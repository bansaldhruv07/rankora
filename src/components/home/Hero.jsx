import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpen, Check, Timer } from 'lucide-react'
import AddToCartButton from '../cart/AddToCartButton'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { useDaysToExam } from '../../hooks/useDaysToExam'
import { useSampleLink } from '../../hooks/useSampleLink'
import { SITE, isLink } from '../../data/site'
import { ROUTES, notePath } from '../../utils/routes'
import { cn } from '../../utils/cn'
import { formatPrice } from '../../utils/format'
import { AtomArt, BulbArt, PencilArt, SparkleArt } from '../common/Clipart'

const HIGHLIGHTS = ['Physics, Chemistry, Maths', 'Class 11, 12 & JEE droppers', 'Free sample', 'Instant access']

// The three complete-subject packs, shown as their posters. Left to right: Physics, Chemistry, Maths.
const POSTERS = [
  { slug: 'physics-complete', image: '/bundles/physics.webp', alt: 'Complete Physics: short handwritten notes, Class 11 and 12', place: 'left-0 -rotate-6 hover:-rotate-2', delay: 260 },
  { slug: 'chemistry-complete', image: '/bundles/chemistry.webp', alt: 'Complete Chemistry: short handwritten notes, Class 11 and 12', place: 'left-[31.5%] z-10 scale-[1.08] hover:scale-[1.14]', delay: 380 },
  { slug: 'mathematics-complete', image: '/bundles/mathematics.webp', alt: 'Complete Maths: short handwritten notes, Class 11 and 12', place: 'right-0 rotate-6 hover:rotate-2', delay: 320 },
]

const RULED =
  'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, color-mix(in srgb, var(--color-ink-900) 5%, transparent) 31px, color-mix(in srgb, var(--color-ink-900) 5%, transparent) 32px)'
const FADE = 'linear-gradient(to bottom, black, transparent 85%)'

const initials = (name) => name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()

// A round founder photo that opens their LinkedIn. Falls back to initials until the photo file exists.
function FounderDot({ founder, className }) {
  const [failed, setFailed] = useState(false)
  const frame = 'size-9 rounded-full ring-2 ring-surface transition duration-300 group-hover/dot:z-10 group-hover/dot:scale-110'
  const face =
    founder.photo && !failed ? (
      <img src={founder.photo} alt="" width="36" height="36" onError={() => setFailed(true)} className={cn(frame, 'object-cover object-top')} />
    ) : (
      <span className={cn(frame, 'grid place-items-center bg-ember-50 font-mono text-[0.7rem] font-bold text-ember-700')}>{initials(founder.name)}</span>
    )
  if (!isLink(founder.linkedin)) return <span className={cn('relative', className)}>{face}</span>
  return (
    <a
      href={founder.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${founder.name} on LinkedIn`}
      title={founder.name}
      className={cn('group/dot relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500', className)}
    >
      {face}
    </a>
  )
}

// "Made and used by IIT Delhi student", with the founders' photos and a way through to LinkedIn.
function FounderPill() {
  const founders = SITE.founders
  // The line credits the IIT Delhi student, so the arrow goes to her profile.
  const maker = founders.find((f) => f.college === 'iitd' && isLink(f.linkedin))
  return (
    <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-ember-500/30 bg-surface py-1 pl-1 pr-1 shadow-soft">
      <span className="flex shrink-0 -space-x-2.5">
        {founders.map((founder) => (
          <FounderDot key={founder.id} founder={founder} />
        ))}
      </span>
      <span className="min-w-0 text-sm font-semibold leading-tight text-ink-900">
        Made and used by <span className="marker">IIT Delhi</span> student
      </span>
      {maker && (
        <a
          href={maker.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${maker.name} on LinkedIn`}
          className="group grid size-9 shrink-0 place-items-center rounded-full bg-ember-500 text-white transition hover:brightness-110"
        >
          <ArrowUpRight size={17} aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      )}
    </div>
  )
}

// Always shown over the bottom of a poster: the price and Add to cart.
function PosterBuy({ bundle }) {
  const { access } = useAuth()
  const owned = access.productSlugs.includes(bundle.slug)
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-1.5 pt-8 sm:gap-1.5 sm:p-2.5 sm:pt-10">
      <p className="flex flex-wrap items-baseline gap-x-2 text-white">
        <span className="tabular font-display text-sm font-semibold leading-none sm:text-lg">{formatPrice(bundle.price)}</span>
        {bundle.savings && (
          <>
            <s className="tabular hidden text-xs text-white/60 sm:inline">{formatPrice(bundle.savings.referencePrice)}</s>
            <span className="hidden rounded-full bg-sage-500 px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-white sm:inline">Save {bundle.savings.percent}%</span>
          </>
        )}
      </p>
      {owned ? (
        <Button to={ROUTES.library} size="sm" variant="soft" className="w-full">
          In your library
        </Button>
      ) : (
        <AddToCartButton slug={bundle.slug} size="sm" variant="accent" className="w-full gap-1 px-1 text-xs sm:gap-2 sm:px-4 sm:text-sm" />
      )}
    </div>
  )
}

// The three subject packs as a fanned stack of posters. Each opens its pack and carries its price and Add to cart.
function PosterFan({ bySlug }) {
  return (
    <div className="relative mx-auto aspect-[1/0.64] w-full max-w-md lg:max-w-none">
      {POSTERS.map((poster) => {
        const bundle = bySlug.get(poster.slug)
        return (
          <div
            key={poster.slug}
            className={cn(
              'hero-float group absolute top-1/2 w-[37%] -translate-y-1/2 overflow-hidden rounded-xl border border-line bg-ivory-200 shadow-lift transition-[rotate,scale,box-shadow] duration-500 hover:z-20 focus-within:z-20 hover:shadow-[0_24px_50px_-12px_rgba(11,20,36,0.45)]',
              poster.place,
            )}
            style={{ '--d': `${poster.delay}ms` }}
          >
            <Link to={bundle ? notePath(poster.slug) : ROUTES.notes} aria-label={bundle ? `${bundle.title}: see what is inside` : poster.alt} className="block">
              <img src={poster.image} alt={poster.alt} width="900" height="1125" fetchPriority="high" className="block aspect-[4/5] w-full object-cover" />
            </Link>
            {bundle && <PosterBuy bundle={bundle} />}
          </div>
        )
      })}
    </div>
  )
}

export default function Hero() {
  const sampleTo = useSampleLink()
  const days = useDaysToExam()
  const { data: bundles } = useApi('/products?kind=bundle&limit=20')
  const bySlug = new Map((bundles ?? []).map((bundle) => [bundle.slug, bundle]))

  return (
    <section className="relative overflow-hidden border-b border-line-soft">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: RULED, maskImage: FADE, WebkitMaskImage: FADE }} />

      <AtomArt className="pointer-events-none absolute right-[2%] top-5 hidden size-24 animate-float-slow text-ink-400/70 xl:block" />
      <SparkleArt className="pointer-events-none absolute left-[47%] top-24 hidden size-6 animate-wiggle text-ember-400 lg:block" />
      <PencilArt className="pointer-events-none absolute bottom-6 left-[2%] hidden w-28 -rotate-12 animate-float text-ink-500 xl:block" />
      <BulbArt className="pointer-events-none absolute bottom-4 right-[11%] hidden w-14 animate-float-slow text-ink-500 xl:block" />

      <div className="page-container relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <div className="animate-rise mb-4 flex flex-wrap items-center gap-3">
            <FounderPill />
            {days && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-50 px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-ember-700 ring-1 ring-ember-500/30">
                <Timer size={13} aria-hidden="true" />
                {days} days to {SITE.exam.name}
              </span>
            )}
          </div>

          <h1 className="animate-rise stagger text-5xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl" style={{ '--d': '70ms' }}>
            Revise a chapter in{' '}
            <span className="relative whitespace-nowrap text-ember-600">
              <span className="relative">minutes.</span>
              <span
                aria-hidden="true"
                className="animate-grow-x stagger absolute inset-x-0 bottom-1 h-[0.16em] origin-left rounded-full bg-ember-200"
                style={{ '--d': '750ms' }}
              />
            </span>
          </h1>
          <p className="animate-rise stagger mt-4 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg" style={{ '--d': '150ms' }}>
            Cover an entire subject before JEE, one short chapter at a time. Nothing important left out.
          </p>

          <div className="animate-rise stagger mt-6 flex flex-wrap gap-3" style={{ '--d': '230ms' }}>
            <Button to={ROUTES.notes} variant="accent" size="md" iconRight={ArrowRight}>
              Browse the notes
            </Button>
            <Button to={sampleTo} variant="outline" size="md" icon={BookOpen}>
              See a free sample
            </Button>
          </div>

          <ul className="animate-rise stagger mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[0.82rem] text-ink-700" style={{ '--d': '310ms' }}>
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check size={14} aria-hidden="true" className="text-sage-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <PosterFan bySlug={bySlug} />
        </div>
      </div>
    </section>
  )
}
