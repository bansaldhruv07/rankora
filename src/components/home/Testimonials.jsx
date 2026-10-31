import { Quote } from 'lucide-react'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { TESTIMONIALS } from '../../data/home'

export default function Testimonials() {
  if (TESTIMONIALS.length === 0) return null
  return (
    <section className="page-container py-20 sm:py-24">
      <Reveal>
        <SectionHeading align="center" eyebrow="Students" title="What students say about the notes" description="Short notes that get read are worth more than long ones that do not." />
      </Reveal>
      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t, index) => (
          <Reveal as="li" key={t.id} delay={index * 90} className="h-full">
            <figure className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-7">
              <Quote size={22} aria-hidden="true" className="text-ember-500" />
              <blockquote className="mt-4 flex-1 leading-relaxed text-ink-800">{t.quote}</blockquote>
              <figcaption className="mt-6 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{t.name}</span>
                  <span className="block text-xs text-ink-500">{t.detail}</span>
                </span>
                {t.sample && <span className="rounded-full bg-ivory-200 px-2.5 py-0.5 text-[0.7rem] font-semibold text-ink-600">Sample review</span>}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
