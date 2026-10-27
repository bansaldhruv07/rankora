import { cn } from '../../utils/cn'

export default function PageHeader({ eyebrow, title, description, children, className }) {
  return (
    <header className={cn('border-b border-line-soft bg-ivory-100/60', className)}>
      <div className="page-container py-12 sm:py-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="animate-rise mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ember-600">
                <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
                {eyebrow}
              </p>
            )}
            <h1
              className="animate-rise stagger text-4xl font-semibold leading-[1.1] sm:text-5xl"
              style={{ '--d': '60ms' }}
            >
              {title}
            </h1>
            {description && (
              <p
                className="animate-rise stagger mt-4 text-lg leading-relaxed text-ink-600"
                style={{ '--d': '140ms' }}
              >
                {description}
              </p>
            )}
          </div>
          {children && (
            <div className="animate-rise stagger shrink-0" style={{ '--d': '220ms' }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}