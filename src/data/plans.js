export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    blurb: 'Start with the essentials and see how Rankora works.',
    price: { monthly: 0, yearly: 0 },
    cta: 'Start free',
    highlights: [
      'Free notes and formula sheets',
      'One full mixed mock test',
      'Practice questions with solutions',
      'Analytics for your own attempts',
      'Bookmarks saved in your browser',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    blurb: 'The complete set for steady, chapter-by-chapter preparation.',
    price: { monthly: 399, yearly: 2999 },
    cta: 'Get Premium',
    highlights: [
      'Everything in Free',
      'All chapter-wise PYQ sets with reviewed solutions',
      'All sectional and full mock tests',
      'Weak-topic ranking and revision plan',
      'Mistake notebook with review status',
    ],
  },
]

// `true` / `false` render as a tick / dash; strings render as text.
export const COMPARISON = [
  { feature: 'Short revision notes', free: 'Selected chapters', premium: 'All chapters' },
  { feature: 'Formula sheets', free: 'Selected sheets', premium: 'All sheets' },
  { feature: 'Chapter-wise PYQ practice', free: 'Sample questions', premium: 'All sets' },
  { feature: 'Reviewed solutions', free: true, premium: true },
  { feature: 'Mock tests', free: '1 full mock', premium: 'All full and sectional mocks' },
  { feature: 'Analytics dashboard', free: true, premium: true },
  { feature: 'Weak-topic revision plan', free: false, premium: true },
  { feature: 'Mistake notebook', free: false, premium: true },
]

export const CHECKOUT_NOTE =
  'Premium is a one-time payment for the period you choose, with no auto-renewal. You need an account to purchase, and payments are processed by Razorpay.'