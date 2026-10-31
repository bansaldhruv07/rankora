import { formatPrice } from '../../utils/format'
import { cn } from '../../utils/cn'

// Shows the price, and an original price + saving only when the server reports a genuine one.
export default function PriceTag({ product, size = 'md', className }) {
  const free = product.price === 0
  const big = size === 'lg'
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2.5 gap-y-1', className)}>
      <span className={cn('tabular font-display font-semibold', big ? 'text-5xl' : 'text-xl', free ? 'text-sage-700' : 'text-ink-900')}>
        {formatPrice(product.price)}
      </span>
      {product.savings && (
        <>
          <s className={cn('tabular text-ink-400', big ? 'text-lg' : 'text-sm')} aria-label={`Original price ${formatPrice(product.savings.referencePrice)}`}>
            {formatPrice(product.savings.referencePrice)}
          </s>
          <span className={cn('rounded-full bg-sage-100 font-semibold text-sage-700', big ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs')}>
            Save {product.savings.percent}%
          </span>
        </>
      )}
    </div>
  )
}
