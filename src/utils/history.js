import { SAMPLE_MAX_SCORE, TEST_HISTORY, TOPIC_STATS } from '../data/analytics'
import { getAttempts } from './attemptStore'
import { getTestStats } from './analytics'
import { percent } from './format'

export const MAX_CHART_POINTS = 8

export const scorePercent = (entry) => Math.max(0, percent(entry.score, entry.maxScore))

export function loadHistory(includeSample) {
  const saved = getAttempts().map((attempt) => ({
    id: attempt.id,
    name: attempt.title,
    kind: attempt.kind,
    date: attempt.date,
    timestamp: attempt.timestamp ?? 0,
    score: attempt.score,
    maxScore: attempt.maxScore,
    timeSeconds: attempt.timeSeconds ?? 0,
    bySubject: attempt.bySubject ?? {},
    chapters: attempt.chapters ?? [],
    sample: false,
  }))

  const sample = includeSample
    ? TEST_HISTORY.map((test, index) => ({
        id: test.id,
        name: test.name,
        kind: 'mock',
        date: test.date,
        timestamp: index,
        score: test.score,
        maxScore: SAMPLE_MAX_SCORE,
        timeSeconds: test.timeMinutes * 60,
        bySubject: test.bySubject,
        chapters: [],
        sample: true,
      }))
    : []

  return [...sample, ...saved].sort(
    (a, b) => a.date.localeCompare(b.date) || a.timestamp - b.timestamp,
  )
}

export function summarize(history) {
  if (history.length === 0) return null
  const percents = history.map(scorePercent)
  const stats = history.map(getTestStats)
  const correct = stats.reduce((sum, item) => sum + item.correct, 0)
  const attempted = stats.reduce((sum, item) => sum + item.attempted, 0)
  return {
    tests: history.length,
    latest: history[history.length - 1],
    latestPct: percents[percents.length - 1],
    bestPct: Math.max(...percents),
    avgPct: Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length),
    accuracy: percent(correct, attempted),
  }
}

export function buildTopicStats(history, includeSample) {
  const map = new Map()
  const add = (subject, chapter, attempted, correct) => {
    const key = `${subject}|${chapter}`
    const current = map.get(key) ?? { subject, chapter, attempted: 0, correct: 0 }
    current.attempted += attempted
    current.correct += correct
    map.set(key, current)
  }

  if (includeSample) {
    TOPIC_STATS.forEach((topic) => add(topic.subject, topic.chapter, topic.attempted, topic.correct))
  }
  history
    .filter((entry) => !entry.sample)
    .forEach((entry) =>
      entry.chapters.forEach((item) =>
        add(item.subject, item.chapter, item.correct + item.wrong, item.correct),
      ),
    )

  return [...map.values()].filter((topic) => topic.attempted > 0)
}