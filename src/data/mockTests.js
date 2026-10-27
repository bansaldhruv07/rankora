import { QUESTIONS } from './questions'
import { MARKING } from '../utils/constants'

const idsFor = (subject) =>
  QUESTIONS.filter((question) => question.subject === subject).map((question) => question.id)

export const MOCK_TESTS = [
  {
    id: 'full-mock-1',
    resourceId: 'mock-full-1',
    title: 'Full Mock 1: Mixed Paper',
    description: 'Ten questions each from Physics, Chemistry and Mathematics, timed like the real paper.',
    durationMinutes: 60,
    premium: false,
    questionIds: [...idsFor('physics'), ...idsFor('chemistry'), ...idsFor('mathematics')],
  },
  {
    id: 'physics-sectional',
    resourceId: 'mock-physics-sectional',
    title: 'Physics Sectional Mock',
    description: 'A ten-question Physics section across mechanics, electricity, optics and modern physics.',
    durationMinutes: 20,
    premium: true,
    questionIds: idsFor('physics'),
  },
  {
    id: 'chemistry-sectional',
    resourceId: 'mock-chemistry-sectional',
    title: 'Chemistry Sectional Mock',
    description: 'A ten-question Chemistry section across physical, inorganic and organic chemistry.',
    durationMinutes: 20,
    premium: true,
    questionIds: idsFor('chemistry'),
  },
  {
    id: 'mathematics-sectional',
    resourceId: 'mock-maths-sectional',
    title: 'Mathematics Sectional Mock',
    description: 'A ten-question Mathematics section across algebra, calculus, vectors and geometry.',
    durationMinutes: 20,
    premium: true,
    questionIds: idsFor('mathematics'),
  },
]

export function getMockTestById(id) {
  return MOCK_TESTS.find((test) => test.id === id)
}

export function getMockMaxScore(test) {
  return test.questionIds.length * MARKING.correct
}