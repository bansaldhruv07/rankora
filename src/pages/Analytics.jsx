import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, RotateCcw } from 'lucide-react'
import HistoryTable from '../components/analytics/HistoryTable'
import MistakeNotebook from '../components/analytics/MistakeNotebook'
import RevisionPlan from '../components/analytics/RevisionPlan'
import ScoreChart from '../components/analytics/ScoreChart'
import PageHeader from '../components/common/PageHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import ProgressBar from '../components/ui/ProgressBar'
import { TabPanel, Tabs } from '../components/ui/Tabs'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useToast } from '../hooks/useToast'
import { ANALYTICS_NOTE } from '../data/analytics'
import { getSubjectAccuracy, getWeakTopics } from '../utils/analytics'
import { STORAGE_KEYS } from '../utils/constants'
import { formatDate } from '../utils/format'
import { MAX_CHART_POINTS, buildTopicStats, loadHistory, scorePercent, summarize } from '../utils/history'
import { buildRecommendations, buildWeeklyPlan } from '../utils/recommendations'
import { resetLearningData } from '../utils/resetData'
import { DIAGNOSTIC_PATH, ROUTES, practicePath } from '../utils/routes'
import { SUBJECT_THEME } from '../utils/subjectTheme'

const TONES = { physics: 'ink', chemistry: 'sage', mathematics: 'ember' }
const minus = (value) => String(value).replace('-', '−')
const accuracyTone = (value) => (value >= 70 ? 'sage' : value >= 50 ? 'ember' : 'danger')
const accuracyText = (value) =>
  value >= 70 ? 'text-sage-700' : value >= 50 ? 'text-ember-600' : 'text-danger-500'

function AnalyticsView({ onReset }) {
  const toast = useToast()
  const [showSample, setShowSample] = useLocalStorage(STORAGE_KEYS.showSample, true)
  const [tab, setTab] = useState('revision')
  const [resetOpen, setResetOpen] = useState(false)

  const history = useMemo(() => loadHistory(showSample), [showSample])
  const topics = useMemo(() => buildTopicStats(history, showSample), [history, showSample])
  const recommendations = useMemo(() => buildRecommendations(topics), [topics])
  const plan = useMemo(() => buildWeeklyPlan(recommendations), [recommendations])

  const hasReal = history.some((entry) => !entry.sample)
  const summary = summarize(history)

  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        size="sm"
        icon={showSample ? EyeOff : Eye}
        aria-pressed={showSample}
        onClick={() => setShowSample(!showSample)}
      >
        {showSample ? 'Hide sample data' : 'Show sample data'}
      </Button>
      {hasReal && (
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setResetOpen(true)}>
          Reset my data
        </Button>
      )}
    </div>
  )

  if (!summary) {
    return (
      <>
        <PageHeader
          eyebrow="Analytics"
          title="Your preparation, measured"
          description="Scores, accuracy, weak chapters and mistakes, calculated from the tests you take."
        >
          {headerActions}
        </PageHeader>
        <section className="page-container py-14">
          <EmptyState
            title="No attempts yet"
            description="Take the diagnostic or a mock test and your results will appear here. You can also turn the sample data back on to preview the dashboard."
          >
            <div className="flex flex-wrap justify-center gap-3">
              <Button to={DIAGNOSTIC_PATH} variant="accent">
                Take the diagnostic test
              </Button>
              <Button variant="outline" onClick={() => setShowSample(true)}>
                Show sample data
              </Button>
            </div>
          </EmptyState>
        </section>
      </>
    )
  }

  const chartData = history
    .slice(-MAX_CHART_POINTS)
    .map((entry) => ({ label: formatDate(entry.date), value: scorePercent(entry) }))
  const subjectAccuracy = Object.entries(getSubjectAccuracy(history))
  const weak = getWeakTopics(topics, 5)

  const stats = [
    { label: 'Tests taken', value: summary.tests },
    {
      label: 'Latest score',
      value: `${summary.latestPct}%`,
      hint: `${minus(summary.latest.score)} / ${summary.latest.maxScore}`,
    },
    { label: 'Best score', value: `${summary.bestPct}%` },
    { label: 'Average score', value: `${summary.avgPct}%` },
    { label: 'Overall accuracy', value: `${summary.accuracy}%`, hint: 'of attempted' },
  ]

  const tabs = [
    { id: 'revision', label: 'Revision plan' },
    { id: 'mistakes', label: 'Mistake notebook' },
    { id: 'history', label: 'Test history', count: history.length },
  ]

  const handleReset = () => {
    resetLearningData()
    setResetOpen(false)
    toast({ title: 'Your attempts were cleared', description: 'Bookmarks and your plan were kept.', tone: 'info' })
    onReset()
  }

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Your preparation, measured"
        description="Scores, accuracy, weak chapters and mistakes, calculated from the tests you take. No guesswork."
      >
        {headerActions}
      </PageHeader>

      <section className="page-container py-10 sm:py-14">
        {showSample && (
          <p className="mb-8 rounded-xl bg-ember-50 px-5 py-3.5 text-sm leading-relaxed text-ember-700">
            {hasReal
              ? 'Sample data is mixed with your own attempts. Hide it to see only your results.'
              : ANALYTICS_NOTE}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="animate-rise stagger rounded-2xl border border-line bg-[#fffdf8] p-5 shadow-soft"
              style={{ '--d': `${index * 50}ms` }}
            >
              <dt className="text-xs text-ink-500">{stat.label}</dt>
              <dd className="tabular mt-1 font-display text-3xl font-semibold">{stat.value}</dd>
              {stat.hint && <p className="mt-0.5 truncate text-xs text-ink-400">{stat.hint}</p>}
            </div>
          ))}
        </dl>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Score progress</h2>
              <Badge>Last {chartData.length} tests</Badge>
            </div>
            <div className="mt-5">
              <ScoreChart
                key={`${showSample}-${history.length}`}
                data={chartData}
                max={100}
                label="Score as a percentage of the maximum"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Each point is the score as a percentage of that test&apos;s maximum. Negative scores are plotted as 0.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Accuracy by subject</h2>
            <div className="mt-5 space-y-5">
              {subjectAccuracy.map(([subject, entry]) => (
                <div key={subject}>
                  <ProgressBar
                    label={SUBJECT_THEME[subject].label}
                    value={entry.accuracy}
                    tone={TONES[subject]}
                    showValue
                  />
                  <p className="mt-1 text-xs text-ink-500">
                    {entry.correct} of {entry.attempted} attempted correct
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Weak topics</h2>
                <p className="mt-1 text-sm text-ink-600">Your lowest-accuracy chapters, weakest first.</p>
              </div>
              <Link
                to={ROUTES.practice}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ember-600 underline-offset-4 hover:underline"
              >
                Open practice
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-5 divide-y divide-line-soft">
              {weak.map((topic) => (
                <li
                  key={`${topic.subject}-${topic.chapter}`}
                  className="grid items-center gap-3 py-4 sm:grid-cols-[1.4fr_1.2fr_auto_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-900">{topic.chapter}</p>
                    <p className="text-xs text-ink-500">{SUBJECT_THEME[topic.subject].label}</p>
                  </div>
                  <ProgressBar
                    size="sm"
                    value={topic.accuracy}
                    tone={accuracyTone(topic.accuracy)}
                    label={`${topic.chapter} accuracy`}
                    className="[&>div:first-child]:sr-only"
                  />
                  <p className={`tabular font-mono text-sm font-semibold ${accuracyText(topic.accuracy)}`}>
                    {topic.accuracy}%
                    <span className="ml-2 font-normal text-ink-400">
                      {topic.correct}/{topic.attempted}
                    </span>
                  </p>
                  <Button
                    to={practicePath({ subject: topic.subject, chapter: topic.chapter })}
                    variant="outline"
                    size="sm"
                  >
                    Practise
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="mt-12">
          <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="analytics" label="Analytics sections" />
          <TabPanel idPrefix="analytics" id="revision" value={tab} className="pt-8">
            <RevisionPlan recommendations={recommendations} plan={plan} />
          </TabPanel>
          <TabPanel idPrefix="analytics" id="mistakes" value={tab} className="pt-8">
            <MistakeNotebook key={String(showSample)} showSample={showSample} />
          </TabPanel>
          <TabPanel idPrefix="analytics" id="history" value={tab} className="pt-8">
            <HistoryTable history={history} />
          </TabPanel>
        </div>
      </section>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Clear your attempts?"
        description="This removes your saved attempts, mistake notebook entries and plan ticks from this browser. Bookmarks and your plan stay as they are."
        footer={
          <>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Keep my data
            </Button>
            <Button variant="accent" onClick={handleReset}>
              Clear attempts
            </Button>
          </>
        }
      />
    </>
  )
}

export default function Analytics() {
  const [version, setVersion] = useState(0)
  return <AnalyticsView key={version} onReset={() => setVersion((value) => value + 1)} />
}