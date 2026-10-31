import { cn } from '../../utils/cn'

export default function Chip({ active = false, count, className, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition duration-200 active:scale-95',
        active
          ? 'border-ink-900 bg-ink-900 text-ivory-50'
          : 'border-line bg-surface text-ink-700 hover:border-ember-500 hover:text-ember-600',
        className,
      )}
      {...rest}
    >
      {children}
      {count !== undefined && (
        <span className={cn('tabular text-xs', active ? 'text-ivory-300' : 'text-ink-400')}>{count}</span>
      )}
    </button>
  )
}