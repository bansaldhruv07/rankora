import { readStorage, writeStorage } from './storage'
import { STORAGE_KEYS } from './constants'
import { buildAttemptRecord, buildMistakes, scoreAttempt } from './scoring'

const MAX_ATTEMPTS = 50
const MAX_MISTAKES = 200

function readList(key) {
  const value = readStorage(key, [])
  return Array.isArray(value) ? value : []
}

export function getAttempts() {
  return readList(STORAGE_KEYS.attempts)
}

export function getMistakes() {
  return readList(STORAGE_KEYS.mistakes)
}

export function saveAttempt(attempt) {
  writeStorage(STORAGE_KEYS.attempts, [attempt, ...getAttempts()].slice(0, MAX_ATTEMPTS))
}

export function saveMistakes(mistakes) {
  const existing = getMistakes()
  const known = new Set(existing.map((item) => item.id))
  const added = mistakes.filter((item) => !known.has(item.id))
  writeStorage(STORAGE_KEYS.mistakes, [...added, ...existing].slice(0, MAX_MISTAKES))
}

export function recordAttempt({ kind, title, testId, questions, answers, timeSeconds }) {
  const result = scoreAttempt(questions, answers)
  const attempt = buildAttemptRecord({ kind, title, testId, result, timeSeconds })
  saveAttempt(attempt)
  saveMistakes(buildMistakes(result, attempt))
  return result
}