import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

// The mark: an open book with an orange pencil writing on it. The book follows the theme (navy on a light page, white
// on a dark one); pass tone="onDark" where the background is always dark (the admin sidebar). The pencil is the same
// orange everywhere. Coordinates are in the supplied artwork's own space, cropped by the viewBox.
const BOOK = { light: 'fill-ink-900', strip: 'fill-ink-700', line: 'stroke-ink-400' }

export function LogoMark({ size = 40, className, tone = 'auto' }) {
  const dark = tone === 'onDark'
  return (
    <svg width={size} height={size} viewBox="215 135 290 290" aria-hidden="true" className={className}>
      {/* pages and their thickness */}
      <path d="M220 228 346 252V388L220 364Z" className={dark ? undefined : BOOK.light} fill={dark ? '#f7f8fc' : undefined} />
      <path d="M350 252 474 228V364L350 388Z" className={dark ? undefined : BOOK.light} fill={dark ? '#f7f8fc' : undefined} />
      <path d="M220 364 346 388V397L220 373Z" className={dark ? undefined : BOOK.strip} fill={dark ? '#c1cce6' : undefined} />
      <path d="M350 388 474 364V373L350 397Z" className={dark ? undefined : BOOK.strip} fill={dark ? '#c1cce6' : undefined} />
      {/* lines of writing */}
      <g fill="none" strokeWidth="8" strokeLinecap="round" className={dark ? undefined : BOOK.line} stroke={dark ? '#a9b6d6' : undefined}>
        <path d="M240 267 326 283M240 294 326 310M240 321 326 337" />
        <path d="M370 337 456 321M370 310 456 294M370 283 456 267" />
      </g>
      {/* the pencil: outline first, then the wood, graphite, two-tone body, ferrule and eraser */}
      <path
        d="M339 322 353.8 276.9 442 191.1 452.7 180.6 464.1 169.5Q470.6 163.2 476.9 169.7L494.9 188.3Q501.2 194.8 494.7 201.1L483.3 212.2 472.7 222.7 384.4 308.5Z"
        fill="#0c2449"
        stroke="#0c2449"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <path d="M339 322 353.8 276.9 384.4 308.5Z" fill="#f5d5a8" />
      <path d="M339 322 343.6 308 353 317.8Z" fill="#0c2449" />
      <path d="M353.8 276.9 442 191.1 457.3 206.9 369.1 292.7Z" fill="#ff8a3d" />
      <path d="M369.1 292.7 457.3 206.9 472.7 222.7 384.4 308.5Z" fill="#f26a10" />
      <path d="M442 191.1 452.7 180.6 483.3 212.2 472.7 222.7Z" fill="#a7b4d0" />
      <path d="M452.7 180.6 464.1 169.5Q470.6 163.2 476.9 169.7L494.9 188.3Q501.2 194.8 494.7 201.1L483.3 212.2Z" fill="#f3f5fa" />
    </svg>
  )
}

// "JEE" in the page's text colour and "dge" in the logo orange, set in the logo's own bold geometric type so every
// capital looks the same. `domain` adds ".in" (the navbar and footer).
export function Wordmark({ className, tone = 'auto', domain = false }) {
  return (
    <span className={cn('font-brand font-extrabold tracking-tight', className)}>
      JEE<span className={tone === 'onDark' ? 'text-[#f26a10]' : 'text-brand'}>dge</span>{domain && '.in'}
    </span>
  )
}

export default function Logo({ className, to = '/', onClick, tagline = false }) {
  return (
    <Link to={to} onClick={onClick} aria-label="JEEdge home" className={cn('group inline-flex items-center gap-2.5', className)}>
      <LogoMark size={42} className="transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <Wordmark domain className="text-[1.45rem] text-ink-900" />
        {tagline && <span className="mt-1 hidden font-mono text-[0.58rem] font-medium uppercase tracking-[0.2em] text-ember-600 sm:block">Short notes · Fast revision</span>}
      </span>
    </Link>
  )
}
