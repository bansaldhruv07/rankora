import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { AtomArt, FlaskArt, PiArt } from '../common/Clipart'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { SUBJECTS } from '../../data/subjects'
import { useApi } from '../../hooks/useApi'
import { SUBJECT_THEME } from '../../utils/subjectTheme'
import { notesPath } from '../../utils/routes'
import { cn } from '../../utils/cn'

const ART = { physics: AtomArt, chemistry: FlaskArt, mathematics: PiArt }

export default function SubjectCards() {
  const { data: catalog } = useApi('/products/catalog')
  return (
    <section className="page-container py-20 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Subjects"
          title="Notes for all three JEE subjects"
          description="Pick a subject, then a class and chapter. Every note is short, formula-first and written by an IIT Delhi student."
        />
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {SUBJECTS.map((subject, index) => {
          const theme = SUBJECT_THEME[subject.id]
          const Art = ART[subject.id]
          const count = catalog?.[subject.id]?.count ?? 0
          return (
            <Reveal key={subject.id} delay={index * 90} className="h-full">
              <Link
                to={notesPath({ subject: subject.id })}
                className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-ink-900/30 hover:shadow-lift sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className={cn('grid size-16 place-items-center rounded-2xl text-ink-700 transition duration-500 group-hover:-rotate-6 group-hover:scale-110', theme.soft)}>
                    <Art className="size-11" />
                  </span>
                  <ArrowUpRight
                    size={20}
                    aria-hidden="true"
                    className="text-ink-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ember-600"
                  />
                </div>
                <span
                  aria-hidden="true"
                  className={cn('mt-6 h-1 w-12 rounded-full transition-all duration-500 group-hover:w-24', theme.bar)}
                />
                <h3 className="mt-5 text-2xl font-semibold">{subject.name}</h3>
                <p className={cn('mt-1 text-sm font-semibold', theme.text)}>{subject.tagline}</p>
                <p className="mt-3 leading-relaxed text-ink-600">{subject.description}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {subject.chapters.slice(0, 4).map((chapter) => (
                    <li
                      key={chapter}
                      className="rounded-full bg-ivory-200 px-3 py-1 text-xs font-medium text-ink-700"
                    >
                      {chapter}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto border-t border-line-soft pt-5 font-mono text-xs uppercase tracking-[0.12em] text-ink-500">
                  {count > 0 ? `${count} ${count === 1 ? 'note' : 'notes'} available` : 'Notes coming soon'}
                </p>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}