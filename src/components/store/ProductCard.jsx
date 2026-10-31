import { Link } from 'react-router-dom'
import { Eye, FileText } from 'lucide-react'
import { CLASS_LABELS, pluralize } from '../../utils/format'
import { notePath } from '../../utils/routes'
import { cn } from '../../utils/cn'
import PriceTag from './PriceTag'
import ProductCover from './ProductCover'

// One note in the marketplace grid. The whole card is the link; the cover leads, details follow.
export default function ProductCard({ product, owned = false, className }) {
  return (
    <article className={cn('group relative flex h-full flex-col', className)}>
      <div className="transition duration-300 group-hover:-translate-y-1.5">
        <ProductCover product={product} compact />
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-500">
          {product.classLevel && <span>{CLASS_LABELS[product.classLevel]}</span>}
          {product.pages > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <FileText size={11} aria-hidden="true" />
                {pluralize(product.pages, 'page')}
              </span>
            </>
          )}
        </p>
        <h3 className="mt-1.5 text-lg font-semibold leading-snug">
          <Link to={notePath(product.slug)} className="after:absolute after:inset-0 focus-visible:after:rounded-lg">
            {product.title}
          </Link>
        </h3>
        {product.chapter && <p className="mt-1 text-sm text-ink-600">{product.chapter}</p>}

        <div className="mt-auto pt-4">
          {owned ? (
            <p className="text-sm font-semibold text-sage-700">In your library</p>
          ) : (
            <PriceTag product={product} />
          )}
          {product.previewPageCount > 0 && !owned && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
              <Eye size={13} aria-hidden="true" />
              Free sample · {pluralize(product.previewPageCount, 'page')}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="aspect-[3/4] rounded-[0.35rem] bg-ivory-200" />
      <div className="mt-4 h-3 w-24 rounded bg-ivory-200" />
      <div className="mt-3 h-5 w-5/6 rounded bg-ivory-200" />
      <div className="mt-2 h-4 w-1/2 rounded bg-ivory-200" />
      <div className="mt-5 h-6 w-20 rounded bg-ivory-200" />
    </div>
  )
}
