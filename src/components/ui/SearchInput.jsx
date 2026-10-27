import { useId } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function SearchInput({ value, onChange, placeholder = 'Search', label = 'Search', className }) {
  const id = useId()
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
      />
      <input
        id={id}
        type="text"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border border-line bg-[#fffdf8] pl-11 pr-11 text-[0.95rem] text-ink-900 shadow-soft transition placeholder:text-ink-400 hover:border-ink-900/30 focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-400 transition hover:bg-ivory-200 hover:text-ink-900"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}