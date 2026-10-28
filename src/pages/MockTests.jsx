import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowRight, Lock, Timer } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import ExamSession from '../components/practice/ExamSession'
import { PaletteLegend } from '../components/practice/QuestionPalette'
import ResultsView from '../components/practice/ResultsView'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useToast } from '../hooks/useToast'
import { usePlan } from '../hooks/usePlan'
import { MOCK_TESTS, getMockMaxScore, getMockTestById } from '../data/mockTests'
import { getQuestionById } from '../data/questions'
import { getAttempts, recordAttempt } from '../utils/attemptStore'
import { MARKING } from '../utils/constants'
import { formatDate } from '../utils/format'
import { ROUTES, mockPath, resourcePath } from '../utils/routes'

const minus = (value) => String(value).replace('-', '−')

function MockView() {
  const [params] = useSearchParams()
  const { isPremium, setPlan } = usePlan()
  const toast = useToast()
  const requested = params.get('test')
  const test = getMockTestById(requested)
  const [session, setSession] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const [agreed, setAgreed] = useState(false)
  const [attempts] = useState(() => getAttempts().filter((item) => item.kind === 'mock').slice(0, 5))

  const begin = (target) =>
    setSession({
      key: Date.now(),
      test: target,
      questions: target.questionIds.map((id) => getQuestionById(id)),
    })

  const handleFinish = ({ answers, timeSeconds, reason }) => {
    const result = recordAttempt({
      kind: 'mock',
      title: session.test.title,
      testId: session.test.id,
      questions: session.questions,
      answers,
      timeSeconds,
    })
    setOutcome({ test: session.test, result, timeSeconds, reason })
    setSession(null)
  }

  if (session) {
    return (
      <ExamSession
        key={session.key}
        title={session.test.title}
        subtitle={`${session.questions.length} questions · ${session.test.durationMinutes} min`}
        questions={session.questions}
        durationSeconds={session.test.durationMinutes * 60}
        mode="mock"
        onFinish={handleFinish}
        onExit={() => setSession(null)}
      />
    )
  }

  if (outcome) {
    return (
      <ResultsView
        title={outcome.test.title}
        kindLabel="Mock test result"
        result={outcome.result}
        timeSeconds={outcome.timeSeconds}
        durationSeconds={outcome.test.durationMinutes * 60}
        reason={outcome.reason}
        showDifficulty={false}
        actions={
          <>
            <Button
              variant="accent"
              onClick={() => {
                setOutcome(null)
                begin(outcome.test)
              }}
            >
              Retake test
            </Button>
            <Button to={ROUTES.mocks} variant="outline">
              All mock tests
            </Button>
            <Button to={ROUTES.analytics} variant="ghost" iconRight={ArrowRight}>
              Analytics
            </Button>
          </>
        }
      />
    )
  }

  if (test) {
    const locked = test.premium && !isPremium
    const rules = [
      `The test has ${test.questionIds.length} single-correct questions and lasts ${test.durationMinutes} minutes. The timer starts when you press Begin and cannot be paused.`,
      `Marking: +${MARKING.correct} for a correct answer, ${minus(MARKING.wrong)} for an incorrect answer and 0 for an unattempted question.`,
      'Use the question palette to jump between questions. Use Mark for review to flag a question you want to revisit. A marked question that has an answer is still evaluated.',
      'The test is submitted automatically when time ends. You can also submit earlier after a confirmation step.',
      'Solutions and a chapter-wise analysis appear after you submit.',
    ]

    return (
      <>
        <PageHeader eyebrow="Mock test" title={test.title} description={test.description}>
          <Button to={ROUTES.mocks} variant="ghost">
            All mock tests
          </Button>
        </PageHeader>

        <section className="page-container grid gap-6 py-10 sm:py-14 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <Card className="p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Instructions</h2>
            <ol className="mt-5 space-y-4">
              {rules.map((rule, i) => (
                <li key={rule} className="flex gap-4 leading-relaxed text-ink-700">
                  <span className="tabular mt-0.5 font-mono text-sm text-ember-600">{String(i + 1).padStart(2, '0')}</span>
                  {rule}
                </li>
              ))}
            </ol>
            <h3 className="mt-8 text-lg font-semibold">Question palette key</h3>
            <PaletteLegend className="mt-4 sm:grid-cols-2" />
          </Card>

          <Card className="p-6 sm:p-8 lg:sticky lg:top-24">
            <dl className="grid grid-cols-3 gap-3">
              {[
                ['Questions', test.questionIds.length],
                ['Minutes', test.durationMinutes],
                ['Max score', getMockMaxScore(test)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-ivory-100 px-3 py-3 text-center">
                  <dt className="text-xs text-ink-500">{label}</dt>
                  <dd className="tabular mt-0.5 font-display text-2xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            {locked ? (
              <div className="mt-6">
                <p className="flex items-center gap-2 font-semibold text-ink-900">
                  <Lock size={16} aria-hidden="true" />
                  This test is part of Premium
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Demo only: no payment is taken. Unlock Premium on this device to try the test.
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <Button
                    variant="accent"
                    size="lg"
                    onClick={() => {
                      setPlan('premium')
                      toast({ title: 'Premium unlocked on this device', description: 'Demo mode, nothing was charged.' })
                    }}
                  >
                    Unlock on this device (demo)
                  </Button>
                  <Button to={ROUTES.pricing} variant="outline" size="lg">
                    See pricing
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-700">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                    className="mt-1 size-4 shrink-0 accent-ember-500"
                  />
                  I have read the instructions and I am ready to begin.
                </label>
                <Button
                  variant="accent"
                  size="lg"
                  className="mt-5 w-full"
                  icon={Timer}
                  disabled={!agreed}
                  onClick={() => begin(test)}
                >
                  Begin test
                </Button>
              </div>
            )}
          </Card>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Mock tests"
        title="Sit a test that behaves like the real one"
        description="A running timer, a question palette, mark-for-review and exam marking, followed by a full result and solutions."
      />

      <section className="page-container py-10 sm:py-14">
        {requested && (
          <p role="alert" className="mb-6 rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger-500">
            That test was not found. Choose one from the list below.
          </p>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {MOCK_TESTS.map((item, index) => {
            const locked = item.premium && !isPremium
            return (
              <Card
                key={item.id}
                as="article"
                interactive
                className="animate-rise stagger flex flex-col p-6 sm:p-7"
                style={{ '--d': `${index * 70}ms` }}
              >
                <div className="flex items-center gap-2">
                  {item.premium ? (
                    <Badge tone={locked ? 'ember' : 'sage'} icon={locked ? Lock : undefined}>
                      {locked ? 'Premium' : 'Premium unlocked'}
                    </Badge>
                  ) : (
                    <Badge tone="sage">Free</Badge>
                  )}
                </div>
                <h2 className="mt-4 text-2xl font-semibold">{item.title}</h2>
                <p className="mt-2 leading-relaxed text-ink-600">{item.description}</p>
                <dl className="mt-5 flex gap-6 text-sm">
                  {[
                    ['Questions', item.questionIds.length],
                    ['Minutes', item.durationMinutes],
                    ['Max score', getMockMaxScore(item)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-ink-500">{label}</dt>
                      <dd className="tabular mt-0.5 font-display text-xl font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  <Button to={mockPath(item.id)} variant="primary" iconRight={ArrowRight}>
                    View instructions
                  </Button>
                  <Link
                    to={resourcePath(item.resourceId)}
                    className="text-sm font-medium text-ink-600 underline-offset-4 hover:text-ember-600 hover:underline"
                  >
                    Details
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>

        {attempts.length > 0 && (
          <div className="mt-14">
            <h2 className="text-2xl font-semibold">Your recent mock attempts</h2>
            <Card className="mt-5 p-2 sm:p-3">
              <ul className="divide-y divide-line-soft">
                {attempts.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3.5">
                    <div>
                      <p className="font-medium text-ink-900">{item.title}</p>
                      <p className="text-xs text-ink-500">{formatDate(item.date)}</p>
                    </div>
                    <p className="tabular font-mono text-sm font-medium text-ink-800">
                      {minus(item.score)} / {item.maxScore}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </section>
    </>
  )
}

export default function MockTests() {
  const location = useLocation()
  return <MockView key={location.key} />
}