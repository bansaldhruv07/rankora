import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import ResourceCard from '../components/common/ResourceCard'
import Button from '../components/ui/Button'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import SearchInput from '../components/ui/SearchInput'
import Select from '../components/ui/Select'
import { TabPanel, Tabs } from '../components/ui/Tabs'
import { useBookmarks } from '../hooks/useBookmarks'
import { RESOURCES, getResourceChapters } from '../data/resources'
import { SUBJECTS } from '../data/subjects'
import { DIFFICULTIES } from '../utils/constants'
import {
  DIFFICULTY_OPTIONS,
  PRICE_OPTIONS,
  SORT_OPTIONS,
  filterResources,
  sortResources,
} from '../utils/resourceFilters'
import { RESOURCE_TYPES } from '../utils/resourceMeta'

const SUBJECT_IDS = ['all', ...SUBJECTS.map((subject) => subject.id)]
const TYPE_IDS = ['all', ...Object.keys(RESOURCE_TYPES)]
const DIFFICULTY_IDS = ['all', ...DIFFICULTIES]
const PRICE_IDS = PRICE_OPTIONS.map((option) => option.value)
const SORT_IDS = SORT_OPTIONS.map((option) => option.value)

const pick = (value, allowed, fallback = 'all') => (allowed.includes(value) ? value : fallback)

export default function Explore() {
  const [params, setParams] = useSearchParams()
  const { ids: savedIds, count: savedCount } = useBookmarks()

  const query = params.get('q') ?? ''
  const subject = pick(params.get('subject'), SUBJECT_IDS)
  const type = pick(params.get('type'), TYPE_IDS)
  const difficulty = pick(params.get('difficulty'), DIFFICULTY_IDS)
  const price = pick(params.get('price'), PRICE_IDS)
  const sort = pick(params.get('sort'), SORT_IDS, 'featured')
  const savedOnly = params.get('saved') === '1'

  const chapters = useMemo(() => getResourceChapters(subject === 'all' ? undefined : subject), [subject])
  const chapter = pick(params.get('chapter'), ['all', ...chapters])

  const update = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      const isDefault =
        value === '' ||
        value === null ||
        value === undefined ||
        value === 'all' ||
        (key === 'sort' && value === 'featured')
      if (isDefault) next.delete(key)
      else next.set(key, value)
    })
    setParams(next, { replace: true })
  }

  const clearAll = () => setParams({}, { replace: true })

  const base = { query, type, difficulty, chapter, price, savedIds: savedOnly ? savedIds : null }
  const subjectScope = filterResources(RESOURCES, { ...base, subject: 'all' })
  const typeScope = filterResources(RESOURCES, { ...base, subject, type: 'all' })
  const results = sortResources(filterResources(RESOURCES, { ...base, subject }), sort)

  const subjectTabs = [
    { id: 'all', label: 'All', count: subjectScope.length },
    ...SUBJECTS.map((item) => ({
      id: item.id,
      label: item.name,
      count: subjectScope.filter((resource) => resource.subject === item.id).length,
    })),
  ]

  const hasFilters =
    query !== '' ||
    subject !== 'all' ||
    type !== 'all' ||
    difficulty !== 'all' ||
    chapter !== 'all' ||
    price !== 'all' ||
    savedOnly

  const chapterOptions = [
    { value: 'all', label: 'All chapters' },
    ...chapters.map((name) => ({ value: name, label: name })),
  ]

  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Find the right note, sheet or question set"
        description="Search by topic, filter by subject, type, difficulty and price, and save what you want to revisit."
      >
        <div className="w-full lg:w-[26rem]">
          <SearchInput
            value={query}
            onChange={(value) => update({ q: value })}
            placeholder="Search, e.g. integration or friction"
            label="Search resources"
          />
        </div>
      </PageHeader>

      <section className="page-container py-10 sm:py-12">
        <Tabs
          tabs={subjectTabs}
          value={subject}
          onChange={(id) => update({ subject: id, chapter: 'all' })}
          idPrefix="explore"
          label="Filter by subject"
        />

        <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Resource type">
          <Chip active={type === 'all'} count={typeScope.length} onClick={() => update({ type: 'all' })}>
            All types
          </Chip>
          {Object.entries(RESOURCE_TYPES).map(([id, meta]) => (
            <Chip
              key={id}
              active={type === id}
              count={typeScope.filter((resource) => resource.type === id).length}
              onClick={() => update({ type: type === id ? 'all' : id })}
            >
              {meta.label}
            </Chip>
          ))}
          <Chip
            active={savedOnly}
            count={savedCount}
            onClick={() => update({ saved: savedOnly ? '' : '1' })}
            className="sm:ml-auto"
          >
            <Bookmark size={14} aria-hidden="true" fill={savedOnly ? 'currentColor' : 'none'} />
            Saved only
          </Chip>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Difficulty"
            value={difficulty}
            onChange={(value) => update({ difficulty: value })}
            options={DIFFICULTY_OPTIONS}
          />
          <Select
            label="Chapter"
            value={chapter}
            onChange={(value) => update({ chapter: value })}
            options={chapterOptions}
          />
          <Select label="Price" value={price} onChange={(value) => update({ price: value })} options={PRICE_OPTIONS} />
          <Select label="Sort by" value={sort} onChange={(value) => update({ sort: value })} options={SORT_OPTIONS} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="text-sm text-ink-600">
            Showing <strong className="tabular font-semibold text-ink-900">{results.length}</strong> of{' '}
            {RESOURCES.length} resources
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all filters
            </Button>
          )}
        </div>

        <TabPanel idPrefix="explore" id={subject} value={subject} className="mt-5 outline-none">
          {results.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((resource, index) => (
                <li
                  key={resource.id}
                  className="animate-rise stagger"
                  style={{ '--d': `${Math.min(index, 8) * 40}ms` }}
                >
                  <ResourceCard resource={resource} />
                </li>
              ))}
            </ul>
          ) : savedOnly && savedCount === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Nothing saved yet"
              description="Tap the bookmark on any resource and it will be kept here for quick revision."
            >
              <Button variant="outline" onClick={() => update({ saved: '' })}>
                Browse all resources
              </Button>
            </EmptyState>
          ) : (
            <EmptyState
              title="No resources match these filters"
              description="Try a shorter search word, or remove a filter to widen the results."
            >
              <Button variant="outline" onClick={clearAll}>
                Clear all filters
              </Button>
            </EmptyState>
          )}
        </TabPanel>
      </section>
    </>
  )
}