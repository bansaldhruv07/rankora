import { ArrowRight, X } from 'lucide-react'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import { BENEFITS, PAIN_POINTS } from '../../data/home'
import { ROUTES } from '../../utils/routes'

export default function Benefits() {
  return (
    <section className="page-container py-14 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-14">
        <Reveal>
          <p className="mb-3 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ember-600">
            <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
            Why JEEdge
          </p>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Less time per chapter. More chapters covered.</h2>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Problems these notes solve">
            {PAIN_POINTS.map((pain) => (
              <li key={pain} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-500 line-through decoration-ember-500/70">
                <X size={13} aria-hidden="true" className="text-ember-500 no-underline" />
                {pain}
              </li>
            ))}
          </ul>
          <Button to={ROUTES.notes} variant="primary" className="mt-7" iconRight={ArrowRight}>
            Find your chapter
          </Button>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <Reveal key={benefit.id} delay={(index % 2) * 80 + Math.floor(index / 2) * 60}>
                <div className="group flex h-full items-start gap-4 rounded-2xl border border-line bg-surface p-4 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-ember-500/50 hover:shadow-lift sm:p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ember-50 text-ember-600 transition duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold leading-snug sm:text-lg">{benefit.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{benefit.body}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
