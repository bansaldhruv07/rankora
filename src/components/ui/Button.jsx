import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

const VARIANTS = {
  primary: 'bg-ink-900 text-ivory-50 shadow-press hover:bg-ink-800 hover:shadow-lift',
  accent: 'bg-ember-500 text-white shadow-press hover:bg-ember-600 hover:shadow-lift',
  outline: 'border border-ink-900/25 text-ink-900 hover:border-ink-900 hover:bg-ivory-100',
  soft: 'bg-ivory-200 text-ink-900 hover:bg-ivory-300',
  ghost: 'text-ink-800 hover:bg-ivory-200',
}

const SIZES = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2 px-6 text-[0.95rem]',
}

export default function Button({
  to,
  href,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  type = 'button',
  ...rest
}) {
  const classes = cn(
    'group inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold transition duration-200 ease-out hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )

  const content = (
    <>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
      {IconRight && (
        <IconRight
          size={16}
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      )}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    )
  }
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  )
}