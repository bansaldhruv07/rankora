import { AtomArt, FlaskArt, PeakArt, PiArt, SparkleArt } from '../common/Clipart'
import { bundleKind } from './bundleKind'
import { coverTheme } from './coverTheme'
import { cn } from '../../utils/cn'

const SUBJECT_ART = { physics: AtomArt, chemistry: FlaskArt, mathematics: PiArt }

const GRADIENT = (a, b) => `linear-gradient(155deg, ${a}, ${b})`

// The picture panel on a bundle card. Always on a dark gradient, so it looks the same in both themes.
export default function BundleArt({ bundle, className }) {
  const kind = bundleKind(bundle)
  const theme = coverTheme(bundle.subject)
  const background = kind === 'hard' ? GRADIENT('#a54615', '#3b1a0a') : kind === 'all' ? GRADIENT('#2f4064', '#0b1424') : GRADIENT(theme.bg, theme.spine)
  const Art = SUBJECT_ART[kind]

  return (
    <div aria-hidden="true" className={cn('relative grid min-h-[8.5rem] place-items-center overflow-hidden text-white/85', className)} style={{ background }}>
      <span className="absolute -right-6 -top-6 size-24 rounded-full border border-white/10" />
      <span className="absolute -bottom-8 -left-8 size-24 rounded-full border border-white/10" />
      <SparkleArt className="absolute right-3 top-3 size-4 text-ember-400" />
      {kind === 'all' && (
        <span className="flex items-end -space-x-2.5 transition duration-500 group-hover:scale-105">
          <AtomArt className="size-12 -rotate-6" />
          <FlaskArt className="relative z-10 size-16" />
          <PiArt className="size-12 rotate-6" />
        </span>
      )}
      {kind === 'hard' && <PeakArt className="w-[4.75rem] transition duration-500 group-hover:-translate-y-1 group-hover:scale-105" />}
      {Art && <Art className="size-[4.5rem] transition duration-500 group-hover:rotate-6 group-hover:scale-110" />}
    </div>
  )
}
