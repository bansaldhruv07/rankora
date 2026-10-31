import { SITE, isLink } from '../../data/site'
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from './BrandIcons'

// The community channels.
export const CHANNELS = [
  { id: 'whatsapp', key: 'whatsappGroup', label: 'WhatsApp group', blurb: 'Join the student group for new-note alerts and doubts', Icon: WhatsAppIcon, bg: '#25d366', glyph: '#25d366' },
  { id: 'telegram', key: 'telegram', label: 'Telegram', blurb: 'Updates and new notes, straight to your phone', Icon: TelegramIcon, bg: '#2aabee', glyph: '#2aabee' },
  { id: 'instagram', key: 'instagram', label: 'Instagram', blurb: 'Study tips and what we are building next', Icon: InstagramIcon, bg: 'linear-gradient(45deg,#f9a825,#ee2a7b 55%,#6228d7)', glyph: '#fff' },
]

// Every channel is shown. `href` is null until its link is set in src/data/site.js, and the UI then shows it as "coming soon".
export const allChannels = () => CHANNELS.map((channel) => ({ ...channel, href: isLink(SITE[channel.key]) ? SITE[channel.key] : null }))
