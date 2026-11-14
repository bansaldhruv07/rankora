import { WhatsAppIcon } from '../common/BrandIcons'
import { SITE } from '../../data/site'

const GREETING = 'Hi JEEdge, I have a question about the notes.'

// "+91 89507 51407" from "918950751407".
const pretty = (digits) => `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`

// Always-visible shortcut to chat with us on WhatsApp, bottom-right. It sits above the mobile "Buy" bar on note pages.
// On wide screens it says who you will reach; on phones it is just the button.
export default function WhatsAppFloat() {
  const number = SITE.whatsappChat
  if (!/^\d{10,15}$/.test(number ?? '')) return null
  const href = `https://wa.me/${number}?text=${encodeURIComponent(GREETING)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with us on WhatsApp, ${pretty(number)}`}
      className="group fixed bottom-[5.75rem] right-4 z-50 flex items-center gap-3 lg:bottom-6 lg:right-6"
    >
      <span className="pointer-events-none hidden items-center rounded-full bg-surface py-2 pl-4 pr-5 shadow-lift ring-1 ring-line transition duration-300 group-hover:-translate-x-1 lg:flex">
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-ink-900">Chat with us on WhatsApp</span>
          <span className="tabular font-mono text-xs text-ink-600">{pretty(number)}</span>
        </span>
      </span>
      <span className="relative grid size-14 place-items-center rounded-full bg-[#25d366] shadow-lift transition duration-300 group-hover:scale-110">
        <span aria-hidden="true" className="absolute inset-0 animate-ring rounded-full bg-[#25d366]" />
        <WhatsAppIcon size={36} className="relative animate-wiggle" style={{ color: '#fff', '--wa-glyph': '#25d366' }} />
      </span>
    </a>
  )
}
