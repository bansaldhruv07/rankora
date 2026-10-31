import { BookOpenCheck, Layers, Zap } from 'lucide-react'
import CollegeBadge from '../common/CollegeBadge'
import Reveal from '../ui/Reveal'
import { useApi } from '../../hooks/useApi'

// A slim strip of facts under the hero. The note count is read live from the catalogue; nothing is invented.
export default function TrustBar() {
  const { data: catalog } = useApi('/products/catalog')
  const total = catalog ? Object.values(catalog).reduce((n, s) => n + s.count, 0) : 0

  const items = [
    {
      lead: (
        <span className="flex flex-col gap-1">
          <CollegeBadge college="iitd" />
          <CollegeBadge college="dtu" />
        </span>
      ),
      title: 'IIT Delhi and DTU authors',
      text: 'Written by students who have done JEE',
    },
    { icon: BookOpenCheck, title: total > 0 ? `${total} ${total === 1 ? 'note' : 'notes'} on sale` : 'Chapter-wise notes', text: 'Physics, Chemistry and Mathematics' },
    { icon: Layers, title: 'Class 11 and 12', text: 'Find your chapter in seconds' },
    { icon: Zap, title: 'Instant access', text: 'Read the moment payment clears' },
  ]

  return (
    <section aria-label="Why Rankora" className="border-b border-line-soft bg-surface">
      <ul className="page-container grid grid-cols-2 gap-x-6 gap-y-6 py-7 lg:grid-cols-4">
        {items.map(({ lead, icon: Icon, title, text }, index) => (
          <Reveal as="li" key={title} delay={index * 80} className="group flex items-start gap-3">
            {lead ?? (
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ember-50 text-ember-600 transition duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <Icon size={19} aria-hidden="true" />
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-ink-900">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-600 sm:text-sm">{text}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
