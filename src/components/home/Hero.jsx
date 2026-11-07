import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Timer } from 'lucide-react'
import Badge, { SubjectBadge } from '../ui/Badge'
import Button from '../ui/Button'
import ProgressBar from '../ui/ProgressBar'
import { AtomArt, BulbArt, PencilArt, SparkleArt } from '../common/Clipart'
import { useDaysToExam } from '../../hooks/useDaysToExam'
import { useSampleLink } from '../../hooks/useSampleLink'
import { SITE } from '../../data/site'
import { ROUTES } from '../../utils/routes'
import { cn } from '../../utils/cn'

const HIGHLIGHTS = ['Physics, Chemistry, Maths', 'Class 11 and 12', 'Free sample', 'Instant access']

// An illustration of the reader: where a student is in a chapter plan.
const PLAN = [
  { name: 'Kinematics', state: 'done' },
  { name: 'Laws of Motion', state: 'now' },
  { name: 'Work, Energy and Power', state: 'next' },
]

const RULED =
  'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, color-mix(in srgb, var(--color-ink-900) 5%, transparent) 31px, color-mix(in srgb, var(--color-ink-900) 5%, transparent) 32px)'
const NOTE_RULED =
  'repeating-linear-gradient(to bottom, transparent 0, transparent 35px, color-mix(in srgb, var(--color-ink-500) 22%, transparent) 35px, color-mix(in srgb, var(--color-ink-500) 22%, transparent) 36px)'
const FADE = 'linear-gradient(to bottom, black, transparent 85%)'

export default function Hero() {
  const sampleTo = useSampleLink()
  const days = useDaysToExam()

  return (
    <section className="relative overflow-hidden border-b border-line-soft">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: RULED, maskImage: FADE, WebkitMaskImage: FADE }} />

      <AtomArt className="pointer-events-none absolute right-[2%] top-5 hidden size-24 animate-float-slow text-ink-400/70 xl:block" />
      <SparkleArt className="pointer-events-none absolute left-[47%] top-24 hidden size-6 animate-wiggle text-ember-400 lg:block" />
      <PencilArt className="pointer-events-none absolute bottom-6 left-[2%] hidden w-28 -rotate-12 animate-float text-ink-500 xl:block" />
      <BulbArt className="pointer-events-none absolute bottom-4 right-[11%] hidden w-14 animate-float-slow text-ink-500 xl:block" />

      <div className="page-container relative grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <div className="animate-rise mb-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-ember-500/30 bg-surface py-1.5 pl-1.5 pr-5 shadow-soft">
              <span className="grid h-8 place-items-center rounded-full bg-ember-500 px-3 font-mono text-xs font-bold tracking-[0.16em] text-white">IITD</span>
              <span className="text-sm font-semibold text-ink-900 sm:text-base">
                Made and used by an <span className="marker">IIT Delhi</span> student
              </span>
            </div>
            {days && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-50 px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-ember-700 ring-1 ring-ember-500/30">
                <Timer size={13} aria-hidden="true" />
                {days} days to {SITE.exam.name}
              </span>
            )}
          </div>

          <h1 className="animate-rise stagger text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl" style={{ '--d': '70ms' }}>
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
          <p className="animate-rise stagger mt-5 max-w-xl text-lg leading-relaxed text-ink-600 sm:text-xl" style={{ '--d': '150ms' }}>
            Cover an entire subject before JEE, one short chapter at a time. Nothing important left out.
          </p>

          <div className="animate-rise stagger mt-8 flex flex-wrap gap-3" style={{ '--d': '230ms' }}>
            <Button to={ROUTES.notes} variant="accent" size="lg" iconRight={ArrowRight}>
              Browse the notes
            </Button>
            <Button to={sampleTo} variant="outline" size="lg" icon={BookOpen}>
              See a free sample
            </Button>
          </div>

          <ul className="animate-rise stagger mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-ink-700" style={{ '--d': '310ms' }}>
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check size={16} aria-hidden="true" className="text-sage-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-5 lg:relative lg:block lg:h-[40rem] xl:h-[33rem]">
          <article
            className="hero-float relative rounded-2xl border border-line bg-surface p-5 pt-6 shadow-lift transition-[rotate] duration-500 hover:rotate-0 lg:absolute lg:left-0 lg:top-2 lg:w-[16.5rem] lg:-rotate-2 xl:w-[18.5rem]"
            style={{ '--d': '260ms', backgroundImage: NOTE_RULED, backgroundPositionY: '2.9rem' }}
          >
            <div className="flex items-center justify-between">
              <SubjectBadge subject="physics" />
              <Badge tone="ember">Sample page</Badge>
            </div>
            <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-500">Laws of Motion · Notes</p>
            <p className="mt-2 font-hand text-[1.5rem] leading-[36px] text-ink-800">Draw the free-body diagram. Then write the equation.</p>
            <p className="font-hand text-[1.5rem] leading-[36px] text-ember-600">Most lost marks are sign errors.</p>
            <Link to={sampleTo} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">
              Read a free sample
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </article>

          <article
            className="hero-float rounded-2xl border border-line bg-surface p-5 shadow-lift transition-[rotate] duration-500 hover:rotate-0 lg:absolute lg:bottom-0 lg:right-0 lg:z-10 lg:w-[16.5rem] lg:rotate-2 xl:w-[19rem]"
            style={{ '--d': '380ms' }}
          >
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <BookOpen size={16} aria-hidden="true" className="text-ember-600" />
                Continue reading
              </p>
              <Badge tone="sage">Preview</Badge>
            </div>
            <p className="mt-4 font-display text-lg font-semibold leading-snug">Laws of Motion</p>
            <ProgressBar value={7} max={14} size="sm" className="mt-3" />
            <p className="mt-1.5 text-xs text-ink-500">Page 7 of 14. Resumes where you left.</p>
            <ul className="mt-4 space-y-2">
              {PLAN.map(({ name, state }) => (
                <li
                  key={name}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
                    state === 'now' ? 'border-ember-500/50 bg-ember-50 font-medium text-ink-900' : 'border-line-soft text-ink-600',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full text-white',
                      state === 'done' ? 'bg-sage-500' : state === 'now' ? 'bg-ember-500' : 'border border-line bg-transparent',
                    )}
                  >
                    {state === 'done' && <Check size={12} aria-hidden="true" />}
                  </span>
                  {name}
                  <span className="ml-auto font-mono text-[0.65rem] uppercase tracking-wide text-ink-400">
                    {state === 'done' ? 'Done' : state === 'now' ? 'Reading' : 'Next'}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  )
}
