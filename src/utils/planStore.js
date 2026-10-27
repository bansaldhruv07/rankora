import { readStorage, writeStorage } from './storage'
import { STORAGE_KEYS } from './constants'

const KEY = STORAGE_KEYS.plan
const listeners = new Set()

function load() {
  return readStorage(KEY, 'free') === 'premium' ? 'premium' : 'free'
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

export function setPlan(plan) {
  state = plan === 'premium' ? 'premium' : 'free'
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