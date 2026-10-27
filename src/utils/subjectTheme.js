import { Atom, FlaskConical, Pi, Layers } from 'lucide-react'

export const SUBJECT_THEME = {
  physics: {
    label: 'Physics',
    icon: Atom,
    chip: 'bg-ink-900/[0.06] text-ink-800 ring-ink-900/15',
    dot: 'bg-ink-700',
    bar: 'bg-ink-700',
    text: 'text-ink-700',
    soft: 'bg-ink-900/[0.05]',
    hex: '#2f4064',
  },
  chemistry: {
    label: 'Chemistry',
    icon: FlaskConical,
    chip: 'bg-sage-100 text-sage-700 ring-sage-600/25',
    dot: 'bg-sage-500',
    bar: 'bg-sage-500',
    text: 'text-sage-700',
    soft: 'bg-sage-50',
    hex: '#6f8f72',
  },
  mathematics: {
    label: 'Mathematics',
    icon: Pi,
    chip: 'bg-ember-50 text-ember-700 ring-ember-500/25',
    dot: 'bg-ember-500',
    bar: 'bg-ember-500',
    text: 'text-ember-600',
    soft: 'bg-ember-50',
    hex: '#c2571a',
  },
  mixed: {
    label: 'Full paper',
    icon: Layers,
    chip: 'bg-ivory-200 text-ink-700 ring-ink-900/10',
    dot: 'bg-ink-400',
    bar: 'bg-ink-400',
    text: 'text-ink-600',
    soft: 'bg-ivory-200',
    hex: '#8590a6',
  },
}

export const DIFFICULTY_THEME = {
  Easy: 'bg-sage-100 text-sage-700 ring-sage-600/25',
  Medium: 'bg-ember-50 text-ember-700 ring-ember-500/25',
  Hard: 'bg-danger-100 text-danger-500 ring-danger-500/25',
}

export function getSubjectTheme(id) {
  return SUBJECT_THEME[id] ?? SUBJECT_THEME.mixed
}