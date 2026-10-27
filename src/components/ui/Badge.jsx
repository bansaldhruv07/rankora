import { cn } from '../../utils/cn'
import { DIFFICULTY_THEME, getSubjectTheme } from '../../utils/subjectTheme'

const TONES = {
  neutral: 'bg-ivory-200 text-ink-700 ring-ink-900/10',
  ember: 'bg-ember-50 text-ember-700 ring-ember-500/25',
  sage: 'bg-sage-100 text-sage-700 ring-sage-600/25',
  ink: 'bg-ink-900 text-ivory-50 ring-ink-900',
  danger: 'bg-danger-100 text-danger-500 ring-danger-500/25',
}

const BASE =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset'

export default function Badge({ tone = 'neutral', icon: Icon, className, children }) {
  return (
    <span className={cn(BASE, TONES[tone], className)}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function DifficultyBadge({ level, className }) {
  return <span className={cn(BASE, DIFFICULTY_THEME[level], className)}>{level}</span>
}

export function SubjectBadge({ subject, className }) {
  const theme = getSubjectTheme(subject)
  const Icon = theme.icon
  return (
    <span className={cn(BASE, theme.chip, className)}>
      <Icon size={12} aria-hidden="true" />
      {theme.label}
    </span>
  )
}