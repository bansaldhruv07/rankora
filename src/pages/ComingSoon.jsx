import { NavLink } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '../utils/cn'

const links = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/resource/demo', label: 'Resource details' },
  { to: '/practice', label: 'Practice' },
  { to: '/mock-tests', label: 'Mock tests' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/pricing', label: 'Pricing' },
]

export default function ComingSoon({ title }) {
  return (
    <section className="page-container py-20 sm:py-28">
      <p className="animate-rise font-mono text-xs font-medium uppercase tracking-[0.2em] text-ember-600">
        Rankora · Foundation ready
      </p>
      <h1 className="animate-rise stagger mt-5 text-5xl font-semibold sm:text-6xl" style={{ '--d': '80ms' }}>
        {title}
      </h1>
      <p
        className="animate-rise stagger mt-5 max-w-xl text-lg leading-relaxed text-ink-600"
        style={{ '--d': '160ms' }}
      >
        Routing, Tailwind theme, fonts and icons are working. This page is built in a later batch.
      </p>

      <nav aria-label="Route check" className="mt-12 flex flex-wrap gap-3">
        {links.map((link, i) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            style={{ '--d': `${240 + i * 50}ms` }}
            className={({ isActive }) =>
              cn(
                'animate-rise stagger group inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition duration-200',
                isActive
                  ? 'border-ink-900 bg-ink-900 text-ivory-50 shadow-soft'
                  : 'border-line bg-ivory-100 text-ink-800 hover:-translate-y-0.5 hover:border-ember-500 hover:text-ember-600 hover:shadow-soft',
              )
            }
          >
            {link.label}
            <ArrowUpRight
              size={14}
              aria-hidden="true"
              className="transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </NavLink>
        ))}
      </nav>
    </section>
  )
}