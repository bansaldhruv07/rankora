import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { HOW_IT_WORKS } from '../../data/home'

export default function HowItWorks() {
  return (
    <section className="border-y border-line-soft bg-ivory-100/60">
      <div className="page-container py-20 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="A short loop you can repeat every week"
            description="Diagnose, revise, practise, test. Each step feeds the next."
          />
        </Reveal>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, index) => (
            <Reveal as="li" key={step.id} delay={index * 90} className="relative border-t border-ink-900/20 pt-5">
              <span className="font-mono text-sm font-medium text-ember-600">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-600">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}