import Accordion from '../ui/Accordion'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { FAQ } from '../../data/faq'

export default function FaqSection() {
  return (
    <section className="border-t border-line-soft bg-ivory-100/60">
      <div className="page-container grid gap-8 py-12 sm:py-14 lg:grid-cols-[0.7fr_1.6fr] lg:gap-12">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Quick answers" />
        </Reveal>
        <Reveal delay={100}>
          <Accordion items={FAQ} />
        </Reveal>
      </div>
    </section>
  )
}
