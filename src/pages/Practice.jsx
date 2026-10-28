import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, RotateCcw } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import ExamSession from '../components/practice/ExamSession'
import ResultsView from '../components/practice/ResultsView'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import { SUBJECTS } from '../data/subjects'
import { recordAttempt } from '../utils/attemptStore'
import {
  buildDiagnostic,
  getPracticeChapters,
  getPracticePool,
  practiceDuration,
  toMinutes,
} from '../utils/practiceSets'
import { DIFFICULTY_OPTIONS } from '../utils/resourceFilters'
import { ROUTES } from '../utils/routes'
import { getSubjectTheme } from '../utils/subjectTheme'
import { cn } from '../utils/cn'

const SUBJECT_OPTIONS = [
  { value: 'all', label: 'All subjects' },
  ...SUBJECTS.map((subject) => ({ value: subject.id, label: subject.name })),
]
const SUBJECT_IDS = SUBJECT_OPTIONS.map((option) => option.value)

function PracticeView() {
  const [params] = useSearchParams()
  const diagnosticMode = params.get('mode') === 'diagnostic'

  const [subject, setSubject] = useState(() => {
    const value = params.get('subject')
    return SUBJECT_IDS.includes(value) ? value : 'all'
  })
  const [chapter, setChapter] = useState(() => params.get('chapter') ?? 'all')
  const [difficulty, setDifficulty] = useState('all')
  const [count, setCount] = useState('all')
  const [session, setSession] = useState(null)
  const [outcome, setOutcome] = useState(null)

  const chapters = useMemo(() => getPracticeChapters(subject), [subject])
  const activeChapter = chapters.some((item) => item.name === chapter) ? chapter : 'all'
  const pool = useMemo(
    () => getPracticePool({ subject, chapter: activeChapter, difficulty }),
    [subject, activeChapter, difficulty],
  )

  const countOptions = [
    ...[5, 10].filter((n) => n < pool.length).map((n) => ({ value: String(n), label: `${n} questions` })),
    { value: 'all', label: `All ${pool.length}` },
  ]
  const activeCount = countOptions.some((option) => option.value === count) ? count : 'all'
  const limit = activeCount === 'all' ? pool.length : Number(activeCount)
  const selection = pool.slice(0, limit)

  const chapterOptions = [
    { value: 'all', label: 'All chapters' },
    ...chapters.map((item) => ({ value: item.name, label: `${item.name} (${item.count})` })),
  ]

  const begin = ({ kind, title, questions }) => {
    setOutcome(null)
    setSession({
      key: Date.now(),
      kind,
      title,
      questions,
      durationSeconds: practiceDuration(questions.length),
    })
  }

  const startPractice = () => {
    const base = subject === 'all' ? 'Mixed practice' : `${getSubjectTheme(subject).label} practice`
    begin({
      kind: 'practice',
      title: activeChapter === 'all' ? base : `${base}: ${activeChapter}`,
      questions: selection,
    })
  }

  const startDiagnostic = () =>
    begin({ kind: 'diagnostic', title: 'Diagnostic test', questions: buildDiagnostic() })

  const handleFinish = ({ answers, timeSeconds, reason }) => {
    const result = recordAttempt({
      kind: session.kind,
      title: session.title,
      questions: session.questions,
      answers,
      timeSeconds,
    })
    setOutcome({
      title: session.title,
      kind: session.kind,
      durationSeconds: session.durationSeconds,
      result,
      timeSeconds,
      reason,
    })
    setSession(null)
  }

  if (session) {
    return (
      <ExamSession
        key={session.key}
        title={session.title}
        subtitle={`${session.questions.length} questions · ${toMinutes(session.durationSeconds)} min`}
        questions={session.questions}
        durationSeconds={session.durationSeconds}
        mode="practice"
        onFinish={handleFinish}
        onExit={() => setSession(null)}
      />
    )
  }

  if (outcome) {
    const missed = outcome.result.rows.filter((row) => row.status !== 'correct').map((row) => row.question)
    return (
      <ResultsView
        title={outcome.title}
        kindLabel={outcome.kind === 'diagnostic' ? 'Diagnostic result' : 'Practice result'}
        result={outcome.result}
        timeSeconds={outcome.timeSeconds}
        durationSeconds={outcome.durationSeconds}
        reason={outcome.reason}
        actions={
          <>
            {missed.length > 0 && (
              <Button
                variant="accent"
                icon={RotateCcw}
                onClick={() => begin({ kind: 'practice', title: 'Retry: missed questions', questions: missed })}
              >
                Retry missed ({missed.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => setOutcome(null)}>
              New practice set
            </Button>
            <Button to={ROUTES.analytics} variant="ghost" iconRight={ArrowRight}>
              Analytics
            </Button>
          </>
        }
      />
    )
  }

  const diagnosticQuestions = buildDiagnostic()

  return (
    <>
      <PageHeader
        eyebrow="Practice"
        title="Practise by subject, chapter and difficulty"
        description="Timed, exam-style questions with a palette, mark-for-review and reviewed solutions after you submit."
      />

      <section className="page-container py-10 sm:py-14">
        <Card
          className={cn(
            'grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center',
            diagnosticMode && 'border-ember-500 ring-4 ring-ember-500/15',
          )}
        >
          <div>
            <p className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">
              <ClipboardCheck size={14} aria-hidden="true" />
              Diagnostic test
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Find out where you stand</h2>
            <p className="mt-2 max-w-xl leading-relaxed text-ink-600">
              {diagnosticQuestions.length} questions across Physics, Chemistry and Mathematics: one easy, one medium
              and one hard from each. About {toMinutes(practiceDuration(diagnosticQuestions.length))} minutes. Your
              result ends with chapters to revise.
            </p>
          </div>
          <Button variant="accent" size="lg" iconRight={ArrowRight} onClick={startDiagnostic} autoFocus={diagnosticMode}>
            Start diagnostic
          </Button>
        </Card>

        <Card className="mt-8 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Custom practice set</h2>
          <p className="mt-1 text-ink-600">Choose what to drill. Chapter counts show how many questions each has.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Subject"
              value={subject}
              onChange={(value) => {
                setSubject(value)
                setChapter('all')
              }}
              options={SUBJECT_OPTIONS}
            />
            <Select label="Chapter" value={activeChapter} onChange={setChapter} options={chapterOptions} />
            <Select label="Difficulty" value={difficulty} onChange={setDifficulty} options={DIFFICULTY_OPTIONS} />
            <Select label="Questions" value={activeCount} onChange={setCount} options={countOptions} />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-6">
            <p role="status" aria-live="polite" className="text-sm text-ink-600">
              {selection.length === 0 ? (
                'No questions match these filters. Try a different chapter or difficulty.'
              ) : (
                <>
                  <strong className="tabular font-semibold text-ink-900">{selection.length}</strong>{' '}
                  {selection.length === 1 ? 'question' : 'questions'} · about{' '}
                  {toMinutes(practiceDuration(selection.length))} min
                </>
              )}
            </p>
            <Button variant="primary" size="lg" iconRight={ArrowRight} disabled={selection.length === 0} onClick={startPractice}>
              Start practice
            </Button>
          </div>
        </Card>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-500">
          This demo bank has a small set of sample questions. Want more context before you start? Browse the{' '}
          <Link to={ROUTES.explore} className="font-medium text-ember-600 underline-offset-4 hover:underline">
            notes and formula sheets
          </Link>{' '}
          first.
        </p>
      </section>
    </>
  )
}

export default function Practice() {
  const location = useLocation()
  return <PracticeView key={location.key} />
}