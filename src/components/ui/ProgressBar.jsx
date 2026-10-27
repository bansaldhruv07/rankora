import { cn } from '../../utils/cn'

const TONES = {
  ember: 'bg-ember-500',
  sage: 'bg-sage-500',
  ink: 'bg-ink-700',
  danger: 'bg-danger-500',
}

export default function ProgressBar({
  value,
  max = 100,
  tone = 'ember',
  label,
  showValue = false,
  size = 'md',
  className,
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-ink-700">{label}</span>
          {showValue && <span className="tabular font-mono text-xs text-ink-500">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn('overflow-hidden rounded-full bg-ivory-200', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div
          className={cn(
            'h-full origin-left animate-grow-x rounded-full transition-[width] duration-700 ease-out',
            TONES[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}