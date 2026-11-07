import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { LinkedInIcon } from '../common/BrandIcons'
import Reveal from '../ui/Reveal'
import { COLLEGES, SITE, isLink } from '../../data/site'
import { cn } from '../../utils/cn'

const initials = (name) => name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()

// The photo if the file exists, otherwise the initials.
function Avatar({ founder }) {
  const [failed, setFailed] = useState(false)
  const frame = 'size-28 shrink-0 rounded-2xl ring-1 ring-ember-500/20 transition duration-300 group-hover:rotate-3 group-hover:scale-105 sm:size-36'
  if (founder.photo && !failed) {
    return <img src={founder.photo} alt={founder.name} width="144" height="144" loading="lazy" onError={() => setFailed(true)} className={cn(frame, 'object-cover')} />
  }
  return <span className={cn(frame, 'grid place-items-center bg-ember-50 font-display text-3xl font-semibold text-ember-600')}>{initials(founder.name)}</span>
}

function Founder({ founder, index }) {
  const college = COLLEGES[founder.college]
  return (
    <Reveal delay={index * 100} className="h-full">
      <article className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:gap-6 sm:p-6">
        <Avatar founder={founder} />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold leading-tight sm:text-2xl">{founder.name}</h3>
          <p className="mt-0.5 text-sm text-ink-600">{founder.role}, Rankora</p>
          {college && (
            <p className="mt-2 inline-flex items-center gap-2">
              <span className={cn('inline-grid h-6 min-w-11 place-items-center rounded-md px-1.5 font-mono text-[0.68rem] font-semibold tracking-[0.1em]', college.tone)}>{college.short}</span>
              <span className="text-sm font-semibold text-ink-900">{college.full}</span>
            </p>
          )}
        </div>
        {isLink(founder.linkedin) && (
          <a
            href={founder.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${founder.name} on LinkedIn`}
            className="inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-line text-sm font-semibold text-ink-800 transition hover:border-[#0a66c2] hover:bg-[#0a66c2] hover:text-white lg:h-10 lg:w-auto lg:px-3.5"
          >
            <LinkedInIcon size={16} />
            <span className="hidden lg:inline">LinkedIn</span>
            <ArrowUpRight size={14} aria-hidden="true" className="hidden lg:block" />
          </a>
        )}
      </article>
    </Reveal>
  )
}

export default function Founders() {
  return (
    <section className="page-container py-12 sm:py-14">
      <Reveal className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">The people behind Rankora</h2>
        <p className="text-ink-600">Questions about a note? Message us.</p>
      </Reveal>
      <div className="grid gap-4 md:grid-cols-2">
        {SITE.founders.map((founder, index) => (
          <Founder key={founder.id} founder={founder} index={index} />
        ))}
      </div>
    </section>
  )
}
