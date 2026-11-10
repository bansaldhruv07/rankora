import { lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, BarChart3, FileText, Gift, GraduationCap, LifeBuoy, LogOut, Menu, ReceiptText, Tag, Users, X } from 'lucide-react'
import { LogoMark, Wordmark } from '../../components/common/Logo'
import Button from '../../components/ui/Button'
import { api } from '../../lib/api'
import { cn } from '../../utils/cn'
import { useFeatures } from '../../hooks/useFeatures'
import { useLightOnly } from '../../hooks/useTheme'
import { AdminContext, useAdmin } from './adminContext'
import AdminLogin from './AdminLogin'

const Dashboard = lazy(() => import('./Dashboard'))
const NotesAdmin = lazy(() => import('./NotesAdmin'))
const NoteEditor = lazy(() => import('./NoteEditor'))
const AdminPreview = lazy(() => import('./AdminPreview'))
const Coupons = lazy(() => import('./Coupons'))
const OrdersAdmin = lazy(() => import('./OrdersAdmin'))
const Students = lazy(() => import('./Students'))
const ActivityPage = lazy(() => import('./Activity'))
const SupportInbox = lazy(() => import('./SupportInbox'))
const Teachers = lazy(() => import('./Teachers'))
const TeacherDetail = lazy(() => import('./TeacherDetail'))
const ReferralGifts = lazy(() => import('./ReferralGifts'))

function AdminProvider({ children }) {
  const [state, setState] = useState({ staff: null, loading: true })

  useEffect(() => {
    let active = true
    api('/admin/auth/me')
      .then((json) => active && setState({ staff: json.data.user, loading: false }))
      .catch(() => active && setState({ staff: null, loading: false }))
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const json = await api('/admin/auth/login', { method: 'POST', body: { email, password } })
    setState({ staff: json.data.user, loading: false })
  }, [])
  const logout = useCallback(async () => {
    await api('/admin/auth/logout', { method: 'POST' }).catch(() => {})
    setState({ staff: null, loading: false })
  }, [])
  // Hiding links is cosmetic. The API enforces every permission itself.
  const can = useCallback((permission) => state.staff?.permissions?.includes(permission) ?? false, [state.staff])

  const value = useMemo(() => ({ ...state, login, logout, can }), [state, login, logout, can])
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

const NAV = [
  { to: '/admin', label: 'Overview', icon: BarChart3, end: true, permission: 'orders' },
  { to: '/admin/notes', label: 'Notes & bundles', icon: FileText, permission: 'content' },
  { to: '/admin/offers', label: 'Offers', icon: Tag, permission: 'pricing' },
  { to: '/admin/teachers', label: 'Teachers', icon: GraduationCap, permission: 'growth', feature: 'teachers' },
  { to: '/admin/gift-cards', label: 'Gift cards', icon: Gift, permission: 'growth', feature: 'referrals' },
  { to: '/admin/orders', label: 'Orders', icon: ReceiptText, permission: 'orders' },
  { to: '/admin/students', label: 'Students', icon: Users, permission: 'users' },
  { to: '/admin/activity', label: 'Activity', icon: Activity, permission: 'orders' },
  { to: '/admin/support', label: 'Support', icon: LifeBuoy, permission: 'support' },
]

function RequireStaff() {
  const { staff, loading } = useAdmin()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center bg-ivory-50 text-ink-600">Loading…</div>
  if (!staff) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

function AdminLayout() {
  const { staff, logout, can } = useAdmin()
  const [open, setOpen] = useState(false)
  const features = useFeatures()
  // A link shows only when the staff role allows it and, for the teacher program, when the server has it switched on.
  const links = NAV.filter((item) => can(item.permission) && (!item.feature || features[item.feature]))

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn('flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition', isActive ? 'bg-white/12 text-white' : 'text-ivory-200 hover:bg-white/8 hover:text-white')
          }
        >
          <Icon size={17} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-ivory-50 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="hidden bg-ink-900 p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-2.5 px-1.5 text-white">
          <LogoMark size={38} tone="onDark" />
          <div>
            <p className="text-lg leading-none"><Wordmark tone="onDark" /></p>
            <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ember-400">Studio</p>
          </div>
        </div>
        <div className="mt-8 flex-1">{nav}</div>
        <div className="border-t border-white/10 pt-4">
          <p className="truncate px-1.5 text-sm font-medium text-white">{staff.name}</p>
          <p className="truncate px-1.5 text-xs text-ivory-300">
            {staff.email} · {staff.role}
          </p>
          <button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ivory-200 hover:bg-white/8 hover:text-white">
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-3 text-white lg:hidden">
        <span className="flex items-center gap-2.5 text-lg">
          <LogoMark size={30} tone="onDark" /> <Wordmark tone="onDark" /> <span className="font-display font-semibold">Studio</span>
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
          {open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <div className="bg-ink-900 px-4 pb-5 lg:hidden">
          {nav}
          <button type="button" onClick={logout} className="mt-3 flex items-center gap-2 px-3.5 py-2 text-sm text-ivory-200">
            <LogOut size={16} aria-hidden="true" />
            Sign out ({staff.email})
          </button>
        </div>
      )}

      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}

// Editors have no overview; send them to where they work.
function Home() {
  const { can } = useAdmin()
  return can('orders') ? <Dashboard /> : <Navigate to="/admin/notes" replace />
}

function Forbidden() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">You don&apos;t have access to this page</h1>
      <p className="mt-2 text-ink-600">Your role does not include it. Ask the account owner if you need it.</p>
      <Button to="/admin" variant="outline" className="mt-5">
        Back
      </Button>
    </div>
  )
}

function Guard({ permission, children }) {
  const { can } = useAdmin()
  return can(permission) ? children : <Forbidden />
}

export default function AdminApp() {
  useLightOnly()
  useEffect(() => {
    const previous = document.title
    document.title = 'JEEdge Studio'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <AdminProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireStaff />}>
          <Route path="read/:id" element={<AdminPreview />} />
          <Route element={<AdminLayout />}>
            <Route index element={<Home />} />
            <Route path="notes" element={<Guard permission="content"><NotesAdmin /></Guard>} />
            <Route path="notes/:id" element={<Guard permission="content"><NoteEditor /></Guard>} />
            <Route path="offers" element={<Guard permission="pricing"><Coupons /></Guard>} />
            <Route path="teachers" element={<Guard permission="growth"><Teachers /></Guard>} />
            <Route path="teachers/:id" element={<Guard permission="growth"><TeacherDetail /></Guard>} />
            <Route path="gift-cards" element={<Guard permission="growth"><ReferralGifts /></Guard>} />
            <Route path="orders" element={<Guard permission="orders"><OrdersAdmin /></Guard>} />
            <Route path="students" element={<Guard permission="users"><Students /></Guard>} />
            <Route path="activity" element={<Guard permission="orders"><ActivityPage /></Guard>} />
            <Route path="support" element={<Guard permission="support"><SupportInbox /></Guard>} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
      </Routes>
    </AdminProvider>
  )
}
