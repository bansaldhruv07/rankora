import { Link } from 'react-router-dom'
import { ArrowRight, Layers } from 'lucide-react'
import { formatPrice, pluralize } from '../../utils/format'
import { notePath } from '../../utils/routes'
import { cn } from '../../utils/cn'
import { coverTheme } from './coverTheme'
import PriceTag from './PriceTag'

// A bundle: the included covers fan out like a stack of books, with the real saving spelled out.
export default function BundleCard({ bundle, owned = false, className }) {
  const items = (bundle.items ?? []).slice(0, 3)
  const theme = coverTheme(bundle.subject)
  const count = bundle.items?.length ?? 0

  return (
    <article className={cn('group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:border-ink-900/30 hover:shadow-lift', className)}>
      <div className="relative flex h-36 items-end justify-center gap-0 overflow-hidden px-6 pt-6" style={{ background: `linear-gradient(160deg, ${theme.bg}, ${theme.spine})` }}>
        {items.map((item, index) => {
          const t = coverTheme(item.subject)
          return (
            <span
              key={item.id}
              aria-hidden="true"
              className="relative -mx-2 block h-28 w-20 rounded-t-[0.3rem] border border-white/15 shadow-lift transition duration-300 group-hover:-translate-y-1"
              style={{ background: t.bg, transform: `rotate(${(index - 1) * 6}deg)`, transformOrigin: 'bottom center', zIndex: index === 1 ? 2 : 1 }}
            >
              <span className="absolute inset-y-0 left-0 w-2" style={{ background: t.spine }} />
              <span className="absolute inset-x-3 top-4 h-px" style={{ background: t.accent }} />
              <span className="absolute inset-x-3 top-7 h-1.5 rounded bg-white/25" />
              <span className="absolute inset-x-3 top-10 h-1.5 w-2/3 rounded bg-white/15" />
            </span>
          )
        })}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="inline-flex items-center gap-1.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ember-600">
          <Layers size={12} aria-hidden="true" />
          Bundle · {pluralize(count, 'note')}
        </p>
        <h3 className="mt-2 text-xl font-semibold leading-snug">
          <Link to={notePath(bundle.slug)} className="after:absolute after:inset-0">
            {bundle.title}
          </Link>
        </h3>
        {bundle.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-600">{bundle.summary}</p>}
        <div className="mt-auto pt-4">
          {owned ? (
            <p className="text-sm font-semibold text-sage-700">In your library</p>
          ) : (
            <>
              <PriceTag product={bundle} />
              {bundle.savings && (
                <p className="mt-1.5 text-xs text-ink-500">
                  {formatPrice(bundle.savings.referencePrice)} if bought separately · you save {formatPrice(bundle.savings.amount)}
                </p>
              )}
            </>
          )}
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900">
            See what&apos;s inside
            <ArrowRight size={15} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  )
}
