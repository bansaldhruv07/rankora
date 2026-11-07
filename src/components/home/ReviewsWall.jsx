import { Quote, Star } from 'lucide-react'
import Reveal from '../ui/Reveal'
import { DEMO_REVIEWS, REVIEWS } from '../../data/home'

function Stars({ rating }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={15} aria-hidden="true" className={n <= rating ? 'fill-ember-500 text-ember-500' : 'text-ink-300'} />
      ))}
    </span>
  )
}

function ReviewCard({ review }) {
  return (
    <figure className="flex w-[18rem] shrink-0 flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-ember-500/40 hover:shadow-lift sm:w-[22rem] sm:p-6">
      <div className="flex items-center justify-between">
        <Stars rating={review.rating} />
        <Quote size={20} aria-hidden="true" className="text-ember-500/70" />
      </div>
      <blockquote className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-ink-800 sm:text-base">{review.quote}</blockquote>
      <figcaption className="mt-4 flex items-center gap-3 border-t border-line-soft pt-3">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-ember-50 font-display text-sm font-semibold text-ember-600 ring-1 ring-ember-500/20">
          {review.name[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-900">{review.name}</span>
          <span className="block text-xs text-ink-500">{review.detail}</span>
        </span>
      </figcaption>
    </figure>
  )
}

// A single endless row. The list is repeated so the loop has no seam; the copy is hidden from screen readers.
// Production shows real reviews only (none yet = the band is hidden). The dev server shows demo cards.
export default function ReviewsWall() {
  const reviews = REVIEWS.length > 0 ? REVIEWS : import.meta.env.DEV ? DEMO_REVIEWS : []
  if (reviews.length === 0) return null
  // Short lists would leave gaps in the loop, so repeat them until one copy is wide enough.
  const row = reviews.length >= 5 ? reviews : [...reviews, ...reviews, ...reviews]

  return (
    <section aria-label="What students say" className="border-b border-line-soft bg-ivory-100/60 py-10 sm:py-12">
      <Reveal className="page-container mb-6 text-center sm:mb-8">
        <p className="mb-2 flex items-center justify-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ember-600">
          <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
          Students
          <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
        </p>
        <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">Revision that actually gets done</h2>
      </Reveal>
      <div className="marquee-mask overflow-hidden">
        <div className="flex w-max animate-marquee-slow gap-4 py-2 hover:[animation-play-state:paused] sm:gap-5">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex gap-4 sm:gap-5">
              {row.map((review, index) => (
                <ReviewCard key={`${review.id}-${index}`} review={review} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
