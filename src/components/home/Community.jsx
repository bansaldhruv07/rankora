import { ArrowUpRight } from 'lucide-react'
import { CapArt, PencilArt, RocketArt, SparkleArt } from '../common/Clipart'
import { LinkedInIcon } from '../common/BrandIcons'
import CollegeBadge from '../common/CollegeBadge'
import { allChannels } from '../common/channels'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { COLLEGES, SITE, isLink } from '../../data/site'

function Founder({ founder, index }) {
  const college = COLLEGES[founder.college]
  const art = founder.college === 'iitd' ? <PencilArt className="w-24 -rotate-12 text-ink-500" /> : <CapArt className="w-16 text-ink-500" />
  const title = founder.name || `${college.full} student`
  const initials = (founder.name || college.short).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Reveal delay={index * 100} className="h-full">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
        <div aria-hidden="true" className="absolute -right-3 top-4 opacity-60 transition duration-500 group-hover:rotate-6 group-hover:opacity-100">
          {art}
        </div>
        <span className="grid size-16 place-items-center rounded-2xl bg-ember-50 font-display text-2xl font-semibold text-ember-600 ring-1 ring-ember-500/20 transition duration-300 group-hover:scale-105">{initials}</span>
        <h3 className="mt-5 text-xl font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-ink-600">{founder.role}, Rankora</p>
        <CollegeBadge college={founder.college} label className="mt-4" />
        <div className="mt-auto pt-6">
          {isLink(founder.linkedin) ? (
            <a
              href={founder.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${title} on LinkedIn`}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink-800 transition hover:border-[#0a66c2] hover:bg-[#0a66c2] hover:text-white"
            >
              <LinkedInIcon size={17} />
              LinkedIn
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          ) : (
            <span title="LinkedIn: coming soon" className="inline-flex h-10 cursor-default items-center gap-2 rounded-full border border-dashed border-line px-4 text-sm font-semibold text-ink-400">
              <LinkedInIcon size={17} />
              LinkedIn
              <span className="rounded-full bg-ivory-200 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide">Soon</span>
            </span>
          )}
        </div>
      </article>
    </Reveal>
  )
}

export default function Community() {
  const channels = allChannels()

  return (
    <section className="relative page-container py-20 sm:py-24">
      <SparkleArt className="pointer-events-none absolute right-4 top-16 hidden size-8 animate-wiggle text-ember-400 md:block" />
      <Reveal>
        <SectionHeading eyebrow="Community" title="Built by two students. Joined by many." description="Get new-note alerts, ask your doubts, and revise alongside students preparing for the same exam." />
      </Reveal>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative flex flex-col gap-4">
            {channels.map(({ id, href, label, blurb, Icon, bg, glyph }, index) => {
              const tile = (
                <>
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl text-white transition duration-300 group-hover:rotate-6 group-hover:scale-105" style={{ background: bg }}>
                    <Icon size={28} style={{ '--wa-glyph': glyph, '--tg-fold': glyph }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold text-ink-900">{label}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">{blurb}</span>
                  </span>
                  {href ? (
                    <ArrowUpRight size={20} aria-hidden="true" className="shrink-0 text-ink-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ember-600" />
                  ) : (
                    <span className="shrink-0 rounded-full bg-ivory-200 px-3 py-1 text-xs font-semibold text-ink-600">Coming soon</span>
                  )}
                </>
              )
              const shell = 'group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-soft transition duration-300'
              return (
                <Reveal key={id} delay={index * 90}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={`${shell} hover:-translate-y-1 hover:shadow-lift`}>
                      {tile}
                    </a>
                  ) : (
                    <div className={shell}>{tile}</div>
                  )}
                </Reveal>
              )
            })}
            <RocketArt className="pointer-events-none absolute -bottom-20 right-4 hidden w-16 animate-float-slow text-ink-400/60 xl:block" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {SITE.founders.map((founder, index) => (
            <Founder key={founder.id} founder={founder} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
