import { COLLEGES } from '../../data/site'
import { cn } from '../../utils/cn'

// A monogram chip for a college. These are our own marks (not the colleges' logos). IIT Delhi gets the
// ember accent, DTU the sage one, so the two read as a pair without competing.
const TONES = {
  iitd: 'bg-ember-500 text-white',
  dtu: 'bg-sage-600 text-white dark:bg-sage-500 dark:text-ivory-50',
}

export default function CollegeBadge({ college, label = false, className }) {
  const info = COLLEGES[college]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('inline-grid h-6 min-w-11 place-items-center rounded-md px-1.5 font-mono text-[0.68rem] font-semibold tracking-[0.1em]', TONES[college])}>{info.short}</span>
      {label && <span className="text-sm font-semibold text-ink-900">{info.full}</span>}
    </span>
  )
}
