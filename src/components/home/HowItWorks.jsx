import Reveal from '../ui/Reveal'
import { HOW_IT_WORKS } from '../../data/home'

export default function HowItWorks() {
  return (
    <section className="border-y border-line-soft bg-ivory-100/60">
      <div className="page-container py-12 sm:py-14">
        <Reveal>
          <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">From search to reading in minutes</h2>
        </Reveal>
        <ol className="relative mt-8 grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-4">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[1.05rem] hidden h-px bg-line lg:block" />
          {HOW_IT_WORKS.map((step, index) => (
            <Reveal as="li" key={step.id} delay={index * 90} className="relative">
              <span className="relative grid size-9 place-items-center rounded-full border border-ember-500/40 bg-surface font-mono text-sm font-semibold text-ember-600 shadow-soft">
                {index + 1}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
