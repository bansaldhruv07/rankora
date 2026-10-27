import { percent } from './format'

export function getTestStats(test) {
  const totals = Object.values(test.bySubject).reduce(
    (acc, [correct, wrong, unattempted]) => ({
      correct: acc.correct + correct,
      wrong: acc.wrong + wrong,
      unattempted: acc.unattempted + unattempted,
    }),
    { correct: 0, wrong: 0, unattempted: 0 },
  )
  const attempted = totals.correct + totals.wrong
  return { ...totals, attempted, accuracy: percent(totals.correct, attempted) }
}

export function getSubjectAccuracy(history) {
  const totals = {}
  history.forEach((test) => {
    Object.entries(test.bySubject).forEach(([subject, [correct, wrong]]) => {
      const current = totals[subject] ?? { correct: 0, attempted: 0 }
      totals[subject] = {
        correct: current.correct + correct,
        attempted: current.attempted + correct + wrong,
      }
    })
  })
  Object.values(totals).forEach((entry) => {
    entry.accuracy = percent(entry.correct, entry.attempted)
  })
  return totals
}

export function getWeakTopics(topics, limit = 3) {
  return topics
    .map((topic) => ({ ...topic, accuracy: percent(topic.correct, topic.attempted) }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit)
}

export function getSummary(history) {
  if (history.length === 0) {
    return { tests: 0, latest: 0, best: 0, average: 0, accuracy: 0 }
  }
  const scores = history.map((test) => test.score)
  const stats = history.map(getTestStats)
  const correct = stats.reduce((sum, item) => sum + item.correct, 0)
  const attempted = stats.reduce((sum, item) => sum + item.attempted, 0)
  return {
    tests: history.length,
    latest: scores[scores.length - 1],
    best: Math.max(...scores),
    average: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
    accuracy: percent(correct, attempted),
  }
}