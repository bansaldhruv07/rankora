import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Logo from '../common/Logo'
import Button from '../ui/Button'
import { DIAGNOSTIC_PATH, ROUTES, explorePath } from '../../utils/routes'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Explore resources', to: ROUTES.explore },
      { label: 'Practice', to: ROUTES.practice },
      { label: 'Mock tests', to: ROUTES.mocks },
      { label: 'Analytics', to: ROUTES.analytics },
      { label: 'Pricing', to: ROUTES.pricing },
    ],
  },
  {
    title: 'Subjects',
    links: [
      { label: 'Physics', to: explorePath({ subject: 'physics' }) },
      { label: 'Chemistry', to: explorePath({ subject: 'chemistry' }) },
      { label: 'Mathematics', to: explorePath({ subject: 'mathematics' }) },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Short notes', to: explorePath({ type: 'notes' }) },
      { label: 'Formula sheets', to: explorePath({ type: 'formula' }) },
      { label: 'Chapter PYQs', to: explorePath({ type: 'pyq' }) },
      { label: 'Saved items', to: explorePath({ saved: '1' }) },
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
              Revision, edited for focus.
            </p>
            <p className="mt-3 leading-relaxed text-ink-600">
              Short notes, formula sheets, chapter-wise practice and mock tests for JEE Main.
            </p>
            <Button to={DIAGNOSTIC_PATH} variant="primary" className="mt-6" iconRight={ArrowRight}>
              Take the diagnostic test
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
            Frontend demo: no accounts, payments or AI are connected. Sample content is written for illustration.
          </p>
        </div>
      </div>
    </footer>
  )
}