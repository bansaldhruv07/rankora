import { Search } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function EmptyState({ icon: Icon = Search, title, description, className, children }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-ivory-200 text-ink-600">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md leading-relaxed text-ink-600">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}