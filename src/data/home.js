import { BookOpen, CalendarCheck, FileText, ListChecks, Timer, TrendingUp } from 'lucide-react'

export const BENEFITS = [
  {
    id: 'notes',
    icon: BookOpen,
    title: 'Notes built for one sitting',
    body: 'Each chapter is cut down to definitions, formulas, traps and a self-check, so a revision pass fits a short sitting.',
  },
  {
    id: 'pyq',
    icon: FileText,
    title: 'Chapter-wise PYQ practice',
    body: 'Questions in JEE Main pattern, grouped by chapter and tagged by difficulty, so you can drill a weak spot instead of a random paper.',
  },
  {
    id: 'solutions',
    icon: ListChecks,
    title: 'Solutions that show the method',
    body: 'Every answer explains the first step, the shortcut and the trap, not only the final option.',
  },
  {
    id: 'mocks',
    icon: Timer,
    title: 'Mocks with exam marking',
    body: '+4 for a correct answer, −1 for a wrong one, a running timer and a question palette that behaves like the real interface.',
  },
  {
    id: 'analytics',
    icon: TrendingUp,
    title: 'Analytics from your own attempts',
    body: 'Accuracy by subject and chapter, a weak-topic ranking and a mistake notebook, all calculated from the tests you take.',
  },
  {
    id: 'plan',
    icon: CalendarCheck,
    title: 'A revision plan you can follow',
    body: 'Recommendations point to the exact note, sheet or question set to revisit next, based on where marks were lost.',
  },
]

export const HOW_IT_WORKS = [
  {
    id: 'diagnose',
    title: 'Take the diagnostic',
    body: 'A short mixed set that shows where you stand across Physics, Chemistry and Mathematics.',
  },
  {
    id: 'revise',
    title: 'Revise with focused notes',
    body: 'Open the notes or formula sheet for the chapters the diagnostic flagged.',
  },
  {
    id: 'practise',
    title: 'Practise by chapter',
    body: 'Drill chapter-wise questions, mark the doubtful ones and read the reviewed solutions.',
  },
  {
    id: 'review',
    title: 'Mock, review, repeat',
    body: 'Sit a timed mock, log your mistakes and let the dashboard decide what to revise next.',
  },
]