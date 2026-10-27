import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import Card from '../ui/Card'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { TabPanel, Tabs } from '../ui/Tabs'
import { SubjectBadge } from '../ui/Badge'
import { SUBJECTS } from '../../data/subjects'
import { getResourceById } from '../../data/resources'
import { resourcePath } from '../../utils/routes'

const SAMPLE_IDS = {
  physics: 'phy-kinematics-notes',
  chemistry: 'chem-mole-notes',
  mathematics: 'math-quadratic-notes',
}
const TABS = SUBJECTS.map((subject) => ({ id: subject.id, label: subject.name }))

export default function SampleNotes() {
  const [subject, setSubject] = useState('physics')
  const resource = getResourceById(SAMPLE_IDS[subject])
  const { sample } = resource

  return (
    <section className="page-container py-20 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Sample notes"
          title="Notes that get to the point"
          description="Read a real section from a free note in each subject. Every note ends with a self-check."
        />
      </Reveal>

      <Reveal delay={100} className="mt-10">
        <Tabs tabs={TABS} value={subject} onChange={setSubject} idPrefix="home-notes" label="Sample notes by subject" />
        <TabPanel idPrefix="home-notes" id={subject} value={subject} className="pt-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <SubjectBadge subject={resource.subject} />
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink-400">
                  {resource.chapter}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold sm:text-3xl">{sample.heading}</h3>
              <ul className="mt-5 space-y-3">
                {sample.points.map((point) => (
                  <li key={point} className="flex gap-3 leading-relaxed text-ink-700">
                    <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-sage-600" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                to={resourcePath(resource.id)}
                className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-ember-600 underline-offset-4 hover:underline"
              >
                Open {resource.title}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </Card>

            <Card className="bg-ivory-100 p-6 sm:p-8">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">
                Formula sheet
              </p>
              <dl className="mt-5 divide-y divide-line">
                {sample.formulas.map((formula) => (
                  <div key={formula.label} className="py-3.5">
                    <dt className="text-xs font-medium text-ink-500">{formula.label}</dt>
                    <dd className="mt-1 font-mono text-[0.95rem] font-medium text-ink-900">{formula.expr}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </TabPanel>
      </Reveal>
    </section>
  )
}