import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Logo from '../common/Logo'
import CollegeBadge from '../common/CollegeBadge'
import SocialIcons from '../common/SocialIcons'
import Button from '../ui/Button'
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
      { label: 'Pricing and Premium', to: ROUTES.pricing },
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
  return (
    <footer className="mt-24 border-t border-line bg-ivory-100">
      <div className="page-container py-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-5 font-display text-2xl font-medium leading-snug text-ink-900">
              Notes by IIT Delhi and DTU students.
            </p>
            <p className="mt-3 leading-relaxed text-ink-600">
              Concise, chapter-wise JEE notes written by students from IIT Delhi and DTU who have been through the exam.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <CollegeBadge college="iitd" label />
              <CollegeBadge college="dtu" label />
            </div>
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
                  {column.links.map((link) => (
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
          <p>© {new Date().getFullYear()} Rankora</p>
          <p>
            Notes are for personal study and are protected by your name on every page.
          </p>
        </div>
      </div>
    </footer>
  )
}