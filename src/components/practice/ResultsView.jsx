import { useState } from 'react'
import { Check, ChevronDown, Minus, Timer, X } from 'lucide-react'
import ResourceCard from '../common/ResourceCard'
import { DifficultyBadge, SubjectBadge } from '../ui/Badge'
import Card from '../ui/Card'
import Chip from '../ui/Chip'
import ProgressBar from '../ui/ProgressBar'
import SectionHeading from '../ui/SectionHeading'
import { TabPanel, Tabs } from '../ui/Tabs'
import { MARKING } from '../../utils/constants'
import { formatClock } from '../../utils/format'
import { getRecommendedResources } from '../../utils/practiceSets'
import { getSubjectTheme } from '../../utils/subjectTheme'
import { cn } from '../../utils/cn'

const STATUS = {
  correct: { label: 'Correct', icon: Check, tone: 'bg-sage-100 text-sage-700' },
  wrong: { label: 'Incorrect', icon: X, tone: 'bg-danger-100 text-danger-500' },
  unattempted: { label: 'Unattempted', icon: Minus, tone: 'bg-ivory-200 text-ink-600' },
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'wrong', label: 'Incorrect' },
  { id: 'unattempted', label: 'Unattempted' },
  { id: 'correct', label: 'Correct' },
]

const minus = (value) => String(value).replace('-', '−')
const strengthTone = (value) => (value >= 70 ? 'sage' : value >= 40 ? 'ember' : 'danger')

export default function ResultsView({ title, kindLabel, result, timeSeconds, durationSeconds, reason, showDifficulty = true, actions }) {
  const [tab, setTab] = useState('overview')
  const [filter, setFilter] = useState('all')

  const recommended = getRecommendedResources(result.byChapter, 3)
  const rows = result.rows.filter((row) => filter === 'all' || row.status === filter)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'solutions', label: 'Solutions', count: result.total },
  ]

  const stats = [
    { label: 'Correct', value: result.correct, tone: 'text-sage-700' },
    { label: 'Incorrect', value: result.wrong, tone: 'text-danger-500' },
    { label: 'Unattempted', value: result.unattempted, tone: 'text-ink-700' },
    { label: 'Accuracy', value: `${result.accuracy}%`, hint: 'of attempted' },
    { label: 'Time used', value: formatClock(timeSeconds), hint: `of ${formatClock(durationSeconds)}` },
  ]

  const summary =
    result.attempted === 0
      ? 'No questions were attempted.'
      : `You attempted ${result.attempted} of ${result.total} questions with ${result.accuracy}% accuracy.`

  return (
    <>
      <header className="border-b border-line-soft bg-ivory-100/60">
        <div className="page-container py-10 sm:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="animate-rise mb-4 flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ember-600">
                <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
                {kindLabel}
              </p>
              <h1 className="animate-rise stagger text-4xl font-semibold leading-[1.1] sm:text-5xl" style={{ '--d': '60ms' }}>
                {title}
              </h1>
              <p className="animate-rise stagger mt-4 text-lg leading-relaxed text-ink-600" style={{ '--d': '140ms' }}>
                {summary}
                {reason === 'timeout' && ' The test was submitted automatically when time ran out.'}
              </p>
            </div>
            {actions && (
              <div className="animate-rise stagger flex flex-wrap gap-3" style={{ '--d': '200ms' }}>
                {actions}
              </div>
            )}
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_2fr]">
            <Card className="animate-pop stagger p-6 sm:p-7" style={{ '--d': '120ms' }}>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-400">Score</p>
              <p className="tabular mt-2 font-display text-6xl font-semibold leading-none">
                {minus(result.score)}
                <span className="ml-2 text-2xl font-medium text-ink-400">/ {result.maxScore}</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-600">
                {result.correct} × +{MARKING.correct} and {result.wrong} × {minus(MARKING.wrong)}
              </p>
            </Card>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="animate-rise stagger rounded-2xl border border-line bg-[#fffdf8] px-4 py-4 shadow-soft"
                  style={{ '--d': `${160 + i * 50}ms` }}
                >
                  <dt className="flex items-center gap-1.5 text-xs text-ink-500">
                    {stat.label === 'Time used' && <Timer size={12} aria-hidden="true" />}
                    {stat.label}
                  </dt>
                  <dd className={cn('tabular mt-1 font-display text-3xl font-semibold', stat.tone)}>{stat.value}</dd>
                  {stat.hint && <p className="mt-0.5 text-xs text-ink-400">{stat.hint}</p>}
                </div>
              ))}
            </dl>
          </div>
        </div>
      </header>

      <section className="page-container py-10 sm:py-14">
        <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="result" label="Result sections" />

        <TabPanel idPrefix="result" id="overview" value={tab} className="pt-8">
          <h2 className="text-2xl font-semibold">By subject</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {Object.entries(result.bySubject).map(([subject, tally]) => {
              const theme = getSubjectTheme(subject)
              const Icon = theme.icon
              return (
                <Card key={subject} className="p-5">
                  <div className="flex items-center justify-between">
                    <span className={cn('flex items-center gap-2 font-semibold', theme.text)}>
                      <Icon size={18} aria-hidden="true" />
                      {theme.label}
                    </span>
                    <span className="tabular font-mono text-sm text-ink-700">
                      {minus(tally.score)} / {tally.total * MARKING.correct}
                    </span>
                  </div>
                  <ProgressBar
                    className="mt-4"
                    size="sm"
                    value={tally.correct}
                    max={tally.total}
                    tone={subject === 'physics' ? 'ink' : subject === 'chemistry' ? 'sage' : 'ember'}
                    label={`${tally.correct} of ${tally.total} correct`}
                  />
                  <p className="mt-3 text-xs text-ink-500">
                    {tally.wrong} incorrect · {tally.unattempted} unattempted
                  </p>
                </Card>
              )
            })}
          </div>

          <h2 className="mt-12 text-2xl font-semibold">By chapter, weakest first</h2>
          <Card className="mt-5 p-2 sm:p-3">
            <ul className="divide-y divide-line-soft">
              {result.byChapter.map((item) => (
                <li key={`${item.subject}-${item.chapter}`} className="grid gap-3 px-3 py-4 sm:grid-cols-[1.6fr_1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{item.chapter}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{getSubjectTheme(item.subject).label}</p>
                  </div>
                  <ProgressBar
                    size="sm"
                    value={item.correct}
                    max={item.total}
                    tone={strengthTone(item.strength)}
                    label={`${item.chapter} accuracy`}
                    className="[&>div:first-child]:sr-only"
                  />
                  <p className="tabular font-mono text-sm text-ink-700">
                    {item.correct}/{item.total} correct
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          {recommended.length > 0 && (
            <div className="mt-14">
              <SectionHeading
                eyebrow="Revise next"
                title="Resources for your weaker chapters"
                description="Matched to the chapters where marks were lost in this attempt."
              />
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </div>
          )}
        </TabPanel>

        <TabPanel idPrefix="result" id="solutions" value={tab} className="pt-8">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter solutions">
            {FILTERS.map((item) => (
              <Chip
                key={item.id}
                active={filter === item.id}
                count={item.id === 'all' ? result.total : result[item.id]}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </Chip>
            ))}
          </div>

          <ol className="mt-6 space-y-4">
            {rows.map((row) => {
              const { question } = row
              const number = result.rows.indexOf(row) + 1
              const status = STATUS[row.status]
              const StatusIcon = status.icon
              return (
                <li key={question.id}>
                  <details
                    open={row.status === 'wrong'}
                    className="group rounded-2xl border border-line bg-[#fffdf8] shadow-soft"
                  >
                    <summary className="flex cursor-pointer list-none items-start gap-4 p-5 [&::-webkit-details-marker]:hidden">
                      <span
                        className={cn(
                          'mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                          status.tone,
                        )}
                      >
                        <StatusIcon size={12} aria-hidden="true" />
                        {status.label}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-xs text-ink-400">Q{number}</span>
                        <span className="mt-1 block font-medium leading-relaxed text-ink-900">{question.text}</span>
                      </span>
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-ink-400 transition-transform duration-300 group-open:rotate-180"
                      />
                    </summary>

                    <div className="border-t border-line-soft px-5 pb-5 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <SubjectBadge subject={question.subject} />
                        {showDifficulty && <DifficultyBadge level={question.difficulty} />}
                        <span className="text-xs text-ink-500">{question.chapter}</span>
                      </div>
                      <ul className="mt-4 space-y-2">
                        {question.options.map((option, i) => {
                          const isCorrect = i === question.answer
                          const isSelected = i === row.selected
                          const tag =
                            isCorrect && isSelected
                              ? 'Your answer, correct'
                              : isCorrect
                                ? 'Correct answer'
                                : isSelected
                                  ? 'Your answer'
                                  : null
                          return (
                            <li
                              key={option}
                              className={cn(
                                'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm',
                                isCorrect
                                  ? 'border-sage-500 bg-sage-50 font-medium text-sage-700'
                                  : isSelected
                                    ? 'border-danger-500 bg-danger-100 font-medium text-danger-500'
                                    : 'border-line-soft text-ink-600',
                              )}
                            >
                              <span className="font-mono text-xs">{'ABCD'[i]}</span>
                              <span className="flex-1">{option}</span>
                              {tag && <span className="text-xs font-semibold">{tag}</span>}
                            </li>
                          )
                        })}
                      </ul>
                      {row.status === 'unattempted' && (
                        <p className="mt-3 text-sm text-ink-500">You did not answer this question.</p>
                      )}
                      <div className="mt-4 rounded-xl bg-ivory-100 p-4">
                        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ember-600">
                          Reviewed solution
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{question.solution}</p>
                      </div>
                    </div>
                  </details>
                </li>
              )
            })}
          </ol>
        </TabPanel>
      </section>
    </>
  )
}