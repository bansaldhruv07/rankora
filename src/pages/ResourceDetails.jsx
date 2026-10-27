import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Info, Lock } from 'lucide-react'
import BookmarkButton from '../components/common/BookmarkButton'
import ResourceCard from '../components/common/ResourceCard'
import Badge, { DifficultyBadge, SubjectBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import SectionHeading from '../components/ui/SectionHeading'
import { TabPanel, Tabs } from '../components/ui/Tabs'
import { usePlan } from '../hooks/usePlan'
import { getRelatedResources, getResourceById } from '../data/resources'
import { formatPrice } from '../utils/format'
import { RESOURCE_TYPES } from '../utils/resourceMeta'
import { ROUTES, explorePath, mockPath, practicePath } from '../utils/routes'
import { getSubjectTheme } from '../utils/subjectTheme'
import { cn } from '../utils/cn'

function ResourceView({ resource }) {
  const { isPremium } = usePlan()
  const [tab, setTab] = useState('sample')

  const type = RESOURCE_TYPES[resource.type]
  const TypeIcon = type.icon
  const theme = getSubjectTheme(resource.subject)
  const isMock = resource.type === 'mock'
  const locked = resource.price > 0 && !isPremium
  const related = getRelatedResources(resource, 3)

  const startPath = isMock
    ? mockPath(resource.mockTestId)
    : practicePath({ subject: resource.subject, chapter: resource.chapter })
  const startLabel = isMock ? 'Start mock test' : 'Practise this chapter'

  const crumbParent =
    resource.subject === 'mixed'
      ? { label: type.label, to: explorePath({ type: resource.type }) }
      : { label: theme.label, to: explorePath({ subject: resource.subject }) }

  const tabs = [
    { id: 'sample', label: 'Sample preview' },
    { id: 'contents', label: 'Contents', count: resource.contents.length },
    { id: 'included', label: 'Included', count: resource.includes.length },
  ]

  const meta = [
    { label: 'Type', value: type.label },
    { label: 'Chapter', value: resource.chapter },
    { label: 'Format', value: resource.length },
  ]

  return (
    <>
      <div className="border-b border-line-soft bg-ivory-100/60">
        <div className="page-container py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="animate-fade">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
              <li>
                <Link to={ROUTES.explore} className="hover:text-ember-600 hover:underline underline-offset-4">
                  Explore
                </Link>
              </li>
              <ChevronRight size={14} aria-hidden="true" />
              <li>
                <Link to={crumbParent.to} className="hover:text-ember-600 hover:underline underline-offset-4">
                  {crumbParent.label}
                </Link>
              </li>
              <ChevronRight size={14} aria-hidden="true" />
              <li aria-current="page" className="max-w-[16rem] truncate font-medium text-ink-800 sm:max-w-none">
                {resource.title}
              </li>
            </ol>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-start">
            <div>
              <div className="animate-rise flex flex-wrap items-center gap-2">
                <span className="grid size-9 place-items-center rounded-lg bg-ivory-200 text-ink-800">
                  <TypeIcon size={18} aria-hidden="true" />
                </span>
                <SubjectBadge subject={resource.subject} />
                <DifficultyBadge level={resource.difficulty} />
              </div>
              <h1
                className="animate-rise stagger mt-5 text-4xl font-semibold leading-[1.1] sm:text-5xl"
                style={{ '--d': '70ms' }}
              >
                {resource.title}
              </h1>
              <p
                className="animate-rise stagger mt-4 max-w-2xl text-lg leading-relaxed text-ink-600"
                style={{ '--d': '140ms' }}
              >
                {resource.summary}
              </p>
              <dl
                className="animate-rise stagger mt-8 grid max-w-2xl gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-3"
                style={{ '--d': '210ms' }}
              >
                {meta.map((item) => (
                  <div key={item.label}>
                    <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-400">{item.label}</dt>
                    <dd className="mt-1 text-sm font-medium text-ink-900">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <aside
              aria-label="Pricing and actions"
              className="animate-rise stagger lg:sticky lg:top-24"
              style={{ '--d': '180ms' }}
            >
              <Card className="p-6 sm:p-7">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-400">Price</p>
                <p
                  className={cn(
                    'mt-1 font-display text-5xl font-semibold',
                    resource.price === 0 ? 'text-sage-700' : 'text-ink-900',
                  )}
                >
                  {formatPrice(resource.price)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {resource.price === 0
                    ? 'Included in the free plan.'
                    : isPremium
                      ? 'Unlocked: Premium is active on this device.'
                      : 'Included with Premium. Demo pricing, no payment is taken.'}
                </p>
                {resource.price > 0 && isPremium && (
                  <Badge tone="sage" icon={Check} className="mt-3">
                    Premium unlocked
                  </Badge>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  {locked ? (
                    <>
                      <Button to={ROUTES.pricing} variant="accent" size="lg" icon={Lock}>
                        Unlock with Premium (demo)
                      </Button>
                      {!isMock && (
                        <Button to={startPath} variant="outline" size="lg">
                          {startLabel}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button to={startPath} variant="accent" size="lg" iconRight={ArrowRight}>
                      {startLabel}
                    </Button>
                  )}
                  <BookmarkButton
                    resourceId={resource.id}
                    title={resource.title}
                    showLabel
                    className="w-full justify-center"
                  />
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </div>

      <section className="page-container py-12 sm:py-16">
        <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="resource" label="Resource details" />

        <TabPanel idPrefix="resource" id="sample" value={tab} className="pt-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-6 sm:p-8">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">
                Sample section
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{resource.sample.heading}</h2>
              <ul className="mt-5 space-y-3">
                {resource.sample.points.map((point) => (
                  <li key={point} className="flex gap-3 leading-relaxed text-ink-700">
                    <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-sage-600" />
                    {point}
                  </li>
                ))}
              </ul>
              <p className="mt-7 flex gap-2 rounded-xl bg-ivory-100 p-4 text-sm leading-relaxed text-ink-600">
                <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-500" />
                Demo content: this section is the preview available in the frontend. A live product would open the
                full document here.
              </p>
            </Card>

            {resource.sample.formulas.length > 0 && (
              <Card className="bg-ivory-100 p-6 sm:p-8">
                <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">
                  Key formulas
                </p>
                <dl className="mt-5 divide-y divide-line">
                  {resource.sample.formulas.map((formula) => (
                    <div key={formula.label} className="py-3.5">
                      <dt className="text-xs font-medium text-ink-500">{formula.label}</dt>
                      <dd className="mt-1 font-mono text-[0.95rem] font-medium text-ink-900">{formula.expr}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
          </div>
        </TabPanel>

        <TabPanel idPrefix="resource" id="contents" value={tab} className="pt-8">
          <Card className="max-w-3xl p-6 sm:p-8">
            <ol className="divide-y divide-line-soft">
              {resource.contents.map((item, index) => (
                <li key={item} className="flex items-baseline gap-5 py-3.5">
                  <span className="tabular font-mono text-sm text-ember-600">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-ink-800">{item}</span>
                </li>
              ))}
            </ol>
          </Card>
        </TabPanel>

        <TabPanel idPrefix="resource" id="included" value={tab} className="pt-8">
          <Card className="max-w-3xl p-6 sm:p-8">
            <ul className="space-y-3">
              {resource.includes.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed text-ink-700">
                  <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-sage-600" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </TabPanel>
      </section>

      <section className="border-t border-line-soft bg-ivory-100/60">
        <div className="page-container py-14 sm:py-16">
          <SectionHeading
            as="h2"
            eyebrow="Keep going"
            title="Related resources"
            description="More material to pair with this one."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ResourceCard key={item.id} resource={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default function ResourceDetails() {
  const { id } = useParams()
  const resource = getResourceById(id)

  if (!resource) {
    return (
      <section className="page-container py-20">
        <EmptyState
          title="Resource not found"
          description="This link does not match any resource. It may have been renamed, or the address was mistyped."
        >
          <Button to={ROUTES.explore} variant="accent">
            Browse all resources
          </Button>
        </EmptyState>
      </section>
    )
  }

  return <ResourceView key={resource.id} resource={resource} />
}