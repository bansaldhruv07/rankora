import { useState } from 'react'
import { assetUrl } from '../../lib/api'
import { CLASS_LABELS } from '../../utils/format'
import { cn } from '../../utils/cn'
import { Wordmark } from '../common/Logo'
import { coverTheme } from './coverTheme'

// Large, quiet line art anchored bottom-right. Drawn in currentColor at low opacity.
const MOTIFS = {
  physics: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="100" cy="128" rx="84" ry="30" transform="rotate(-24 100 128)" />
      <ellipse cx="100" cy="128" rx="84" ry="30" transform="rotate(36 100 128)" />
      <ellipse cx="100" cy="128" rx="84" ry="30" transform="rotate(96 100 128)" />
      <circle cx="100" cy="128" r="6" fill="currentColor" stroke="none" />
    </g>
  ),
  chemistry: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M100 56l41 24v48l-41 24-41-24V80z" />
      <path d="M100 74l25 14.5v29L100 132l-25-14.5v-29z" />
      <path d="M141 80l36-21M59 128l-36 21M100 56V14" strokeLinecap="round" />
      <circle cx="177" cy="59" r="5" fill="currentColor" stroke="none" />
      <circle cx="23" cy="149" r="5" fill="currentColor" stroke="none" />
      <circle cx="100" cy="14" r="5" fill="currentColor" stroke="none" />
    </g>
  ),
  mathematics: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 148h184M30 20v140" />
      <path d="M30 100c22-70 44-70 66 0s44 70 66 0 22-40 30-40" />
      <path d="M96 100v48" strokeDasharray="3 5" />
      <text x="124" y="64" fontSize="46" fill="currentColor" stroke="none" fontFamily="Georgia, serif" fontStyle="italic">
        ∫
      </text>
    </g>
  ),
}
MOTIFS.mixed = (
  <g fill="none" stroke="currentColor" strokeWidth="1.4">
    <circle cx="70" cy="110" r="46" />
    <circle cx="130" cy="110" r="46" />
    <circle cx="100" cy="62" r="46" />
  </g>
)

// A uploaded cover image wins; otherwise a designed cover is generated from the note's metadata.
export default function ProductCover({ product, className, compact = false }) {
  const theme = coverTheme(product.subject)
  const motif = MOTIFS[product.subject] ?? MOTIFS.mixed
  const frame = 'relative isolate aspect-[3/4] w-full overflow-hidden rounded-[0.35rem] shadow-lift'

  if (product.coverUrl) {
    return (
      // An uploaded cover is already a finished design: show it whole, in its own proportions, with nothing drawn over it.
      <UploadedCover product={product} className={className} />
    )
  }

  const kindLabel = product.kind === 'bundle' ? 'Bundle' : product.chapter || theme.label
  return (
    <div
      role="img"
      aria-label={`Cover: ${product.title}`}
      className={cn(frame, className)}
      style={{ background: theme.bg, color: theme.ink, containerType: 'inline-size' }}
    >
      <svg viewBox="0 0 200 170" aria-hidden="true" className="absolute -bottom-2 -right-3 w-[92%] opacity-[0.16]" style={{ color: theme.accent }}>
        {motif}
      </svg>
      <div className="relative flex h-full flex-col justify-between p-[9cqw] pl-[13cqw]">
        <div>
          <p className="font-mono uppercase tracking-[0.16em] opacity-80" style={{ fontSize: '4.4cqw', color: theme.accent }}>
            {theme.label}
            {product.classLevel && !compact ? ` · ${CLASS_LABELS[product.classLevel]}` : ''}
          </p>
          <span aria-hidden="true" className="mt-[4cqw] block h-px w-[14cqw]" style={{ background: theme.accent }} />
        </div>
        <div>
          <p className="font-display font-semibold leading-[1.08] tracking-tight" style={{ fontSize: compact ? '10cqw' : '11.5cqw', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {product.title}
          </p>
          <p className="mt-[3.5cqw] opacity-75" style={{ fontSize: '4.6cqw' }}>
            {kindLabel}
          </p>
        </div>
        <p className="opacity-90" style={{ fontSize: '5.4cqw' }}>
          <Wordmark tone="onDark" />
        </p>
      </div>
      <Spine color={theme.spine} />
    </div>
  )
}

// The frame only reserves a portrait-shaped placeholder while the image loads; once it has, the frame is exactly the
// image's own size, so there is never empty space around or below it.
function UploadedCover({ product, className }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={cn('relative isolate w-full overflow-hidden rounded-[0.35rem] bg-ivory-200 shadow-lift', !loaded && 'aspect-[3/4]', className)}>
      <img
        src={assetUrl(product.coverUrl)}
        alt={`Cover of ${product.title}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="block h-auto w-full"
      />
    </div>
  )
}

function Spine({ color }) {
  return (
    <>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[7%]" style={{ background: color }} />
      <span aria-hidden="true" className="absolute inset-y-0 left-[7%] w-px bg-white/20" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.10] via-transparent to-black/[0.18]" />
    </>
  )
}
