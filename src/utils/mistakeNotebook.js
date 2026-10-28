import { SAMPLE_MISTAKES } from '../data/analytics'
import { getQuestionById } from '../data/questions'
import { STORAGE_KEYS } from './constants'
import { getMistakes } from './attemptStore'
import { readStorage, writeStorage } from './storage'

export const MISTAKE_TAGS = [
  'Unreviewed',
  'Concept gap',
  'Misread question',
  'Calculation slip',
  'Time pressure',
  'Guessed',
]

function readEdits() {
  const value = readStorage(STORAGE_KEYS.mistakeEdits, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

// Edits (tag, note, status) are stored by entry id so they apply to saved and sample entries alike.
export function saveMistakeEdit(id, patch) {
  const edits = readEdits()
  writeStorage(STORAGE_KEYS.mistakeEdits, { ...edits, [id]: { ...edits[id], ...patch } })
}

export function loadMistakes(includeSample) {
  const edits = readEdits()
  const saved = getMistakes().map((entry) => ({ ...entry, sample: false }))
  const sample = includeSample ? SAMPLE_MISTAKES.map((entry) => ({ ...entry, sample: true })) : []

  return [...saved, ...sample]
    .map((entry) => ({ ...entry, ...edits[entry.id], question: getQuestionById(entry.questionId) }))
    .filter((entry) => entry.question)
    .sort((a, b) => b.date.localeCompare(a.date))
}
