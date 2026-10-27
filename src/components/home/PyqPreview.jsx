import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { DifficultyBadge, SubjectBadge } from '../ui/Badge'
import { getQuestionById } from '../../data/questions'
import { explorePath, practicePath } from '../../utils/routes'
import { cn } from '../../utils/cn'

const PREVIEW_IDS = ['p07', 'c08', 'm08']
const BULLETS = [
  'Questions grouped by chapter and tagged easy, medium or hard',
  'Reviewed solutions that show the first step and the trap',
  'Mark doubtful questions and come back to them',
]

export default function PyqPreview() {
  const questions = PREVIEW_IDS.map((id) => getQuestionById(id))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const question = questions[index]
  const answered = selected !== null

  const next = () => {
    setIndex((current) => (current + 1) % questions.length)
    setSelected(null)
  }

  return (
    <section className="border-y border-line-soft bg-ivory-100/60">
      <div className="page-container grid items-start gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.15fr]">
        <Reveal>
          <SectionHeading
            as="h2"
            eyebrow="PYQ practice"
            title="Practise the chapter you are weakest in"
            description="Chapter-wise questions in JEE Main pattern, with solutions you can actually learn from. Try one below."
          />
          <ul className="mt-8 space-y-3">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex gap-3 leading-relaxed text-ink-700">
                <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-sage-600" />
                {bullet}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to={explorePath({ type: 'pyq' })} variant="primary" iconRight={ArrowRight}>
              Browse PYQ sets
            </Button>
            <Button to={practicePath({ subject: question.subject, chapter: question.chapter })} variant="outline">
              Practise {question.chapter}
            </Button>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <Card className="p-6 sm:p-8">
            <div key={question.id} className="animate-fade">
              <div className="flex flex-wrap items-center gap-2">
                <SubjectBadge subject={question.subject} />
                <DifficultyBadge level={question.difficulty} />
                <span className="ml-auto font-mono text-xs text-ink-400">
                  {index + 1} / {questions.length}
                </span>
              </div>
              <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-400">
                {question.chapter}
              </p>
              <p className="mt-3 text-lg font-medium leading-relaxed text-ink-900">{question.text}</p>

              <div className="mt-5 space-y-2.5" role="group" aria-label="Answer options">
                {question.options.map((option, optionIndex) => {
                  const state = !answered
                    ? 'idle'
                    : optionIndex === question.answer
                      ? 'correct'
                      : optionIndex === selected
                        ? 'wrong'
                        : 'dim'
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={answered}
                      onClick={() => setSelected(optionIndex)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition duration-200 disabled:cursor-default',
                        state === 'idle' &&
                          'border-line bg-[#fffdf8] hover:-translate-y-px hover:border-ember-500 hover:shadow-soft',
                        state === 'correct' && 'border-sage-500 bg-sage-50 font-medium text-sage-700',
                        state === 'wrong' && 'border-danger-500 bg-danger-100 font-medium text-danger-500',
                        state === 'dim' && 'border-line-soft text-ink-400',
                      )}
                    >
                      <span className="font-mono text-xs">{'ABCD'[optionIndex]}</span>
                      <span className="flex-1">{option}</span>
                      {state === 'correct' && <Check size={16} aria-hidden="true" />}
                      {state === 'wrong' && <X size={16} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>

              <div aria-live="polite" className="mt-5">
                {answered && (
                  <div className="animate-rise rounded-xl bg-ivory-100 p-4">
                    <p className="text-sm font-semibold text-ink-900">
                      {selected === question.answer
                        ? 'Correct.'
                        : `Not quite. The answer is ${'ABCD'[question.answer]}.`}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{question.solution}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-5">
              <p className="text-sm text-ink-500">
                {answered ? 'Ready for another?' : 'Choose an option to see the solution.'}
              </p>
              <Button variant="soft" size="sm" iconRight={ArrowRight} onClick={next}>
                Next sample
              </Button>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}