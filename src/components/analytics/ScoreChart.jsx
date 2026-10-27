import { cn } from '../../utils/cn'

const W = 600
const H = 250
const PAD = { top: 18, right: 20, bottom: 34, left: 42 }

export default function ScoreChart({ data, max, label = 'Score trend', className }) {
  if (data.length === 0) return null

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const baseY = PAD.top + innerH
  const x = (index) =>
    PAD.left + (data.length === 1 ? innerW / 2 : (index / (data.length - 1)) * innerW)
  const y = (value) => PAD.top + innerH - (Math.min(value, max) / max) * innerH

  const line = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(point.value).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${baseY} L${x(0).toFixed(1)} ${baseY} Z`
  const ticks = [0, max / 2, max]
  const summary = `${label}: ${data.map((point) => `${point.label} ${point.value}`).join(', ')}, out of ${max}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className={cn('h-auto w-full', className)}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="#e9e1cf"
            strokeDasharray={tick === 0 ? undefined : '3 5'}
          />
          <text
            x={PAD.left - 10}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize="11"
            fill="#8590a6"
            fontFamily="IBM Plex Mono, monospace"
          >
            {tick}
          </text>
        </g>
      ))}

      <path d={area} fill="#c2571a" opacity="0.08" className="animate-fade" />
      <path
        d={line}
        pathLength="1"
        fill="none"
        stroke="#c2571a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw"
        style={{ '--len': 1, strokeDasharray: 1 }}
      />

      {data.map((point, index) => {
        const last = index === data.length - 1
        return (
          <circle
            key={`${point.label}-${index}`}
            cx={x(index)}
            cy={y(point.value)}
            r={last ? 5.5 : 4}
            fill={last ? '#c2571a' : '#fbf8f1'}
            stroke="#c2571a"
            strokeWidth="2"
            className="animate-pop stagger"
            style={{ '--d': `${700 + index * 90}ms`, transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        )
      })}

      {data.map((point, index) => (
        <text
          key={`label-${point.label}-${index}`}
          x={x(index)}
          y={H - 10}
          textAnchor="middle"
          fontSize="11"
          fill="#5f6e8a"
          fontFamily="IBM Plex Mono, monospace"
        >
          {point.label}
        </text>
      ))}
    </svg>
  )
}