import Card from '../ui/Card'
import { countStates, getQuestionState, STATE_LABELS } from '../../utils/scoring'
import { getSubjectTheme } from '../../utils/subjectTheme'
import { cn } from '../../utils/cn'

const STATE_STYLES = {
  notVisited: 'border-line bg-[#fffdf8] text-ink-600 hover:border-ink-900/40',
  unanswered: 'border-danger-500/40 bg-danger-100 text-danger-500',
  answered: 'border-sage-600 bg-sage-500 text-white',
  marked: 'border-ember-500 bg-ember-50 text-ember-700',
  answeredMarked: 'border-sage-600 bg-sage-500 text-white',
}

const HAS_DOT = ['marked', 'answeredMarked']

const LEGEND = [
  ['answered', 'Answered'],
  ['unanswered', 'Not answered'],
  ['notVisited', 'Not visited'],
  ['marked', 'Marked for review'],
  ['answeredMarked', 'Answered and marked'],
]

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1 -top-1 size-2.5 rounded-full border border-ivory-50 bg-ember-500"
    />
  )
}

export function PaletteLegend({ counts, className }) {
  return (
    <ul className={cn('grid gap-2 text-xs text-ink-600', className)}>
      {LEGEND.map(([state, label]) => (
        <li key={state} className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              'tabular relative grid size-6 shrink-0 place-items-center rounded-md border text-[0.7rem] font-semibold',
              STATE_STYLES[state],
            )}
          >
            {counts ? counts[state] : ''}
            {HAS_DOT.includes(state) && <Dot />}
          </span>
          {label}
        </li>
      ))}
    </ul>
  )
}

export default function QuestionPalette({ questions, answers, marked, visited, current, onSelect }) {
  const groups = []
  questions.forEach((question, index) => {
    const last = groups[groups.length - 1]
    if (last && last.subject === question.subject) last.items.push({ question, index })
    else groups.push({ subject: question.subject, items: [{ question, index }] })
  })

  const counts = countStates(questions, answers, marked, visited)

  return (
    <aside aria-label="Question palette">
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold">Question palette</h2>

        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <div key={group.subject}>
              {groups.length > 1 && (
                <p className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-500">
                  {getSubjectTheme(group.subject).label}
                </p>
              )}
              <ul className="grid grid-cols-5 gap-2">
                {group.items.map(({ question, index }) => {
                  const state = getQuestionState({
                    answered: Number.isInteger(answers[question.id]),
                    marked: Boolean(marked[question.id]),
                    visited: Boolean(visited[question.id]),
                  })
                  return (
                    <li key={question.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(index)}
                        aria-label={`Question ${index + 1}, ${STATE_LABELS[state]}`}
                        aria-current={index === current ? 'true' : undefined}
                        className={cn(
                          'tabular relative grid size-10 w-full place-items-center rounded-lg border text-sm font-semibold transition duration-150 active:scale-95',
                          STATE_STYLES[state],
                          index === current && 'ring-2 ring-ink-900 ring-offset-2 ring-offset-ivory-50',
                        )}
                      >
                        {index + 1}
                        {HAS_DOT.includes(state) && <Dot />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <PaletteLegend counts={counts} className="mt-6 border-t border-line-soft pt-5" />
      </Card>
    </aside>
  )
}