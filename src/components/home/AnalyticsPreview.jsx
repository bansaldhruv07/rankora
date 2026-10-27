import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ScoreChart from '../analytics/ScoreChart'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'
import ProgressBar from '../ui/ProgressBar'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { useInView } from '../../hooks/useInView'
import { SAMPLE_MAX_SCORE, TEST_HISTORY, TOPIC_STATS } from '../../data/analytics'
import { getSubjectAccuracy, getSummary, getWeakTopics } from '../../utils/analytics'
import { formatDate } from '../../utils/format'
import { ROUTES } from '../../utils/routes'
import { SUBJECT_THEME } from '../../utils/subjectTheme'

const TONES = { physics: 'ink', chemistry: 'sage', mathematics: 'ember' }

export default function AnalyticsPreview() {
  const [chartRef, chartVisible] = useInView({ threshold: 0.3 })
  const summary = getSummary(TEST_HISTORY)
  const accuracy = getSubjectAccuracy(TEST_HISTORY)
  const weak = getWeakTopics(TOPIC_STATS, 3)
  const data = TEST_HISTORY.map((test) => ({ label: formatDate(test.date), value: test.score }))

  const stats = [
    { label: 'Latest score', value: `${summary.latest}/${SAMPLE_MAX_SCORE}` },
    { label: 'Best score', value: `${summary.best}/${SAMPLE_MAX_SCORE}` },
    { label: 'Overall accuracy', value: `${summary.accuracy}%` },
  ]

  return (
    <section className="page-container py-20 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Analytics"
          title="See where the marks are leaking"
          description="Scores, accuracy and weak chapters are calculated from your own attempts. The preview below uses sample data."
        >
          <Button to={ROUTES.analytics} variant="outline" iconRight={ArrowRight}>
            Open the dashboard
          </Button>
        </SectionHeading>
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">Mock score trend</h3>
              <Badge tone="ember">Sample data</Badge>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 border-b border-line-soft pb-5">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-ink-500">{stat.label}</dt>
                  <dd className="tabular mt-1 font-display text-2xl font-semibold sm:text-3xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
            <div ref={chartRef} className="mt-5 min-h-[12rem]">
              {chartVisible && <ScoreChart data={data} max={SAMPLE_MAX_SCORE} label="Mock score trend" />}
            </div>
          </Card>
        </Reveal>

        <div className="grid gap-6">
          <Reveal delay={100}>
            <Card className="p-6">
              <h3 className="text-xl font-semibold">Accuracy by subject</h3>
              <div className="mt-5 space-y-4">
                {Object.entries(accuracy).map(([subject, entry]) => (
                  <ProgressBar
                    key={subject}
                    label={SUBJECT_THEME[subject].label}
                    value={entry.accuracy}
                    tone={TONES[subject]}
                    showValue
                  />
                ))}
              </div>
            </Card>
          </Reveal>
          <Reveal delay={180}>
            <Card className="p-6">
              <h3 className="text-xl font-semibold">Weakest chapters</h3>
              <ul className="mt-4 divide-y divide-line-soft">
                {weak.map((topic) => (
                  <li key={topic.chapter} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{topic.chapter}</p>
                      <p className="text-xs text-ink-500">{SUBJECT_THEME[topic.subject].label}</p>
                    </div>
                    <span className="tabular font-mono text-sm font-medium text-danger-500">{topic.accuracy}%</span>
                  </li>
                ))}
              </ul>
              <Link
                to={ROUTES.analytics}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ember-600 underline-offset-4 hover:underline"
              >
                See revision recommendations
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  )
}