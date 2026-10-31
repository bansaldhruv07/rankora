import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function Select({ label, value, onChange, options, className }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-500">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-line bg-surface pl-4 pr-10 text-sm font-medium text-ink-900 shadow-soft transition hover:border-ink-900/30 focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500"
        />
      </span>
    </label>
  )
}