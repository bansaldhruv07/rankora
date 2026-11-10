import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

// The mark: a tile in the site accent orange with a cut corner and a navy "E" whose arms are sliced like speed lines
// (the "edge"). The tile follows the theme's accent, so it matches the buttons and links on a light and a dark page.
export function LogoMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" aria-hidden="true" className={className}>
      <path d="M80 0H280L400 120V320A80 80 0 0 1 320 400H80A80 80 0 0 1 0 320V80A80 80 0 0 1 80 0Z" className="fill-ember-400" />
      <path d="M100 100H300L245 156H160V174H252L200 226H160V244H300L245 300H100Z" fill="#0c1f3b" />
    </svg>
  )
}

// "JEE" in the page's text colour and "dge" in the brand orange, set in the logo's own bold geometric type so every
// capital looks the same. `domain` adds ".in" (the navbar and footer). Pass tone="onDark" where the background is
// always dark (the admin sidebar, a cover).
export function Wordmark({ className, tone = 'auto', domain = false }) {
  return (
    <span className={cn('font-brand font-extrabold tracking-tight', className)}>
      JEE<span className={tone === 'onDark' ? 'text-ember-400' : 'text-brand'}>dge</span>{domain && '.in'}
    </span>
  )
}

export default function Logo({ className, to = '/', onClick, tagline = false }) {
  return (
    <Link to={to} onClick={onClick} aria-label="JEEdge home" className={cn('group inline-flex items-center gap-2.5', className)}>
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <Wordmark domain className="text-[1.45rem] text-ink-900" />
        {tagline && <span className="mt-1 hidden font-mono text-[0.58rem] font-medium uppercase tracking-[0.2em] text-ember-600 sm:block">Short notes · Fast revision</span>}
      </span>
    </Link>
  )
}
