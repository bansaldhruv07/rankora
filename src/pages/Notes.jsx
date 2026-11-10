import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, Check, Layers } from 'lucide-react'
import BundlePoster from '../components/store/BundlePoster'
import CheckoutModal from '../components/pricing/CheckoutModal'
import ProductCard, { ProductCardSkeleton } from '../components/store/ProductCard'
import Button from '../components/ui/Button'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import SearchInput from '../components/ui/SearchInput'
import Select from '../components/ui/Select'
import { useAuth } from '../hooks/useAuth'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { pluralize } from '../utils/format'
import { getSubjectTheme } from '../utils/subjectTheme'

const PAGE_SIZE = 15
const SUBJECTS = ['physics', 'chemistry', 'mathematics']
const SORTS = [
  { value: 'featured', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

// The artwork for each bundle. A poster is shown even before its bundle exists (it then says "Coming soon").
const ALL_BUNDLE = { slug: 'jee-complete-pcm', image: '/bundles/complete.webp', alt: 'Complete JEE bundle: short handwritten notes for Physics, Chemistry and Maths, Class 11 and 12' }
const SUBJECT_BUNDLES = [
  { slug: 'physics-complete', image: '/bundles/physics.webp', alt: 'Complete Physics: short handwritten notes, Class 11 and 12' },
  { slug: 'chemistry-complete', image: '/bundles/chemistry.webp', alt: 'Complete Chemistry: short handwritten notes, Class 11 and 12' },
  { slug: 'mathematics-complete', image: '/bundles/mathematics.webp', alt: 'Complete Maths: short handwritten notes, Class 11 and 12' },
]

// The notes marketplace. Everything shown here is a published product from the catalogue API.
export default function Notes() {
  const [params, setParams] = useSearchParams()
  const { access } = useAuth()
  const subject = pick(params.get('subject'), ['all', ...SUBJECTS], 'all')
  const classLevel = pick(params.get('class'), ['all', '11', '12'], 'all')
  const chapter = params.get('chapter') ?? 'all'
  const sort = pick(params.get('sort'), SORTS.map((s) => s.value), 'featured')
  const q = params.get('q') ?? ''
  const [search, setSearch] = useState(q)
  const [checkout, setCheckout] = useState({ open: false, key: 0, bundle: null })
  const buyBundle = (bundle) => setCheckout((prev) => ({ open: true, key: prev.key + 1, bundle }))

  // Typing updates the box immediately; the URL (and request) follows after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search === q) return
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (search) next.set('q', search)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [search, q, setParams])

  const update = (patch) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (!value || value === 'all' || (key === 'sort' && value === 'featured')) next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )

  const { data: catalog } = useApi('/products/catalog')
  const { data: bundleData } = useApi('/products?kind=bundle&limit=30')

  const query = useMemo(() => {
    const p = new URLSearchParams({ limit: String(PAGE_SIZE), sort })
    if (subject !== 'all') p.set('subject', subject)
    if (classLevel !== 'all') p.set('class', classLevel)
    if (chapter !== 'all') p.set('chapter', chapter)
    if (q) p.set('q', q)
    return p.toString()
  }, [subject, classLevel, chapter, sort, q])

  const first = useApi(`/products?${query}`)
  const [more, setMore] = useState({ query: '', items: [], page: 1, loading: false })
  const extra = more.query === query ? more : { items: [], page: 1, loading: false }
  const items = [...(first.data ?? []), ...extra.items]
  const total = first.meta?.total ?? 0

  const loadMore = async () => {
    const page = extra.page + 1
    setMore({ ...extra, query, loading: true })
    try {
      const json = await api(`/products?${query}&page=${page}`)
      setMore({ query, items: [...extra.items, ...json.data], page, loading: false })
    } catch {
      setMore({ ...extra, query, loading: false })
    }
  }

  const owned = (item) => access.productSlugs.includes(item.slug) || (access.premium && item.premiumIncluded)
  // Subjects with no notes yet stay out of the way (unless one is already selected).
  const subjectTabs = [
    { id: 'all', label: 'All subjects', count: catalog ? Object.values(catalog).reduce((n, s) => n + s.count, 0) : undefined },
    ...SUBJECTS.filter((id) => !catalog || (catalog[id]?.count ?? 0) > 0 || id === subject).map((id) => ({ id, label: getSubjectTheme(id).label, count: catalog?.[id]?.count ?? 0 })),
  ]
  const chapters = useMemo(() => {
    if (!catalog) return []
    const subjects = subject === 'all' ? Object.values(catalog) : [catalog[subject]].filter(Boolean)
    const names = new Set()
    for (const s of subjects) for (const c of s.chapters) if (classLevel === 'all' || c.classLevel === classLevel || c.classLevel === 'both') names.add(c.chapter)
    return [...names].sort()
  }, [catalog, subject, classLevel])

  const hasFilters = subject !== 'all' || classLevel !== 'all' || chapter !== 'all' || q !== ''
  const bundleBySlug = useMemo(() => new Map((bundleData ?? []).map((b) => [b.slug, b])), [bundleData])
  const bundleOwned = (bundle) => Boolean(bundle?.items?.length) && bundle.items.every(owned)
  const clearAll = () => {
    setSearch('')
    setParams({}, { replace: true })
  }

  return (
    <>
      <header className="border-b border-line-soft bg-ivory-100/60">
        <div className="page-container grid items-center gap-6 py-5 sm:py-6 lg:grid-cols-[1fr_36rem] lg:gap-10">
          <div className="max-w-md">
            <p className="animate-rise mb-2 flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ember-600">
              <span aria-hidden="true" className="h-px w-8 bg-ember-500" />
              Notes library
            </p>
            <h1 className="animate-rise stagger text-3xl font-semibold leading-[1.12] sm:text-4xl" style={{ '--d': '60ms' }}>
              Notes for the whole JEE syllabus
            </h1>
            <p className="animate-rise stagger mt-2.5 text-sm leading-relaxed text-ink-600 sm:text-base" style={{ '--d': '140ms' }}>
              Short handwritten notes in book order. Read them in the JEEdge reader on your phone or laptop.
            </p>
            <ul className="animate-rise stagger mt-4 space-y-1.5 text-[0.82rem] text-ink-700" style={{ '--d': '200ms' }}>
              {['Free sample on notes that offer one', 'Pay once, keep it, instant access', 'Buy a chapter, a subject or everything'].map((point) => (
                <li key={point} className="flex items-center gap-2.5">
                  <Check size={14} aria-hidden="true" className="shrink-0 text-sage-600" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="animate-rise stagger mt-5" style={{ '--d': '260ms' }}>
              <Button href="#notes" variant="outline" size="sm" iconRight={ArrowDown}>
                Browse single notes
              </Button>
            </div>
          </div>

          <div className="animate-rise stagger" style={{ '--d': '200ms' }}>
            <BundlePoster wide priority bundle={bundleBySlug.get(ALL_BUNDLE.slug)} owned={bundleOwned(bundleBySlug.get(ALL_BUNDLE.slug))} onBuy={() => buyBundle(bundleBySlug.get(ALL_BUNDLE.slug))} image={ALL_BUNDLE.image} alt={ALL_BUNDLE.alt} className="shadow-lift" />
          </div>
        </div>
      </header>

      <section aria-label="Subject bundles" className="page-container pt-8 sm:pt-10">
        <div className="mx-auto max-w-[50rem]">
          <p className="mb-4 inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">
            <Layers size={13} aria-hidden="true" />
            Subject bundles · a whole subject, one price
          </p>
          <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
            {SUBJECT_BUNDLES.map((item) => {
              const bundle = bundleBySlug.get(item.slug)
              return <BundlePoster key={item.slug} bundle={bundle} owned={bundleOwned(bundle)} onBuy={() => buyBundle(bundle)} image={item.image} alt={item.alt} className="w-[62%] shrink-0 snap-start sm:w-auto" />
            })}
          </div>
        </div>
      </section>

      <section id="notes" className="page-container scroll-mt-24 py-8 sm:py-10">
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
          <div className="grid items-end gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
            <SearchInput value={search} onChange={setSearch} placeholder="Search a chapter or topic" label="Search notes" />
            <Select label="Chapter" value={chapter} onChange={(value) => update({ chapter: value })} options={[{ value: 'all', label: 'All chapters' }, ...chapters.map((c) => ({ value: c, label: c }))]} />
            <Select label="Sort by" value={sort} onChange={(value) => update({ sort: value })} options={SORTS} />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Subject">
              {subjectTabs.map((tab) => (
                <Chip key={tab.id} active={subject === tab.id} count={tab.count} onClick={() => update({ subject: tab.id, chapter: 'all' })}>
                  {tab.label}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Class">
              {[['all', 'Both classes'], ['11', 'Class 11'], ['12', 'Class 12']].map(([id, label]) => (
                <Chip key={id} active={classLevel === id} className="h-8 px-3.5 text-[0.8rem]" onClick={() => update({ class: id, chapter: 'all' })}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="text-sm text-ink-600">
            {first.loading ? 'Loading notes…' : <>Showing <strong className="tabular font-semibold text-ink-900">{items.length}</strong> of {pluralize(total, 'note')}</>}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all filters
            </Button>
          )}
        </div>

        <div className="mt-5">
          {first.error ? (
            <EmptyState title="Could not load the notes" description={first.error.message}>
              <Button variant="outline" onClick={first.reload}>
                Try again
              </Button>
            </EmptyState>
          ) : first.loading ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-4" aria-busy="true">
              {Array.from({ length: 10 }, (_, i) => (
                <li key={i}>
                  <ProductCardSkeleton />
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            hasFilters ? (
              <EmptyState title="No notes match these filters" description="Try a shorter search word, or remove a filter to widen the results.">
                <Button variant="outline" onClick={clearAll}>
                  Clear all filters
                </Button>
              </EmptyState>
            ) : (
              <EmptyState title="New notes are on the way" description="Nothing is published yet. Check back soon, or sign in to see your library.">
                <Button to="/library" variant="outline">
                  My library
                </Button>
              </EmptyState>
            )
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-4">
                {items.map((item, index) => (
                  <li key={item.id} className="animate-rise stagger" style={{ '--d': `${Math.min(index, 8) * 40}ms` }}>
                    <ProductCard product={item} owned={owned(item)} />
                  </li>
                ))}
              </ul>
              {items.length < total && (
                <div className="mt-9 text-center">
                  <Button variant="outline" size="lg" onClick={loadMore} disabled={extra.loading}>
                    {extra.loading ? 'Loading…' : `Show more (${total - items.length} left)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {checkout.bundle && (
        <CheckoutModal
          key={checkout.key}
          open={checkout.open}
          onClose={() => setCheckout((prev) => ({ ...prev, open: false }))}
          slug={checkout.bundle.slug}
          title={checkout.bundle.title}
          kind="bundle"
          itemCount={checkout.bundle.items?.length}
          fallbackAmount={checkout.bundle.price}
        />
      )}
    </>
  )
}
