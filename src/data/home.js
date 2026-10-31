import { BookOpen, Eye, PenLine, Smartphone, Sigma, Zap } from 'lucide-react'

export const BENEFITS = [
  {
    id: 'authors',
    icon: PenLine,
    title: 'Written by IIT Delhi and DTU students',
    body: 'People who have been through JEE write down what actually worked: the definitions that matter, the steps that save time and the mistakes to avoid.',
  },
  {
    id: 'concise',
    icon: BookOpen,
    title: 'Short enough to finish',
    body: 'Each chapter is cut down to what you need for revision, so a full pass fits a sitting instead of a week.',
  },
  {
    id: 'formulas',
    icon: Sigma,
    title: 'Formulas where you look for them',
    body: 'Key results are boxed on the page and traps are called out, so you can scan a chapter in minutes before a test.',
  },
  {
    id: 'sample',
    icon: Eye,
    title: 'See it before you pay',
    body: 'Notes with a free sample open in the same reader you will use after buying. Judge the handwriting, depth and layout yourself.',
  },
  {
    id: 'anywhere',
    icon: Smartphone,
    title: 'Read on any screen',
    body: 'Phone, tablet or laptop. The reader remembers your page, so you pick up exactly where you stopped.',
  },
  {
    id: 'instant',
    icon: Zap,
    title: 'Instant access',
    body: 'The moment your payment is verified the note is in your library. No waiting for a link or a file.',
  },
]

export const HOW_IT_WORKS = [
  {
    id: 'pick',
    title: 'Pick your chapter',
    body: 'Browse by subject, class and chapter, or search for the topic you are stuck on.',
  },
  {
    id: 'sample',
    title: 'Read the free sample',
    body: 'Open the sample pages and check the notes suit the way you learn.',
  },
  {
    id: 'buy',
    title: 'Buy a note, a bundle or Premium',
    body: 'Pay once through Razorpay. Your access begins as soon as the payment is verified.',
  },
  {
    id: 'read',
    title: 'Revise anywhere',
    body: 'Open it from your library on any device. It resumes on the page you left.',
  },
]

// These are SAMPLE reviews so the layout can be seen. Each is flagged `sample: true`, which shows a
// "Sample review" tag on the site. Replace them with real student reviews (with their permission) and
// set `sample: false` (or delete the flag) to remove the tag.
export const TESTIMONIALS = [
  {
    id: 't1',
    name: 'Aarav S.',
    detail: 'Class 12, preparing for JEE',
    quote: 'The formula boxes saved me. I could go through a whole chapter the night before a test instead of rereading my own messy notes.',
    sample: true,
  },
  {
    id: 't2',
    name: 'Meera K.',
    detail: 'Class 11',
    quote: 'It is short and to the point. The pages feel like notes from a senior who has been through it, which is exactly what I wanted.',
    sample: true,
  },
  {
    id: 't3',
    name: 'Rohan P.',
    detail: 'Dropper',
    quote: 'Being able to open it on my phone and land on the page I left is the small thing that made me actually revise on the bus.',
    sample: true,
  },
]
