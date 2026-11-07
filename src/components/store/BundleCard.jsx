import { Link } from 'react-router-dom'
import { ArrowRight, Layers } from 'lucide-react'
import { pluralize } from '../../utils/format'
import { notePath } from '../../utils/routes'
import { cn } from '../../utils/cn'
import BundleArt from './BundleArt'
import { BUNDLE_LABEL, bundleKind } from './bundleKind'
import PriceTag from './PriceTag'

// A bundle: a picture panel (all subjects / one subject / toughest chapters) beside the real price and saving.
export default function BundleCard({ bundle, owned = false, className }) {
  const count = bundle.items?.length ?? 0
  const label = BUNDLE_LABEL[bundleKind(bundle)]

  return (
    <article className={cn('group relative flex overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:border-ink-900/30 hover:shadow-lift', className)}>
      <BundleArt bundle={bundle} className="w-28 shrink-0 sm:w-32" />
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <p className="inline-flex items-center gap-1.5 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-ember-600">
          <Layers size={12} aria-hidden="true" />
          {label}
        </p>
        <h3 className="mt-1.5 text-lg font-semibold leading-snug">
          <Link to={notePath(bundle.slug)} className="after:absolute after:inset-0">
            {bundle.title}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3">
          {owned ? (
            <p className="text-sm font-semibold text-sage-700">In your library</p>
          ) : (
            <>
              <PriceTag product={bundle} />
            </>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-ink-500">
            {pluralize(count, 'note')}
            <ArrowRight size={15} aria-hidden="true" className="text-ink-400 transition duration-300 group-hover:translate-x-1 group-hover:text-ember-600" />
          </span>
        </div>
      </div>
    </article>
  )
}
