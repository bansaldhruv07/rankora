import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import { ROUTES } from '../../utils/routes'

export default function FinalCta() {
  return (
    <section className="page-container pt-20 sm:pt-24">
      <Reveal className="relative overflow-hidden rounded-3xl bg-night px-6 py-14 text-center sm:px-14 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 size-72 rounded-full border border-white/10" />
        <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Revise from notes made by IIT Delhi and DTU students.
        </h2>
        <p className="relative mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
          Start with a free sample, find the chapter you are weakest in, and read it today.
        </p>
        <div className="relative mt-9 flex flex-wrap justify-center gap-3">
          <Button to={ROUTES.notes} variant="accent" size="lg" iconRight={ArrowRight}>
            Browse the notes
          </Button>
          <Button to={ROUTES.pricing} size="lg" className="border border-white/30 text-white hover:border-white hover:bg-white/10">
            See pricing
          </Button>
        </div>
      </Reveal>
    </section>
  )
}
