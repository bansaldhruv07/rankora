import { allChannels } from './channels'
import { cn } from '../../utils/cn'

// A compact row of round icon links (footer). A channel whose link is not set yet shows as a muted "coming soon"
// icon instead of a link that goes nowhere. Linked ones light up in their own brand colour on hover.
export default function SocialIcons({ className }) {
  return (
    <ul className={cn('flex items-center gap-2.5', className)} aria-label="Rankora on social media">
      {allChannels().map(({ id, href, label, Icon, bg, glyph }) => {
        const glyphVars = { '--wa-glyph': glyph, '--tg-fold': glyph }
        return (
          <li key={id}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="group relative grid size-11 place-items-center overflow-hidden rounded-full border border-line bg-surface text-ink-700 transition duration-300 hover:-translate-y-1 hover:border-transparent hover:text-white hover:shadow-lift"
              >
                <span aria-hidden="true" className="absolute inset-0 scale-0 rounded-full transition duration-300 group-hover:scale-100" style={{ background: bg }} />
                <Icon size={21} className="relative" style={glyphVars} />
              </a>
            ) : (
              <span role="img" aria-label={`${label} (coming soon)`} title={`${label}: coming soon`} className="grid size-11 cursor-default place-items-center rounded-full border border-dashed border-line bg-surface text-ink-400">
                <Icon size={21} style={{ '--wa-glyph': 'var(--color-surface)', '--tg-fold': 'var(--color-surface)' }} />
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
