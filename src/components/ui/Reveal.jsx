import { useInView } from '../../hooks/useInView'
import { cn } from '../../utils/cn'

export default function Reveal({ as: Tag = 'div', delay = 0, className, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag
      ref={ref}
      style={{ '--d': `${delay}ms` }}
      className={cn('stagger', inView ? 'animate-rise' : 'opacity-0', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}