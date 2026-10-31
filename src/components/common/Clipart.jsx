// Small hand-built illustrations used around the site. Outlines follow the text colour (so they work in light
// and dark), and fills use the theme's ember and sage tokens.
const EMBER = 'var(--color-ember-500)'
const EMBER_SOFT = 'var(--color-ember-200)'
const SAGE = 'var(--color-sage-400)'
const PAPER = 'var(--color-surface)'

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function AtomArt({ className }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g {...base} opacity="0.85">
        <ellipse cx="60" cy="60" rx="50" ry="19" />
        <ellipse cx="60" cy="60" rx="50" ry="19" transform="rotate(60 60 60)" />
        <ellipse cx="60" cy="60" rx="50" ry="19" transform="rotate(120 60 60)" />
      </g>
      <circle cx="60" cy="60" r="9" fill={EMBER} />
      <circle cx="57" cy="57" r="3" fill={EMBER_SOFT} />
      <circle cx="110" cy="60" r="5.5" fill={EMBER} />
      <circle cx="85" cy="103.3" r="5.5" fill={SAGE} />
      <circle cx="35" cy="103.3" r="5.5" fill={EMBER} />
    </svg>
  )
}

export function FlaskArt({ className }) {
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
      <path d="M27 78 H73 L85 94 Q90 108 76 110 H24 Q10 108 15 94 Z" fill={SAGE} opacity="0.55" />
      <path {...base} d="M40 12 V40 L15 94 Q10 108 24 110 H76 Q90 108 85 94 L60 40 V12" />
      <path {...base} d="M33 12 H67" />
      <circle cx="46" cy="70" r="4.5" {...base} strokeWidth="2" />
      <circle cx="58" cy="58" r="3.2" {...base} strokeWidth="2" />
      <circle cx="51" cy="46" r="2.2" fill="currentColor" />
      <circle cx="66" cy="92" r="3" fill={EMBER} />
      <path d="M78 22q4-6 0-12M86 24q5-7 0-14" {...base} stroke={EMBER} strokeWidth="2" opacity="0.8" />
    </svg>
  )
}

export function PiArt({ className }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="60" cy="60" r="50" fill={EMBER_SOFT} opacity="0.55" />
      <circle cx="60" cy="60" r="50" {...base} strokeDasharray="3 7" opacity="0.7" />
      <text x="58" y="86" textAnchor="middle" fontSize="80" fontWeight="600" fontFamily="Fraunces, Georgia, serif" fill="currentColor">
        π
      </text>
      <text x="96" y="40" textAnchor="middle" fontSize="34" fontStyle="italic" fontFamily="Fraunces, Georgia, serif" fill={EMBER}>
        ∫
      </text>
      <path d="M20 96q8-10 16 0t16 0" {...base} stroke={EMBER} strokeWidth="2.2" opacity="0.9" />
    </svg>
  )
}

export function NotebookArt({ className }) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden="true">
      <rect x="24" y="14" width="78" height="108" rx="9" fill={PAPER} stroke="currentColor" strokeWidth="2.4" />
      {[30, 52, 74, 96].map((y) => (
        <rect key={y} x="14" y={y} width="20" height="7" rx="3.5" fill={EMBER} />
      ))}
      <path {...base} strokeWidth="2" opacity="0.45" d="M44 40h46M44 54h40M44 68h46" />
      <rect x="44" y="82" width="48" height="26" rx="5" fill="none" stroke={EMBER} strokeWidth="2" strokeDasharray="4 3" />
      <text x="68" y="99" textAnchor="middle" fontSize="12" fontFamily="Caveat, cursive" fontWeight="600" fill={EMBER}>
        v = u + at
      </text>
    </svg>
  )
}

export function PencilArt({ className }) {
  return (
    <svg viewBox="0 0 150 40" className={className} aria-hidden="true">
      <rect x="1" y="9" width="14" height="22" rx="7" fill={SAGE} />
      <rect x="14" y="9" width="12" height="22" fill="currentColor" opacity="0.75" />
      <rect x="26" y="9" width="82" height="22" fill="var(--color-ember-400)" />
      <path d="M26 15h82M26 25h82" stroke="var(--color-ember-600)" strokeWidth="1.6" opacity="0.6" />
      <path d="M108 9v22l28-11z" fill="#f1d9b5" />
      <path d="M126 14.5v11l10-5.5z" fill="currentColor" />
    </svg>
  )
}

export function CapArt({ className }) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden="true">
      <path d="M30 50v18c0 9 60 9 60 0V50L60 64z" fill="currentColor" opacity="0.8" />
      <polygon points="60,12 114,36 60,60 6,36" fill="currentColor" />
      <polygon points="60,19 98,36 60,53 22,36" fill="#fff" opacity="0.1" />
      <path d="M104 39v31" stroke={EMBER} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="104" cy="75" r="5" fill={EMBER} />
    </svg>
  )
}

export function RocketArt({ className }) {
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
      <path d="M42 90q8 30 16 0z" fill="var(--color-ember-400)" />
      <path d="M46 90q4 16 8 0z" fill="#ffd9a8" />
      <path d="M34 66 16 90l18-4zM66 66l18 24-18-4z" fill={EMBER} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M50 8C72 24 76 54 67 88H33C24 54 28 24 50 8z" fill={PAPER} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="50" cy="46" r="10" fill={EMBER_SOFT} stroke="currentColor" strokeWidth="2.2" />
      <path d="M36 74h28" {...base} strokeWidth="2" opacity="0.5" />
    </svg>
  )
}

export function BulbArt({ className }) {
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      <circle cx="50" cy="44" r="27" fill={EMBER_SOFT} opacity="0.6" />
      <path {...base} d="M50 17a27 27 0 0 0-14 50v8h28v-8a27 27 0 0 0-14-50z" />
      <path {...base} strokeWidth="2" d="M42 88h16M44 97h12" />
      <path d="M43 62V50l7 6 7-6v12" {...base} stroke={EMBER} strokeWidth="2.2" />
      <path {...base} stroke={EMBER} strokeWidth="2.4" d="M50 3v6M14 20l5 4M86 20l-5 4M6 46h6M94 46h-6" />
    </svg>
  )
}

export function SparkleArt({ className }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path fill="currentColor" d="M20 1C22 14 26 18 39 20 26 22 22 26 20 39 18 26 14 22 1 20 14 18 18 14 20 1z" />
    </svg>
  )
}
