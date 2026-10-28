import { RESOURCES } from '../data/resources'
import { getWeakTopics } from './analytics'
import { mockPath, practicePath, resourcePath } from './routes'

const EXTRA_MATCHES = {
  'Rotational Motion': ['phy-mechanics-formulas'],
  'Work, Energy and Power': ['phy-mechanics-formulas'],
}

const MINUTES = { notes: 25, formula: 15, pyq: 40 }

const priorityFor = (accuracy) => (accuracy < 40 ? 'High' : accuracy < 60 ? 'Medium' : 'Low')

export function buildRecommendations(topics, limit = 4) {
  return getWeakTopics(topics, limit)
    .filter((topic) => topic.accuracy < 80)
    .map((topic) => {
      const extra = EXTRA_MATCHES[topic.chapter] ?? []
      const candidates = RESOURCES.filter(
        (resource) =>
          resource.type !== 'mock' && (resource.chapter === topic.chapter || extra.includes(resource.id)),
      )
      const preferred = topic.accuracy < 50 ? 'notes' : 'pyq'
      const resource = candidates.find((item) => item.type === preferred) ?? candidates[0] ?? null

      return {
        id: `${topic.subject}-${topic.chapter}`,
        title: topic.chapter,
        subject: topic.subject,
        accuracy: topic.accuracy,
        reason: `${topic.correct} of ${topic.attempted} attempted questions correct (${topic.accuracy}%).`,
        priority: priorityFor(topic.accuracy),
        resource,
        practiceLink: practicePath({ subject: topic.subject, chapter: topic.chapter }),
        minutes: resource ? MINUTES[resource.type] : 20,
      }
    })
}

function task(day, label, minutes, to) {
  return { id: `${day}:${label}`, label, minutes, to }
}

export function buildWeeklyPlan(recommendations) {
  const study = ['Mon', 'Tue', 'Wed', 'Thu'].map((day, index) => {
    const rec = recommendations[index]
    if (!rec) {
      return {
        day,
        focus: 'Mixed practice',
        tasks: [task(day, 'Ten mixed practice questions', 25, practicePath())],
      }
    }
    const tasks = []
    if (rec.resource) {
      tasks.push(task(day, `Revise: ${rec.resource.title}`, MINUTES[rec.resource.type], resourcePath(rec.resource.id)))
    }
    tasks.push(task(day, `Practise ${rec.title}`, 20, rec.practiceLink))
    return { day, focus: rec.title, tasks }
  })

  return [
    ...study,
    { day: 'Fri', focus: 'Review', tasks: [task('Fri', 'Go through the mistake notebook', 30, null)] },
    { day: 'Sat', focus: 'Mock test', tasks: [task('Sat', 'Full Mock 1: Mixed Paper', 60, mockPath('full-mock-1'))] },
    { day: 'Sun', focus: 'Recap and rest', tasks: [task('Sun', 'Review the mock, then rest', 30, null)] },
  ]
}