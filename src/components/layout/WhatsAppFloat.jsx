import { useEffect, useState } from 'react'
import { WhatsAppIcon } from '../common/BrandIcons'
import { SITE, isLink } from '../../data/site'

// Always-visible shortcut to the WhatsApp group, bottom-right. It sits above the mobile "Buy" bar on note pages.
// Until the group link is set it stays visible and says the group is opening soon, rather than doing nothing.
export default function WhatsAppFloat() {
  const linked = isLink(SITE.whatsappGroup)
  const [note, setNote] = useState(false)

  useEffect(() => {
    if (!note) return undefined
    const timer = window.setTimeout(() => setNote(false), 3500)
    return () => window.clearTimeout(timer)
  }, [note])

  const label = linked ? 'Join our WhatsApp group' : 'Our WhatsApp group opens soon'
  const body = (
    <>
      <span
        role={linked ? undefined : 'status'}
        className={`pointer-events-none whitespace-nowrap rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-900 shadow-lift ring-1 ring-line transition duration-300 ${
          note ? 'translate-x-0 opacity-100' : 'translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100'
        }`}
      >
        {label}
      </span>
      <span className="relative grid size-14 place-items-center rounded-full bg-[#25d366] shadow-lift transition duration-300 group-hover:scale-110">
        <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-full bg-[#25d366]" />
        <WhatsAppIcon size={36} className="relative animate-wiggle" style={{ color: '#fff', '--wa-glyph': '#25d366' }} />
      </span>
    </>
  )
  const position = 'group fixed bottom-[5.75rem] right-4 z-50 flex items-center gap-3 lg:bottom-6 lg:right-6'

  return linked ? (
    <a href={SITE.whatsappGroup} target="_blank" rel="noopener noreferrer" aria-label={label} className={position}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={() => setNote(true)} aria-label={label} className={position}>
      {body}
    </button>
  )
}
