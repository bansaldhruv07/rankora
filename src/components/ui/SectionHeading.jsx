import { cn } from '../../utils/cn'

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  as: Tag = 'h2',
  className,
  children,
}) {
  const center = align === 'center'
  return (
    <div
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between',
        center && 'text-center sm:flex-col sm:items-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', center && 'mx-auto')}>
        {eyebrow && (
          <p
            className={cn(
              'mb-3 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ember-600',
              center && 'justify-center',
            )}
          >
            <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
            {eyebrow}
          </p>
        )}
        <Tag className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</Tag>
        {description && (
          <p className="mt-3 text-base leading-relaxed text-ink-600 sm:text-lg">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  )
}