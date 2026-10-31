import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { BENEFITS } from '../../data/home'

export default function Benefits() {
  return (
    <section className="border-y border-line-soft bg-ivory-100/60">
      <div className="page-container py-20 sm:py-24">
        <Reveal>
          <SectionHeading
            align="center"
            eyebrow="Why Rankora"
            title="Notes you will actually open the night before"
            description="Made for the part of preparation that decides marks: quick, confident revision."
          />
        </Reveal>
        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <Reveal key={benefit.id} delay={(index % 3) * 90} className="group">
                <span className="grid size-12 place-items-center rounded-xl border border-line bg-surface text-ink-800 shadow-soft transition duration-300 group-hover:-translate-y-0.5 group-hover:border-ember-500 group-hover:text-ember-600">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{benefit.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-600">{benefit.body}</p>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}