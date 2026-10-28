import { QUESTIONS } from '../data/questions'
import { RESOURCES } from '../data/resources'

export const SECONDS_PER_QUESTION = 90

export const practiceDuration = (count) => count * SECONDS_PER_QUESTION

export const toMinutes = (seconds) => Math.ceil(seconds / 60)

function interleaveBySubject(list) {
  const groups = new Map()
  list.forEach((question) => {
    if (!groups.has(question.subject)) groups.set(question.subject, [])
    groups.get(question.subject).push(question)
  })
  const queues = [...groups.values()]
  const result = []
  let added = true
  while (added) {
    added = false
    queues.forEach((queue) => {
      if (queue.length > 0) {
        result.push(queue.shift())
        added = true
      }
    })
  }
  return result
}

export function buildDiagnostic() {
  return ['physics', 'chemistry', 'mathematics'].flatMap((subject) =>
    ['Easy', 'Medium', 'Hard']
      .map((level) => QUESTIONS.find((q) => q.subject === subject && q.difficulty === level))
      .filter(Boolean),
  )
}

export function getPracticeChapters(subject = 'all') {
  const counts = new Map()
  QUESTIONS.filter((q) => subject === 'all' || q.subject === subject).forEach((q) => {
    counts.set(q.chapter, (counts.get(q.chapter) ?? 0) + 1)
  })
  return [...counts].map(([name, count]) => ({ name, count }))
}

export function getPracticePool({ subject = 'all', chapter = 'all', difficulty = 'all' } = {}) {
  const list = QUESTIONS.filter(
    (q) =>
      (subject === 'all' || q.subject === subject) &&
      (chapter === 'all' || q.chapter === chapter) &&
      (difficulty === 'all' || q.difficulty === difficulty),
  )
  return subject === 'all' ? interleaveBySubject(list) : list
}

export function getRecommendedResources(byChapter, limit = 3) {
  const weak = byChapter.filter((item) => item.correct < item.total)
  const picked = []
  const add = (resource) => {
    if (!picked.some((item) => item.id === resource.id)) picked.push(resource)
  }
  weak.forEach((item) =>
    RESOURCES.filter((r) => r.type !== 'mock' && r.chapter === item.chapter).forEach(add),
  )
  weak.forEach((item) =>
    RESOURCES.filter((r) => r.type !== 'mock' && r.subject === item.subject && r.price === 0).forEach(add),
  )
  return picked.slice(0, limit)
}