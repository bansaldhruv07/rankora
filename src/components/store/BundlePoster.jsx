import { Link } from 'react-router-dom'
import { Lock, ShoppingBag } from 'lucide-react'
import Button from '../ui/Button'
import { notePath } from '../../utils/routes'
import { cn } from '../../utils/cn'
import PriceTag from './PriceTag'

// A bundle shown as its poster image with the real price and a Buy now button. `bundle` is the live product from the
// catalogue. When it does not exist yet (for example Chemistry before its notes are uploaded) the poster is shown
// locked: no link, no purchase, so nobody can pay for something that is not there.
export default function BundlePoster({ bundle, image, alt, wide = false, owned = false, priority = false, onBuy, className }) {
  const live = Boolean(bundle)

  const picture = (
    <div className={cn('relative overflow-hidden bg-ivory-200', wide ? 'aspect-video' : 'aspect-[4/5]')}>
      <img
        src={image}
        alt={alt}
        width={wide ? 1600 : 900}
        height={wide ? 900 : 1125}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={cn('size-full object-cover transition duration-500', live ? 'group-hover:scale-[1.03]' : 'saturate-[0.75]')}
      />
      {!live && (
        <span className="absolute inset-0 grid place-items-center bg-[#0b1424]/45">
          <span className="flex flex-col items-center gap-2 text-white">
            <span className="grid size-12 place-items-center rounded-full bg-[#0b1424]/85 shadow-lift ring-1 ring-white/25">
              <Lock size={22} aria-hidden="true" />
            </span>
            <span className="rounded-full bg-[#0b1424]/85 px-3 py-1 font-mono text-[0.66rem] font-bold uppercase tracking-wide ring-1 ring-white/20">Coming soon</span>
          </span>
        </span>
      )}
    </div>
  )

  return (
    <article className={cn('group overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition duration-300', live && 'hover:-translate-y-1 hover:shadow-lift', className)}>
      {live ? (
        <Link to={notePath(bundle.slug)} aria-label={`${bundle.title}: see what is inside`} className="block">
          {picture}
        </Link>
      ) : (
        picture
      )}
      <div className={cn('flex gap-2.5 p-3', wide ? 'flex-wrap items-center justify-between' : 'flex-col')}>
        {!live ? (
          <>
            <p className="text-sm text-ink-600">Opens when the notes are live.</p>
            <Button variant="soft" size="sm" icon={Lock} disabled aria-label="Locked until the notes are live" className={wide ? '' : 'w-full'}>
              Locked
            </Button>
          </>
        ) : owned ? (
          <p className="text-sm font-semibold text-sage-700">In your library</p>
        ) : (
          <>
            <PriceTag product={bundle} />
            <Button variant="accent" size="sm" icon={ShoppingBag} onClick={onBuy} className={wide ? '' : 'w-full'}>
              Buy now
            </Button>
          </>
        )}
      </div>
    </article>
  )
}
