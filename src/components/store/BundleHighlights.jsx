import { BookOpenCheck, Check, Layers, Repeat, Timer } from 'lucide-react'
import { pluralize } from '../../utils/format'

// What a pack buyer gets, in plain numbers taken from the notes the pack really contains, and why it is worth it.
export default function BundleHighlights({ items, subject }) {
  const chapters = items.length
  if (chapters === 0) return null
  const pages = items.reduce((sum, item) => sum + (item.pages > 0 ? item.pages : 0), 0)
  const whole = subject === 'mixed'

  const tiles = [
    [Layers, String(chapters), chapters === 1 ? 'chapter' : 'chapters'],
    pages > 0 && [BookOpenCheck, String(pages), 'pages of short notes'],
    [Timer, 'Minutes', 'to revise a chapter'],
    [Repeat, 'Pay once', 'keep it for good'],
  ].filter(Boolean)

  const reasons = [
    'No need to learn the whole syllabus again. The concepts are already picked out, so you revise instead of starting over.',
    `Written and used by an IIT Delhi student in her own JEE prep. Made for Class 11, Class 12 and droppers.`,
    whole ? 'Physics, Chemistry and Mathematics in one purchase, in book order.' : 'Every chapter of the subject in one purchase, in book order.',
    'Chapters added to this pack later unlock for you automatically.',
  ]

  return (
    <section aria-label="What you get" className="py-10">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">What you get</p>
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{pluralize(chapters, 'chapter')}, ready to revise</h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([Icon, value, label]) => (
          <li key={label} className="rounded-2xl border border-line bg-surface p-4 text-center">
            <Icon size={18} aria-hidden="true" className="mx-auto text-ember-600" />
            <p className="mt-2 font-display text-2xl font-semibold leading-tight tabular text-ink-900">{value}</p>
            <p className="mt-0.5 text-xs text-ink-600">{label}</p>
          </li>
        ))}
      </ul>
      <ul className="mt-6 space-y-3">
        {reasons.map((text) => (
          <li key={text} className="flex gap-3 text-ink-700">
            <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-sage-600" />
            <span className="leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
