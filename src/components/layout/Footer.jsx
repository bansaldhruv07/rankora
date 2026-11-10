import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Logo from '../common/Logo'
import SocialIcons from '../common/SocialIcons'
import Button from '../ui/Button'
import { useFeatures } from '../../hooks/useFeatures'
import { SITE, isLink } from '../../data/site'
import { ROUTES, notesPath } from '../../utils/routes'

const COLUMNS = [
  {
    title: 'Notes',
    links: [
      { label: 'All notes', to: ROUTES.notes },
      { label: 'Physics notes', to: notesPath({ subject: 'physics' }) },
      { label: 'Chemistry notes', to: notesPath({ subject: 'chemistry' }) },
      { label: 'Mathematics notes', to: notesPath({ subject: 'mathematics' }) },
    ],
  },
  {
    title: 'Class',
    links: [
      { label: 'Class 11 notes', to: notesPath({ class: '11' }) },
      { label: 'Class 12 notes', to: notesPath({ class: '12' }) },
      { label: 'Pricing and subject packs', to: ROUTES.pricing },
    ],
  },
  {
    title: 'Your account',
    links: [
      { label: 'My library', to: ROUTES.library },
      { label: 'Orders and support', to: ROUTES.account },
      { label: 'Policies', to: ROUTES.policies },
    ],
  },
]

export default function Footer() {
  const { referrals } = useFeatures()
  return (
    <footer className="mt-24 border-t border-line bg-ivory-100">
      <div className="page-container py-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 font-display text-2xl font-medium leading-snug text-ink-900">
              Short notes. Faster JEE revision.
            </p>
            <p className="mt-3 leading-relaxed text-ink-600">
              Chapter-wise notes made by an IIT Delhi student and used in her own JEE prep. Concepts kept, padding cut, so revision fits the time you have left.
            </p>
            <SocialIcons className="mt-5" />
            <Button to={ROUTES.notes} variant="primary" className="mt-6" iconRight={ArrowRight}>
              Browse the notes
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ink-500">
                  {column.title}
                </h2>
                <ul className="mt-4 space-y-3">
                  {[...column.links, ...(referrals && column.title === 'Your account' ? [{ label: 'Refer and earn', to: '/refer' }] : [])].map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-ink-700 underline-offset-4 transition-colors hover:text-ember-600 hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} JEEdge. Founded by{' '}
            {SITE.founders.map((founder, index) => (
              <span key={founder.id}>
                {index > 0 && ' and '}
                {isLink(founder.linkedin) ? (
                  <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-ember-600 hover:underline">
                    {founder.name}
                  </a>
                ) : (
                  founder.name
                )}
              </span>
            ))}
          </p>
          <p>
            Notes are for personal study and are protected by your name on every page.
          </p>
        </div>
      </div>
    </footer>
  )
}