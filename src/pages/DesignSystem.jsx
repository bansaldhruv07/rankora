import { useState } from 'react'
import { ArrowRight, Timer } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import ResourceCard from '../components/common/ResourceCard'
import Accordion from '../components/ui/Accordion'
import Badge, { DifficultyBadge, SubjectBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import ProgressBar from '../components/ui/ProgressBar'
import Reveal from '../components/ui/Reveal'
import SearchInput from '../components/ui/SearchInput'
import SectionHeading from '../components/ui/SectionHeading'
import Select from '../components/ui/Select'
import { TabPanel, Tabs } from '../components/ui/Tabs'
import { useToast } from '../hooks/useToast'
import { RESOURCES } from '../data/resources'
import { FAQ } from '../data/faq'
import { DIFFICULTIES } from '../utils/constants'
import { cn } from '../utils/cn'

const SWATCHES = [
  { name: 'Ivory 50', className: 'bg-ivory-50' },
  { name: 'Ivory 200', className: 'bg-ivory-200' },
  { name: 'Ink 900', className: 'bg-ink-900' },
  { name: 'Ink 600', className: 'bg-ink-600' },
  { name: 'Ember 500', className: 'bg-ember-500' },
  { name: 'Ember 100', className: 'bg-ember-100' },
  { name: 'Sage 500', className: 'bg-sage-500' },
  { name: 'Sage 100', className: 'bg-sage-100' },
]

const SUBJECT_OPTIONS = [
  { value: 'all', label: 'All subjects' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'mathematics', label: 'Mathematics' },
]

const TABS = [
  { id: 'notes', label: 'Notes' },
  { id: 'formulas', label: 'Formulas', count: 4 },
  { id: 'pyq', label: 'PYQs', count: 20 },
]

function Block({ eyebrow, title, children }) {
  return (
    <Reveal as="section" className="page-container py-10">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="mt-8">{children}</div>
    </Reveal>
  )
}

export default function DesignSystem() {
  const toast = useToast()
  const [tab, setTab] = useState('notes')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('all')
  const [level, setLevel] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)

  const visible = RESOURCES.filter((resource) => {
    const matchesQuery = resource.title.toLowerCase().includes(query.trim().toLowerCase())
    const matchesSubject = subject === 'all' || resource.subject === subject
    const matchesLevel = level === 'All' || resource.difficulty === level
    return matchesQuery && matchesSubject && matchesLevel
  }).slice(0, 6)

  return (
    <>
      <PageHeader
        eyebrow="Design system"
        title="Rankora components"
        description="A working preview of the shared UI: every control below is interactive."
      />

      <Block eyebrow="Colour" title="Ivory, ink, ember and sage">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {SWATCHES.map((swatch) => (
            <div key={swatch.name}>
              <div className={cn('h-16 rounded-xl border border-line', swatch.className)} />
              <p className="mt-2 text-xs font-medium text-ink-600">{swatch.name}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block eyebrow="Controls" title="Buttons and badges">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" iconRight={ArrowRight}>Primary</Button>
          <Button variant="accent" iconRight={ArrowRight}>Accent</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="ember">Ember</Badge>
          <Badge tone="sage">Sage</Badge>
          <Badge tone="ink" icon={Timer}>Ink</Badge>
          <Badge tone="danger">Danger</Badge>
          <SubjectBadge subject="physics" />
          <SubjectBadge subject="chemistry" />
          <SubjectBadge subject="mathematics" />
          <DifficultyBadge level="Easy" />
          <DifficultyBadge level="Medium" />
          <DifficultyBadge level="Hard" />
        </div>
      </Block>

      <Block eyebrow="Interaction" title="Tabs, progress and dialogs">
        <Tabs tabs={TABS} value={tab} onChange={setTab} idPrefix="ds" label="Resource sections" />
        <TabPanel idPrefix="ds" id="notes" value={tab} className="py-6">
          <p className="max-w-xl leading-relaxed text-ink-600">
            Arrow keys, Home and End move between tabs. This panel is the Notes tab.
          </p>
        </TabPanel>
        <TabPanel idPrefix="ds" id="formulas" value={tab} className="py-6">
          <p className="max-w-xl leading-relaxed text-ink-600">The Formulas tab shows a count beside its label.</p>
        </TabPanel>
        <TabPanel idPrefix="ds" id="pyq" value={tab} className="py-6">
          <p className="max-w-xl leading-relaxed text-ink-600">The PYQs tab. Panels fade in when selected.</p>
        </TabPanel>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <ProgressBar label="Physics" value={72} tone="ink" showValue />
          <ProgressBar label="Chemistry" value={58} tone="sage" showValue />
          <ProgressBar label="Mathematics" value={41} tone="ember" showValue />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setModalOpen(true)}>Open dialog</Button>
          <Button
            variant="soft"
            onClick={() => toast({ title: 'Toast works', description: 'It dismisses itself after a few seconds.' })}
          >
            Show toast
          </Button>
        </div>
      </Block>

      <Block eyebrow="Search and filters" title="Cards, bookmarks and empty states">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search resources, e.g. kinematics"
            label="Search resources"
          />
          <Select label="Subject" value={subject} onChange={setSubject} options={SUBJECT_OPTIONS} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Difficulty">
          {['All', ...DIFFICULTIES].map((item) => (
            <Chip key={item} active={level === item} onClick={() => setLevel(item)}>
              {item}
            </Chip>
          ))}
        </div>

        {visible.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-8"
            title="No resources match"
            description="Try a different word, or clear the filters."
          >
            <Button
              variant="outline"
              onClick={() => {
                setQuery('')
                setSubject('all')
                setLevel('All')
              }}
            >
              Clear filters
            </Button>
          </EmptyState>
        )}
      </Block>

      <Block eyebrow="Content" title="Accordion and cards">
        <div className="grid gap-10 lg:grid-cols-2">
          <Accordion items={FAQ.slice(0, 4)} />
          <Card className="p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ember-600">Card</p>
            <h3 className="mt-3 text-2xl font-semibold">Editorial surface</h3>
            <p className="mt-3 leading-relaxed text-ink-600">
              Cards use a warm paper tone, a crisp border and a soft shadow. Interactive cards lift on hover.
            </p>
          </Card>
        </div>
      </Block>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit this test?"
        description="You can still change answers until you confirm. Escape closes this dialog."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Keep working</Button>
            <Button
              variant="accent"
              onClick={() => {
                setModalOpen(false)
                toast({ title: 'Confirmed', description: 'This is a demo dialog.' })
              }}
            >
              Submit
            </Button>
          </>
        }
      />
    </>
  )
}