import { cn } from '../../utils/cn'

// Two example gift cards, tilted like cards on a table. Decorative: the amounts are always written out next to them.
const SIZES = {
  sm: 'h-28 max-w-[15rem]',
  md: 'h-44 max-w-xs sm:h-52 sm:max-w-sm',
}

export default function GiftCardPair({ size = 'md', className }) {
  return (
    <div aria-hidden="true" className={cn('relative mx-auto w-full', SIZES[size], className)}>
      <img
        src="/gifts/swiggy.webp"
        alt=""
        width="900"
        height="600"
        loading="lazy"
        className="absolute right-0 top-0 w-[62%] rotate-[6deg] rounded-xl shadow-lift ring-1 ring-black/5 transition duration-300 hover:rotate-[2deg] hover:scale-105"
      />
      <img
        src="/gifts/blinkit.webp"
        alt=""
        width="500"
        height="333"
        loading="lazy"
        className="absolute bottom-0 left-0 w-[62%] -rotate-[6deg] rounded-xl shadow-lift ring-1 ring-black/5 transition duration-300 hover:-rotate-[2deg] hover:scale-105"
      />
    </div>
  )
}
