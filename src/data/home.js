import { BookOpen, Eye, GraduationCap, Layers, ScanText } from 'lucide-react'

// "Why JEEdge": one line each, written for a student with limited time left.
export const BENEFITS = [
  { id: 'short', icon: BookOpen, title: 'A chapter in minutes', body: 'Open it, revise it, move to the next one.' },
  { id: 'subject', icon: Layers, title: 'A whole subject in time', body: 'Finish Physics, Chemistry or Maths with days to spare.' },
  { id: 'content', icon: ScanText, title: 'Nothing important missing', body: 'The padding is cut. The concepts stay.' },
  { id: 'sample', icon: Eye, title: 'Read before you pay', body: 'Check the free sample first. Buy only if it works for you.' },
  { id: 'authors', icon: GraduationCap, title: 'By an IIT Delhi student', body: 'Made and used in her own JEE prep, so it is what actually worked.' },
]

// What students say when they are short on time. Shown as crossed-out chips in the "Why" section.
export const PAIN_POINTS = ['Backlog chapters', 'No time to reread', 'Revision keeps slipping']

export const HOW_IT_WORKS = [
  { id: 'pick', title: 'Pick a chapter', body: 'Filter by subject and class.' },
  { id: 'sample', title: 'Read the sample', body: 'Check the depth first.' },
  { id: 'buy', title: 'Buy what you need', body: 'A note or a full subject pack.' },
  { id: 'read', title: 'Revise anywhere', body: 'Resumes on your last page.' },
]

// REAL student reviews only, with their permission. Each: { id, name, detail, rating (4 or 5), quote }.
// As soon as this list has one entry, the home page shows only these (and drops the sample cards below).
// Never paste invented reviews or ratings here: shown to buyers as real, they are misleading and can break consumer law.
export const REVIEWS = []

// Sample cards shown (with a "sample reviews" line under the heading) only while REVIEWS above is empty.
// They disappear automatically as soon as you add one real review. Delete this list when you have enough.
export const DEMO_REVIEWS = [
  { id: 'd1', name: 'Aarav S.', detail: 'Class 12', rating: 5, quote: 'I finished a whole chapter the night before a test instead of rereading my own messy notes.' },
  { id: 'd2', name: 'Meera K.', detail: 'Class 11', rating: 5, quote: 'Short and to the point. I stopped skipping revision because it no longer felt like a mountain.' },
  { id: 'd3', name: 'Rohan P.', detail: 'Dropper', rating: 4, quote: 'Opening it on my phone and landing on the page I left is why I actually revise on the bus now.' },
  { id: 'd4', name: 'Ananya T.', detail: 'Class 12', rating: 5, quote: 'The free sample sold me. I could see the depth before paying anything.' },
  { id: 'd5', name: 'Kabir M.', detail: 'Dropper', rating: 5, quote: 'I bought only the two chapters I was weak in. Cheaper than a full course and I used every page.' },
  { id: 'd6', name: 'Ishita R.', detail: 'Class 11', rating: 4, quote: 'Clean pages, no clutter. Easy to go through before a chapter test.' },
]
