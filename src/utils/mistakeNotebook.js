import { useState } from 'react'
import { BookOpen, Check, RotateCcw } from 'lucide-react'
import Badge, { SubjectBadge } from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import EmptyState from '../ui/EmptyState'
import Select from '../ui/Select'
import { MISTAKE_TAGS, loadMistakes, saveMistakeEdit } from '../../utils/mistakeNotebook'
import { formatDate } from '../../utils/format'
import { ROUTES } from '../../utils/routes'

const TAG_OPTIONS = MISTAKE_TAGS.map((tag) => ({ value: tag, label: tag }))
const SUBJECT_OPTIONS = [
  { value: 'all', label: 'All subjects' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'mathematics', label: 'Mathematics' },
]

function MistakeCard({ entry, onChange }) {
  const [note, setNote] = useState(entry.note ?? '')
  const question = entry.question
  const revised = entry.status === 'revised'
  const yours = Number.isInteger(entry.yourAnswer)
    ? `${'ABCD'[entry.yourAnswer]}. ${question.options[entry.yourAnswer]}`
    : 'Not recorded'

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <SubjectBadge subject={question.subject} />
        <span className="text-xs text-ink-500">{question.chapter}</span>
        {entry.sample && <Badge tone="ember">Sample</Badge>}
        <Badge tone={revised ? 'sage' : 'danger'} className="ml-auto">
          {revised ? 'Revised' : 'Open'}
        </Badge>
      </div>

      <p className="mt-4 font-medium leading-relaxed text-ink-900">{question.text}</p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-danger-100 px-3 py-2 text-danger-500">
          <dt className="text-xs font-semibold">Your answer</dt>
          <dd className="mt-0.5">{yours}</dd>
        </div>
        <div className="rounded-lg bg-sage-50 px-3 py-2 text-sage-700">
          <dt className="text-xs font-semibold">Correct answer</dt>
          <dd className="mt-0.5">
            {'ABCD'[question.answer]}. {question.options[question.answer]}
          </dd>
        </div>
      </dl>

      <details className="group mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">
          Reviewed solution
        </summary>
        <p className="mt-2 rounded-xl bg-ivory-100 p-4 text-sm leading-relaxed text-ink-700">{question.solution}</p>
      </details>

      <div className="mt-5 grid gap-4 sm:grid-cols-[14rem_1fr]">
        <Select
          label="Reason"
          value={entry.tag}
          onChange={(value) => onChange(entry.id, { tag: value })}
          options={TAG_OPTIONS}
        />
        <label className="block">
          <span className="mb-1.5 block font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-500">
            Your note
          </span>
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => {
              if (note !== (entry.note ?? '')) onChange(entry.id, { note })
            }}
            placeholder="What went wrong, and what will you do differently?"
            className="w-full resize-y rounded-xl border border-line bg-[#fffdf8] px-4 py-3 text-sm text-ink-900 shadow-soft transition placeholder:text-ink-400 hover:border-ink-900/30 focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15"
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
        <p className="text-xs text-ink-500">Logged {formatDate(entry.date)}</p>
        <Button
          size="sm"
          variant={revised ? 'outline' : 'primary'}
          icon={revised ? RotateCcw : Check}
          onClick={() => onChange(entry.id, { status: revised ? 'open' : 'revised' })}
        >
          {revised ? 'Reopen' : 'Mark as revised'}
        </Button>
      </div>
    </Card>
  )
}

export default function MistakeNotebook({ showSample }) {
  const [entries, setEntries] = useState(() => loadMistakes(showSample))
  const [status, setStatus] = useState('all')
  const [subject, setSubject] = useState('all')

  const update = (id, patch) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
    saveMistakeEdit(id, patch)
  }

  const visible = entries.filter(
    (entry) =>
      (status === 'all' || entry.status === status) &&
      (subject === 'all' || entry.question.subject === subject),
  )
  const openCount = entries.filter((entry) => entry.status === 'open').length

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Your mistake notebook is empty"
        description="Incorrect answers from practice sets and mock tests are added here automatically, so you can tag the reason and revise them."
      >
        <Button to={ROUTES.practice} variant="accent">
          Start a practice set
        </Button>
      </EmptyState>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <Chip active={status === 'all'} count={entries.length} onClick={() => setStatus('all')}>
            All
          </Chip>
          <Chip active={status === 'open'} count={openCount} onClick={() => setStatus('open')}>
            Open
          </Chip>
          <Chip active={status === 'revised'} count={entries.length - openCount} onClick={() => setStatus('revised')}>
            Revised
          </Chip>
        </div>
        <Select
          className="w-full sm:w-56"
          label="Subject"
          value={subject}
          onChange={setSubject}
          options={SUBJECT_OPTIONS}
        />
      </div>

      {visible.length > 0 ? (
        <ul className="mt-6 space-y-5">
          {visible.map((entry) => (
            <li key={entry.id}>
              <MistakeCard entry={entry} onChange={update} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-6"
          title="No entries match"
          description="Change the status or subject filter to see more."
        />
      )}
    </div>
  )
}