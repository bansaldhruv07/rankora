import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import { DIAGNOSTIC_PATH, ROUTES } from '../../utils/routes'

export default function FinalCta() {
  return (
    <section className="page-container pt-20 sm:pt-24">
      <Reveal className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-center sm:px-14 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-ivory-50/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-10 size-72 rounded-full border border-ivory-50/10"
        />
        <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-ivory-50 sm:text-5xl">
          Start with a diagnostic. Leave with a plan.
        </h2>
        <p className="relative mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ivory-300">
          A short mixed set shows where you stand. Then revise, practise and test with a clear next step.
        </p>
        <div className="relative mt-9 flex flex-wrap justify-center gap-3">
          <Button to={DIAGNOSTIC_PATH} variant="accent" size="lg" iconRight={ArrowRight}>
            Take the diagnostic test
          </Button>
          <Button
            to={ROUTES.explore}
            size="lg"
            className="border border-ivory-50/30 text-ivory-50 hover:border-ivory-50 hover:bg-ivory-50/10"
          >
            Browse resources
          </Button>
        </div>
      </Reveal>
    </section>
  )
}