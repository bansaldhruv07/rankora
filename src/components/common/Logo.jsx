import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

// The mark: an R (for the notes) with two rising chevrons (for the rank). It keeps a faint edge so it
// still reads on the dark theme.
export function LogoMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="#14213d" stroke="rgba(255,255,255,0.14)" />
      <path
        fillRule="evenodd"
        d="M8.5 24V8h7.5a5 5 0 0 1 1.6 9.7L21.5 24h-3.6l-3.4-5.8h-2.4V24H8.5Zm3.4-8.8h3.9a2.1 2.1 0 0 0 0-4.2h-3.9v4.2Z"
        fill="#fbf8f1"
      />
      <path d="m21.3 12.6 3.2-3.2 3.2 3.2" fill="none" stroke="#e0763a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m21.3 17.4 3.2-3.2 3.2 3.2" fill="none" stroke="#e0763a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
    </svg>
  )
}

export default function Logo({ className, to = '/', onClick, tagline = false }) {
  return (
    <Link to={to} onClick={onClick} aria-label="Rankora home" className={cn('group inline-flex items-center gap-2.5', className)}>
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.4rem] font-semibold tracking-tight text-ink-900">Rankora</span>
        {tagline && <span className="mt-1 hidden font-mono text-[0.58rem] font-medium uppercase tracking-[0.2em] text-ember-600 sm:block">Short notes · Fast revision</span>}
      </span>
    </Link>
  )
}
