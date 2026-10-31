import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layers } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import BundleCard from '../components/store/BundleCard'
import ProductCard, { ProductCardSkeleton } from '../components/store/ProductCard'
import Button from '../components/ui/Button'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import SearchInput from '../components/ui/SearchInput'
import Select from '../components/ui/Select'
import { Tabs } from '../components/ui/Tabs'
import { useAuth } from '../hooks/useAuth'
import { useApi } from '../hooks/useApi'
import { api } from '../lib/api'
import { pluralize } from '../utils/format'
import { getSubjectTheme } from '../utils/subjectTheme'

const PAGE_SIZE = 12
const SUBJECTS = ['physics', 'chemistry', 'mathematics']
const SORTS = [
  { value: 'featured', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

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
  const { data: bundleData } = useApi('/products?kind=bundle&limit=6')

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
  const subjectTabs = [
    { id: 'all', label: 'All subjects', count: catalog ? Object.values(catalog).reduce((n, s) => n + s.count, 0) : undefined },
    ...SUBJECTS.map((id) => ({ id, label: getSubjectTheme(id).label, count: catalog?.[id]?.count ?? 0 })),
  ]
  const chapters = useMemo(() => {
    if (!catalog) return []
    const subjects = subject === 'all' ? Object.values(catalog) : [catalog[subject]].filter(Boolean)
    const names = new Set()
    for (const s of subjects) for (const c of s.chapters) if (classLevel === 'all' || c.classLevel === classLevel || c.classLevel === 'both') names.add(c.chapter)
    return [...names].sort()
  }, [catalog, subject, classLevel])

  const hasFilters = subject !== 'all' || classLevel !== 'all' || chapter !== 'all' || q !== ''
  const showBundles = bundleData?.length > 0 && !q && chapter === 'all' && classLevel === 'all'
  const bundles = (bundleData ?? []).filter((b) => subject === 'all' || b.subject === subject || b.subject === 'mixed')

  return (
    <>
      <PageHeader
        eyebrow="Notes library"
        title="Chapter notes you read, not just download"
        description="Revision notes for JEE, organised by subject, class and chapter. Open any note in the Rankora reader, on your phone or laptop, and pick up where you stopped."
      >
        <div className="w-full lg:w-[24rem]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search a chapter or topic" label="Search notes" />
        </div>
      </PageHeader>

      <section className="page-container py-10 sm:py-12">
        <Tabs tabs={subjectTabs} value={subject} onChange={(id) => update({ subject: id, chapter: 'all' })} idPrefix="notes" label="Filter by subject" />

        <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Class">
            {[['all', 'Both classes'], ['11', 'Class 11'], ['12', 'Class 12']].map(([id, label]) => (
              <Chip key={id} active={classLevel === id} onClick={() => update({ class: id, chapter: 'all' })}>
                {label}
              </Chip>
            ))}
          </div>
          <Select label="Chapter" value={chapter} onChange={(value) => update({ chapter: value })} options={[{ value: 'all', label: 'All chapters' }, ...chapters.map((c) => ({ value: c, label: c }))]} />
          <Select label="Sort by" value={sort} onChange={(value) => update({ sort: value })} options={SORTS} />
        </div>

        {showBundles && (
          <div className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">
                  <Layers size={13} aria-hidden="true" />
                  Bundles
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Buy together, pay less</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {bundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} owned={bundle.items?.length > 0 && bundle.items.every(owned)} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="text-sm text-ink-600">
            {first.loading ? 'Loading notes…' : <>Showing <strong className="tabular font-semibold text-ink-900">{items.length}</strong> of {pluralize(total, 'note')}</>}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setParams({}, { replace: true }) }}>
              Clear all filters
            </Button>
          )}
        </div>

        <div className="mt-6">
          {first.error ? (
            <EmptyState title="Could not load the notes" description={first.error.message}>
              <Button variant="outline" onClick={first.reload}>
                Try again
              </Button>
            </EmptyState>
          ) : first.loading ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6" aria-busy="true">
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i}>
                  <ProductCardSkeleton />
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            hasFilters ? (
              <EmptyState title="No notes match these filters" description="Try a shorter search word, or remove a filter to widen the results.">
                <Button variant="outline" onClick={() => { setSearch(''); setParams({}, { replace: true }) }}>
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
              <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
                {items.map((item, index) => (
                  <li key={item.id} className="animate-rise stagger" style={{ '--d': `${Math.min(index, 8) * 40}ms` }}>
                    <ProductCard product={item} owned={owned(item)} />
                  </li>
                ))}
              </ul>
              {items.length < total && (
                <div className="mt-12 text-center">
                  <Button variant="outline" size="lg" onClick={loadMore} disabled={extra.loading}>
                    {extra.loading ? 'Loading…' : `Show more (${total - items.length} left)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
