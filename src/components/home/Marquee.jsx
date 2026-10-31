import { SparkleArt } from '../common/Clipart'

const ITEMS = ['Physics', 'Chemistry', 'Mathematics', 'Class 11', 'Class 12', 'Handwritten notes', 'Formula boxes', 'IIT Delhi', 'DTU', 'Free samples', 'Read on any device']

// A slow, endless strip of what the notes cover. The list is repeated so the loop has no seam; the copy is hidden from screen readers.
export default function Marquee() {
  return (
    <div className="marquee-mask overflow-hidden border-b border-line-soft bg-ivory-100/70 py-4" aria-label="Physics, Chemistry, Mathematics, Class 11, Class 12, handwritten notes by IIT Delhi and DTU students">
      <div aria-hidden="true" className="flex w-max animate-marquee items-center gap-10 hover:[animation-play-state:paused]">
        {[0, 1].map((copy) =>
          ITEMS.map((item) => (
            <span key={`${copy}-${item}`} className="flex items-center gap-10 whitespace-nowrap font-display text-xl font-medium text-ink-700 sm:text-2xl">
              {item}
              <SparkleArt className="size-4 text-ember-500" />
            </span>
          )),
        )}
      </div>
    </div>
  )
}
