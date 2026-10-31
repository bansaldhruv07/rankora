import { Link } from 'react-router-dom'
import { BookOpen, Check, RefreshCw } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import ProductCover from '../components/store/ProductCover'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useApi } from '../hooks/useApi'
import { CLASS_LABELS, formatLongDate, pluralize } from '../utils/format'
import { ROUTES, notePath, readPath } from '../utils/routes'
import { getSubjectTheme } from '../utils/subjectTheme'

const SUBJECT_ORDER = ['physics', 'chemistry', 'mathematics']
const SOURCE_LABEL = { purchase: 'Purchased', bundle: 'From a bundle', premium: 'Premium', free: 'Free' }

function ProgressLine({ progress, pages }) {
  const total = progress?.pages ?? pages
  if (!progress || !total) return <p className="text-sm text-ink-500">Not started yet</p>
  const done = Math.min(100, Math.round((progress.page / total) * 100))
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ivory-200" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={100} aria-label="Reading progress">
        <div className="h-full rounded-full bg-sage-500 transition-[width] duration-500" style={{ width: `${done}%` }} />
      </div>
      <p className="tabular mt-1.5 text-sm text-ink-600">
        Page {progress.page} of {total} · {done}%
      </p>
    </div>
  )
}

function LibraryRow({ item }) {
  const { product, progress } = item
  const started = Boolean(progress)
  return (
    <li className="flex gap-4 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:gap-5 sm:p-5">
      <div className="w-16 shrink-0 sm:w-20">
        <ProductCover product={product} compact />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="sage" icon={Check}>
              Active
            </Badge>
            {item.updatedSincePurchase && (
              <Badge tone="ember" icon={RefreshCw}>
                Updated {formatLongDate(item.updatedAt)}
              </Badge>
            )}
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-snug">
            <Link to={notePath(product.slug)} className="hover:text-ember-600">
              {product.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-ink-600">
            {[product.chapter, product.classLevel && CLASS_LABELS[product.classLevel], item.pages && pluralize(item.pages, 'page')].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-1 font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-400">
            {SOURCE_LABEL[item.source]} · {formatLongDate(item.purchasedAt)}
            {item.orderReference ? ` · ${item.orderReference}` : ''}
            {item.expiresAt ? ` · until ${formatLongDate(item.expiresAt)}` : ''}
          </p>
          <div className="mt-3 max-w-sm">
            <ProgressLine progress={progress} pages={item.pages} />
          </div>
        </div>
        <Button to={readPath(product.slug)} variant={started ? 'accent' : 'primary'} icon={BookOpen} className="self-start sm:self-center">
          {started ? 'Continue reading' : 'Start reading'}
        </Button>
      </div>
    </li>
  )
}

export default function Library() {
  const { user, loading, openAuth } = useAuth()
  const { data, error, loading: fetching, reload } = useApi(user ? '/library' : null)

  if (loading) return <section className="page-container py-20 text-ink-600">Loading your library…</section>
  if (!user) {
    return (
      <section className="page-container py-20">
        <EmptyState icon={BookOpen} title="Sign in to open your library" description="Notes you buy are kept in your account, ready to read on any device.">
          <Button variant="accent" onClick={() => openAuth('login')}>
            Sign in
          </Button>
        </EmptyState>
      </section>
    )
  }

  const items = data?.items ?? []
  const resume = items.find((item) => item.product.slug === data?.continueReading)
  const groups = [...SUBJECT_ORDER, 'other']
    .map((id) => ({ id, items: items.filter((item) => (SUBJECT_ORDER.includes(item.product.subject) ? item.product.subject : 'other') === id) }))
    .filter((group) => group.items.length)

  return (
    <>
      <PageHeader eyebrow="My library" title={`Your notes, ${user.name.split(' ')[0]}`} description="Everything you own, grouped by subject. Open a note and it resumes on the page you left." />

      <section className="page-container space-y-12 py-10 sm:py-14">
        {error && (
          <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
            {error.message}{' '}
            <button type="button" onClick={reload} className="font-semibold underline">
              Retry
            </button>
          </p>
        )}

        {fetching && <div className="h-40 animate-pulse rounded-2xl bg-ivory-200" aria-busy="true" />}

        {data && items.length === 0 && (
          <EmptyState icon={BookOpen} title="Your library is empty" description="Notes you buy show up here the moment payment is verified. The free sample on each note page is a good place to start.">
            <Button to={ROUTES.notes} variant="accent">
              Browse notes
            </Button>
          </EmptyState>
        )}

        {resume && (
          <div className="flex flex-col gap-5 rounded-3xl bg-night p-5 text-white shadow-lift sm:flex-row sm:items-center sm:p-7">
            <div className="w-24 shrink-0 sm:w-28">
              <ProductCover product={resume.product} compact />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-ember-400">Continue where you left off</p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{resume.product.title}</h2>
              <p className="tabular mt-2 text-white/80">
                Page {resume.progress.page} of {resume.progress.pages ?? resume.pages}
              </p>
            </div>
            <Button to={readPath(resume.product.slug)} variant="accent" size="lg" icon={BookOpen}>
              Resume
            </Button>
          </div>
        )}

        {groups.map((group) => {
          const theme = getSubjectTheme(group.id)
          return (
            <div key={group.id}>
              <h2 className="flex items-center gap-3 text-2xl font-semibold">
                <span className={`size-3 rounded-full ${theme.dot}`} aria-hidden="true" />
                {group.id === 'other' ? 'Other' : theme.label}
                <span className="tabular font-mono text-sm font-normal text-ink-400">{group.items.length}</span>
              </h2>
              <ul className="mt-5 space-y-4">
                {group.items.map((item) => (
                  <LibraryRow key={item.product.id} item={item} />
                ))}
              </ul>
            </div>
          )
        })}

        {data?.access.premium && (
          <p className="text-sm text-ink-600">
            Premium is active until {formatLongDate(data.access.premiumUntil)}. It unlocks every note marked as included in Premium; other notes are bought separately.
          </p>
        )}
      </section>
    </>
  )
}
