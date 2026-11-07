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
    <section className="page-container py-12 sm:py-14">
      <Reveal>
        <SectionHeading eyebrow="Subjects" title="Pick your weakest subject" />
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
        {SUBJECTS.map((subject, index) => {
          const theme = SUBJECT_THEME[subject.id]
          const Art = ART[subject.id]
          const count = catalog?.[subject.id]?.count ?? 0
          return (
            <Reveal key={subject.id} delay={index * 90} className="h-full">
              <Link
                to={notesPath({ subject: subject.id })}
                className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-ink-900/30 hover:shadow-lift"
              >
                <div className="flex items-center gap-4">
                  <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl text-ink-700 transition duration-500 group-hover:-rotate-6 group-hover:scale-110', theme.soft)}>
                    <Art className="size-9" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold">{subject.name}</h3>
                    <p className={cn('text-sm font-semibold', theme.text)}>{subject.tagline}</p>
                  </div>
                  <ArrowUpRight size={20} aria-hidden="true" className="shrink-0 text-ink-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ember-600" />
                </div>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {subject.chapters.slice(0, 3).map((chapter) => (
                    <li key={chapter} className="rounded-full bg-ivory-200 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                      {chapter}
                    </li>
                  ))}
                </ul>
                {count > 0 && (
                  <p className="mt-auto pt-4 font-mono text-xs uppercase tracking-[0.12em] text-ink-500">
                    {count} {count === 1 ? 'note' : 'notes'} available
                  </p>
                )}
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
