import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { SUBJECTS } from '../../data/subjects'
import { RESOURCES } from '../../data/resources'
import { SUBJECT_THEME } from '../../utils/subjectTheme'
import { explorePath } from '../../utils/routes'
import { cn } from '../../utils/cn'

export default function SubjectCards() {
  return (
    <section className="page-container py-20 sm:py-24">
      <Reveal>
        <SectionHeading
          eyebrow="Subjects"
          title="Three subjects, one consistent way of revising"
          description="Every subject follows the same loop: a short note, a formula sheet, chapter-wise practice and a timed check."
        />
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {SUBJECTS.map((subject, index) => {
          const theme = SUBJECT_THEME[subject.id]
          const Icon = theme.icon
          const count = RESOURCES.filter((resource) => resource.subject === subject.id).length
          return (
            <Reveal key={subject.id} delay={index * 90} className="h-full">
              <Link
                to={explorePath({ subject: subject.id })}
                className="group flex h-full flex-col rounded-2xl border border-line bg-[#fffdf8] p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-ink-900/30 hover:shadow-lift sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className={cn('grid size-12 place-items-center rounded-xl', theme.soft, theme.text)}>
                    <Icon size={24} aria-hidden="true" />
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
                  {subject.chapters.length} chapters · {count} resources
                </p>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}