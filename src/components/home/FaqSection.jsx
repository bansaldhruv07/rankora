import Accordion from '../ui/Accordion'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { FAQ } from '../../data/faq'

export default function FaqSection() {
  return (
    <section className="border-t border-line-soft bg-ivory-100/60">
      <div className="page-container grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.6fr]">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title="Questions, answered plainly"
            description="Who writes the notes, how you read them, and how buying works."
          />
        </Reveal>
        <Reveal delay={100}>
          <Accordion items={FAQ} />
        </Reveal>
      </div>
    </section>
  )
}