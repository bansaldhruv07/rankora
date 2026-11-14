import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ArrowRight, Menu, ShoppingBag, X } from 'lucide-react'
import Logo from '../common/Logo'
import ThemeToggle from './ThemeToggle'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useCart } from '../../hooks/useCart'
import { useFeatures } from '../../hooks/useFeatures'
import { ROUTES } from '../../utils/routes'
import { cn } from '../../utils/cn'

const LINKS = [
  { to: ROUTES.home, label: 'Home', end: true },
  { to: ROUTES.notes, label: 'Notes' },
  { to: ROUTES.pricing, label: 'Pricing' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8)
  const { user, openAuth } = useAuth()
  const cart = useCart()
  const { referrals } = useFeatures()
  const links = referrals ? [...LINKS, { to: '/refer', label: 'Refer & earn', tag: 'Gift cards*' }] : LINKS

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => setOpen(false)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-ivory-50 transition-shadow duration-300',
        scrolled || open ? 'border-line shadow-soft' : 'border-transparent',
      )}
    >
      <div className="page-container flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
        <Logo onClick={close} tagline />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'group relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-ink-950' : 'text-ink-600 hover:text-ink-950',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {link.tag && <span className="ml-2 rounded-full bg-ember-500 px-2 py-0.5 align-middle text-[0.65rem] font-bold uppercase tracking-wide text-white">{link.tag}</span>}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-3.5 bottom-0.5 h-0.5 origin-left rounded bg-ember-500 transition-transform duration-300',
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link
            to={ROUTES.cart}
            onClick={close}
            aria-label={cart.count ? `Cart, ${cart.count} ${cart.count === 1 ? 'note' : 'notes'}` : 'Cart'}
            className="relative grid size-10 place-items-center rounded-full text-ink-900 transition hover:bg-ivory-200"
          >
            <ShoppingBag size={20} aria-hidden="true" />
            {cart.count > 0 && (
              <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid min-w-4.5 place-items-center rounded-full bg-ember-500 px-1 text-[0.65rem] font-bold leading-[1.15rem] text-white">
                {cart.count}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link
                to={ROUTES.library}
                onClick={close}
                className="hidden h-10 items-center rounded-full px-3.5 text-sm font-semibold text-ink-800 transition hover:bg-ivory-200 sm:inline-flex"
              >
                Library
              </Link>
              <Link
                to={ROUTES.account}
                onClick={close}
                className="hidden h-10 items-center rounded-full px-3.5 text-sm font-semibold text-ink-800 transition hover:bg-ivory-200 sm:inline-flex"
              >
                Account
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="hidden h-10 items-center rounded-full px-3.5 text-sm font-semibold text-ink-800 transition hover:bg-ivory-200 sm:inline-flex"
            >
              Sign in
            </button>
          )}
          <div className="hidden sm:block">
            <Button to={ROUTES.notes} size="sm" variant="accent" iconRight={ArrowRight}>
              Browse notes
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid size-10 place-items-center rounded-full text-ink-900 transition hover:bg-ivory-200 lg:hidden"
          >
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="animate-fade border-t border-line bg-ivory-50 lg:hidden">
          <nav aria-label="Mobile" className="page-container flex flex-col py-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between border-b border-line-soft py-3.5 font-display text-xl font-medium',
                    isActive ? 'text-ember-600' : 'text-ink-900',
                  )
                }
              >
                <span>
                  {link.label}
                  {link.tag && <span className="ml-2 rounded-full bg-ember-500 px-2 py-0.5 align-middle font-sans text-xs font-bold uppercase tracking-wide text-white">{link.tag}</span>}
                </span>
                <ArrowRight size={18} aria-hidden="true" className="text-ink-400" />
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink
                  to={ROUTES.library}
                  onClick={close}
                  className="flex items-center justify-between border-b border-line-soft py-3.5 font-display text-xl font-medium text-ink-900"
                >
                  My library
                  <ArrowRight size={18} aria-hidden="true" className="text-ink-400" />
                </NavLink>
                <NavLink
                  to={ROUTES.account}
                  onClick={close}
                  className="flex items-center justify-between border-b border-line-soft py-3.5 font-display text-xl font-medium text-ink-900"
                >
                  Account
                  <ArrowRight size={18} aria-hidden="true" className="text-ink-400" />
                </NavLink>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  close()
                  openAuth('login')
                }}
                className="flex items-center justify-between border-b border-line-soft py-3.5 text-left font-display text-xl font-medium text-ink-900"
              >
                Sign in
                <ArrowRight size={18} aria-hidden="true" className="text-ink-400" />
              </button>
            )}
            <Button to={ROUTES.notes} onClick={close} variant="accent" size="lg" className="mt-5" iconRight={ArrowRight}>
              Browse all notes
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}