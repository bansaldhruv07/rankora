import { readStorage, writeStorage } from './storage'
import { STORAGE_KEYS } from './constants'

const KEY = STORAGE_KEYS.bookmarks
const listeners = new Set()

function load() {
  const stored = readStorage(KEY, [])
  return Array.isArray(stored) ? stored : []
}

let state = load()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return state
}

export function toggleBookmark(id) {
  state = state.includes(id) ? state.filter((item) => item !== id) : [...state, id]
  writeStorage(KEY, state)
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) {
      state = load()
      emit()
    }
  })
}