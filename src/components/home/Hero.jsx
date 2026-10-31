import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import Badge, { DifficultyBadge, SubjectBadge } from '../ui/Badge'
import Button from '../ui/Button'
import { AtomArt, BulbArt, PencilArt, SparkleArt } from '../common/Clipart'
import { ROUTES } from '../../utils/routes'
import { cn } from '../../utils/cn'

const HIGHLIGHTS = ['Written by IIT Delhi students', 'Chapter-wise notes', 'Formula boxes', 'Free samples', 'Read on any device']

// What the two floating cards show. They illustrate the style of the notes.
const NOTE = {
  subject: 'physics',
  chapter: 'Kinematics',
  kind: 'Short notes',
  heading: 'Equations of uniform acceleration',
  formulas: [
    { label: 'Velocity–time', expr: 'v = u + at' },
    { label: 'Displacement', expr: 's = ut + ½at²' },
    { label: 'Velocity–displacement', expr: 'v² = u² + 2as' },
  ],
}
const QUESTION = {
  subject: 'physics',
  difficulty: 'Easy',
  text: 'A ball is thrown vertically upwards with a speed of 20 m/s. Taking g = 10 m/s², the maximum height reached is:',
  options: ['10 m', '20 m', '30 m', '40 m'],
  answer: 1,
  solution: 'At the top v = 0, so H = u²/(2g) = 400/20 = 20 m.',
}
const RULED =
  'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, color-mix(in srgb, var(--color-ink-900) 5%, transparent) 31px, color-mix(in srgb, var(--color-ink-900) 5%, transparent) 32px)'
const FADE = 'linear-gradient(to bottom, black, transparent 85%)'

export default function Hero() {
  const note = NOTE
  const question = QUESTION

  return (
    <section className="relative overflow-hidden border-b border-line-soft">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: RULED, maskImage: FADE, WebkitMaskImage: FADE }}
      />

      <AtomArt className="pointer-events-none absolute right-[2%] top-5 hidden size-24 animate-float-slow text-ink-400/70 xl:block" />
      <SparkleArt className="pointer-events-none absolute left-[47%] top-24 hidden size-6 animate-wiggle text-ember-400 lg:block" />
      <SparkleArt className="pointer-events-none absolute bottom-24 left-[52%] hidden size-4 animate-wiggle text-sage-500 lg:block" />
      <PencilArt className="pointer-events-none absolute bottom-6 left-[2%] hidden w-32 -rotate-12 animate-float text-ink-500 lg:block" />
      <BulbArt className="pointer-events-none absolute bottom-4 right-[11%] hidden w-14 animate-float-slow text-ink-500 xl:block" />

      <div className="page-container relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
        <div>
          <p className="animate-rise mb-6 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.2em] text-ember-600">
            <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
            JEE preparation
          </p>
          <div className="animate-rise stagger mb-7 inline-flex items-center gap-3 rounded-full border border-ember-500/30 bg-surface py-1.5 pl-1.5 pr-5 shadow-soft" style={{ '--d': '30ms' }}>
            <span className="grid h-9 place-items-center rounded-full bg-ember-500 px-3.5 font-mono text-xs font-bold tracking-[0.16em] text-white">IITD</span>
            <span className="text-sm font-semibold text-ink-900 sm:text-base">
              Notes written by <span className="marker">IIT Delhi</span> students
            </span>
          </div>
          <h1
            className="animate-rise stagger text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl"
            style={{ '--d': '70ms' }}
          >
            Revision,{' '}
            <span className="relative whitespace-nowrap text-ember-600">
              <span className="relative">edited</span>
              <span
                aria-hidden="true"
                className="animate-grow-x stagger absolute inset-x-0 bottom-1 h-[0.16em] origin-left rounded-full bg-ember-200"
                style={{ '--d': '750ms' }}
              />
            </span>{' '}
            for focus.
          </h1>
          <p
            className="animate-rise stagger mt-6 max-w-xl text-lg leading-relaxed text-ink-600 sm:text-xl"
            style={{ '--d': '150ms' }}
          >
            Handwritten, chapter-wise JEE notes by <strong className="marker font-semibold text-ink-900">IIT Delhi</strong> students: concise,
            formula-first and made to revise from. Read them on your phone or laptop, and pick up exactly where you stopped.
          </p>

          <div className="animate-rise stagger mt-9 flex flex-wrap gap-3" style={{ '--d': '230ms' }}>
            <Button to={ROUTES.notes} variant="accent" size="lg" iconRight={ArrowRight}>
              Browse the notes
            </Button>
            <Button to={ROUTES.pricing} variant="outline" size="lg">
              See pricing
            </Button>
          </div>

          <ul
            className="animate-rise stagger mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-700"
            style={{ '--d': '310ms' }}
          >
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check size={16} aria-hidden="true" className="text-sage-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-5 lg:relative lg:block lg:h-[30rem]">
          <article
            className="hero-float rounded-2xl border border-line bg-surface p-5 shadow-lift transition-[rotate] duration-500 hover:rotate-0 lg:absolute lg:left-0 lg:top-2 lg:w-[19.5rem] lg:-rotate-2"
            style={{ '--d': '260ms' }}
          >
            <div className="flex items-center justify-between">
              <SubjectBadge subject={note.subject} />
              <Badge tone="ember">Sample</Badge>
            </div>
            <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-400">
              {note.chapter} · {note.kind}
            </p>
            <p className="mt-1 font-display text-xl font-semibold leading-snug">{note.heading}</p>
            <dl className="mt-4 divide-y divide-line-soft rounded-xl border border-line-soft bg-ivory-50">
              {note.formulas.map((formula) => (
                <div key={formula.label} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                  <dt className="text-xs text-ink-500">{formula.label}</dt>
                  <dd className="font-mono text-sm font-medium text-ink-900">{formula.expr}</dd>
                </div>
              ))}
            </dl>
            <Link
              to={ROUTES.notes}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ember-600 underline-offset-4 hover:underline"
            >
              Browse the notes
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </article>

          <article
            className="hero-float rounded-2xl border border-line bg-surface p-5 shadow-lift transition-[rotate] duration-500 hover:rotate-0 lg:absolute lg:bottom-0 lg:right-0 lg:z-10 lg:w-[20rem] lg:rotate-2"
            style={{ '--d': '380ms' }}
          >
            <div className="flex items-center justify-between">
              <SubjectBadge subject={question.subject} />
              <DifficultyBadge level={question.difficulty} />
            </div>
            <p className="mt-4 text-[0.95rem] font-medium leading-relaxed text-ink-900">{question.text}</p>
            <ul className="mt-4 space-y-2">
              {question.options.map((option, index) => {
                const correct = index === question.answer
                return (
                  <li
                    key={option}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
                      correct
                        ? 'border-sage-500 bg-sage-50 font-medium text-sage-700'
                        : 'border-line-soft text-ink-600',
                    )}
                  >
                    <span className="font-mono text-xs">{'ABCD'[index]}</span>
                    {option}
                    {correct && <Check size={16} aria-hidden="true" className="ml-auto" />}
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">Reviewed solution: {question.solution}</p>
          </article>
        </div>
      </div>
    </section>
  )
}