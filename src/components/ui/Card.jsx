import { cn } from '../../utils/cn'

export default function Card({ as: Tag = 'div', interactive = false, className, children, ...rest }) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-line bg-surface shadow-soft',
        interactive &&
          'transition duration-300 hover:-translate-y-1 hover:border-ink-900/30 hover:shadow-lift',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}