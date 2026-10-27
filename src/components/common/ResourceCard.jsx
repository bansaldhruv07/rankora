import { Link } from 'react-router-dom'
import Card from '../ui/Card'
import { DifficultyBadge, SubjectBadge } from '../ui/Badge'
import BookmarkButton from './BookmarkButton'
import { RESOURCE_TYPES } from '../../utils/resourceMeta'
import { formatPrice } from '../../utils/format'
import { resourcePath } from '../../utils/routes'
import { cn } from '../../utils/cn'

export default function ResourceCard({ resource, className }) {
  const type = RESOURCE_TYPES[resource.type]
  const TypeIcon = type.icon

  return (
    <Card as="article" interactive className={cn('group relative flex h-full flex-col p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-ivory-200 text-ink-800 transition duration-300 group-hover:bg-ember-50 group-hover:text-ember-600">
          <TypeIcon size={20} aria-hidden="true" />
        </span>
        <BookmarkButton resourceId={resource.id} title={resource.title} className="relative z-10 -mr-2 -mt-1" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SubjectBadge subject={resource.subject} />
        <DifficultyBadge level={resource.difficulty} />
      </div>

      <h3 className="mt-3 text-xl font-semibold leading-snug">
        <Link to={resourcePath(resource.id)} className="after:absolute after:inset-0">
          {resource.title}
        </Link>
      </h3>
      <p className="mb-5 mt-2 text-sm leading-relaxed text-ink-600">{resource.summary}</p>

      <div className="mt-auto flex items-end justify-between gap-4 border-t border-line-soft pt-4">
        <div className="min-w-0">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-400">{type.label}</p>
          <p className="mt-0.5 truncate text-sm text-ink-600">
            {resource.chapter} · {resource.length}
          </p>
        </div>
        <p
          className={cn(
            'font-display text-xl font-semibold',
            resource.price === 0 ? 'text-sage-700' : 'text-ink-900',
          )}
        >
          {formatPrice(resource.price)}
        </p>
      </div>
    </Card>
  )
}