import { ArrowRight, Check } from 'lucide-react'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import { CapArt, NotebookArt, PencilArt, SparkleArt } from '../common/Clipart'
import CollegeBadge from '../common/CollegeBadge'
import { ROUTES } from '../../utils/routes'

const POINTS = [
  'Written by IIT Delhi and DTU students who have been through JEE themselves',
  'Short, handwritten style: formulas boxed, traps marked, nothing padded',
  'Built chapter by chapter for Class 11 and Class 12',
  'Made to be revised from, not just read once',
]

export default function Authors() {
  return (
    <section className="page-container py-20 sm:py-24">
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1fr]">
        <Reveal>
          <p className="mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ember-600">
            <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
            Why these notes
          </p>
          <h2 className="text-4xl font-semibold leading-tight sm:text-5xl">Notes from people who have been where you are going.</h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
            Most study material is written to be complete. These notes are written to be useful. The authors are students from IIT Delhi and DTU who remember what
            they actually revised from, so you get the version that helps, not the version that is longest.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <CollegeBadge college="iitd" label />
            <span aria-hidden="true" className="text-ink-400">×</span>
            <CollegeBadge college="dtu" label />
          </div>
          <ul className="mt-7 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 leading-relaxed text-ink-700">
                <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-sage-600" />
                {point}
              </li>
            ))}
          </ul>
          <Button to={ROUTES.notes} variant="primary" size="lg" className="mt-9" iconRight={ArrowRight}>
            See the notes
          </Button>
        </Reveal>

        <Reveal delay={120}>
          <figure className="relative mx-auto max-w-md">
            <NotebookArt className="pointer-events-none absolute -left-10 -top-8 hidden w-24 -rotate-12 animate-float-slow text-ink-600 sm:block" />
            <CapArt className="pointer-events-none absolute -right-8 -top-10 hidden w-24 rotate-6 animate-float text-ink-700 sm:block" />
            <PencilArt className="pointer-events-none absolute -bottom-2 -right-6 hidden w-32 rotate-[-18deg] animate-float-slow text-ink-500 sm:block" />
            <SparkleArt className="pointer-events-none absolute -left-4 bottom-10 size-6 animate-wiggle text-ember-400" />
            <div
              className="relative rotate-1 rounded-2xl border border-line bg-surface p-7 pt-9 shadow-lift"
              style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 35px, color-mix(in srgb, var(--color-ink-500) 22%, transparent) 35px, color-mix(in srgb, var(--color-ink-500) 22%, transparent) 36px)' }}
            >
              <span aria-hidden="true" className="absolute -top-3 left-8 h-6 w-20 -rotate-3 rounded-sm bg-ember-200/80" />
              <p className="font-hand text-[1.7rem] leading-[36px] text-ink-800">
                Draw the free-body diagram first.
                <br />
                Then write the equation.
              </p>
              <p className="mt-3 font-hand text-[1.7rem] leading-[36px] text-ember-600">Most lost marks are sign errors, not hard concepts.</p>
            </div>
            <figcaption className="mt-5 text-center text-sm text-ink-500">An example of the style of tip you will find in the notes</figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}
