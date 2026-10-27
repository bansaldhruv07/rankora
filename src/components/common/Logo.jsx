import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

export function LogoMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" fill="#14213d" />
      <path
        fillRule="evenodd"
        d="M10 24V8h7.5a5 5 0 0 1 1.6 9.7L23 24h-3.6l-3.4-5.8H13.4V24H10Zm3.4-8.8h3.9a2.1 2.1 0 0 0 0-4.2h-3.9v4.2Z"
        fill="#fbf8f1"
      />
      <circle cx="24" cy="9" r="2.5" fill="#c2571a" />
    </svg>
  )
}

export default function Logo({ className, to = '/', onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label="Rankora home"
      className={cn('group inline-flex items-center gap-2.5', className)}
    >
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-display text-[1.4rem] font-semibold tracking-tight text-ink-900">Rankora</span>
    </Link>
  )
}