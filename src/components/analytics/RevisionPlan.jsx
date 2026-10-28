import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import Badge, { SubjectBadge } from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import ProgressBar from '../ui/ProgressBar'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { STORAGE_KEYS } from '../../utils/constants'
import { DIAGNOSTIC_PATH, resourcePath } from '../../utils/routes'
import { cn } from '../../utils/cn'

const PRIORITY_TONE = { High: 'danger', Medium: 'ember', Low: 'sage' }

export default function RevisionPlan({ recommendations, plan }) {
  const [done, setDone] = useLocalStorage(STORAGE_KEYS.planProgress, {})
  const tasks = plan.flatMap((day) => day.tasks)
  const completed = tasks.filter((item) => done[item.id]).length

  const toggle = (id) => setDone((prev) => ({ ...prev, [id]: !prev[id] }))

  if (recommendations.length === 0) {
    return (
      <EmptyState
        title="No weak chapters to revise"
        description="Every chapter you have attempted is at 80% accuracy or better. Take another test to keep this list current."
      >
        <Button to={DIAGNOSTIC_PATH} variant="accent">
          Take the diagnostic test
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <div>
        <h3 className="text-xl font-semibold">Revise first</h3>
        <p className="mt-1 text-sm text-ink-600">Chapters ranked by lowest accuracy.</p>
        <ul className="mt-5 space-y-4">
          {recommendations.map((rec) => (
            <li key={rec.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <SubjectBadge subject={rec.subject} />
                  <Badge tone={PRIORITY_TONE[rec.priority]} className="ml-auto">
                    {rec.priority} priority
                  </Badge>
                </div>
                <p className="mt-3 font-display text-lg font-semibold">{rec.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{rec.reason}</p>
                <p className="mt-2 text-xs text-ink-500">About {rec.minutes} minutes</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {rec.resource && (
                    <Button to={resourcePath(rec.resource.id)} size="sm" variant="outline">
                      Open {rec.resource.title}
                    </Button>
                  )}
                  <Button to={rec.practiceLink} size="sm" variant="primary" iconRight={ArrowRight}>
                    Practise
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-semibold">This week</h3>
        <ProgressBar
          className="mt-3"
          tone="sage"
          value={completed}
          max={tasks.length}
          label={`${completed} of ${tasks.length} tasks done`}
          showValue
        />
        <ol className="mt-5 space-y-3">
          {plan.map((day) => (
            <li key={day.day}>
              <Card className="p-4 sm:p-5">
                <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-ember-600">
                  {day.day} <span className="text-ink-500">· {day.focus}</span>
                </p>
                <ul className="mt-3 space-y-2">
                  {day.tasks.map((item) => {
                    const checked = Boolean(done[item.id])
                    return (
                      <li key={item.id} className="flex items-start gap-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-label={`Mark "${item.label}" as done`}
                          onClick={() => toggle(item.id)}
                          className={cn(
                            'mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition',
                            checked ? 'border-sage-600 bg-sage-600 text-white' : 'border-ink-400 bg-[#fffdf8] hover:border-ink-900',
                          )}
                        >
                          {checked && <Check size={14} aria-hidden="true" />}
                        </button>
                        <span className={cn('flex-1 text-sm leading-relaxed', checked && 'text-ink-500 line-through')}>
                          {item.to ? (
                            <Link to={item.to} className="underline-offset-4 hover:text-ember-600 hover:underline">
                              {item.label}
                            </Link>
                          ) : (
                            item.label
                          )}
                        </span>
                        <span className="tabular text-xs text-ink-500">{item.minutes} min</span>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
