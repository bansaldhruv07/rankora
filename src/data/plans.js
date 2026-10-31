export const PLANS = [
  {
    id: 'free',
    name: 'Pay per note',
    blurb: 'Try a free sample, then buy only the chapters you need. No subscription.',
    price: { monthly: 0, yearly: 0 },
    cta: 'Browse the notes',
    highlights: [
      'Free sample pages on notes that offer them',
      'Buy any single note, once, and keep it',
      'Bundles that cost less than buying notes one by one',
      'Read on phone or laptop in the Rankora reader',
      'Your last-read page is saved to your account',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    blurb: 'One payment for every note that is included in Premium, for the period you choose.',
    price: { monthly: 399, yearly: 2999 },
    cta: 'Get Premium',
    highlights: [
      'Everything in Pay per note',
      'Read every note that is included in Premium',
      'Newly added included notes unlock automatically',
      'One payment, no auto-renewal',
      'Notes outside Premium stay available to buy separately',
    ],
  },
]

// `true` / `false` render as a tick / dash; strings render as text.
export const COMPARISON = [
  { feature: 'Free sample pages', free: true, premium: true },
  { feature: 'Notes included in Premium', free: 'Buy each note once', premium: 'All of them, while active' },
  { feature: 'New notes added later', free: 'Buy when released', premium: 'Included ones unlock automatically' },
  { feature: 'Notes not included in Premium', free: 'Buy each note once', premium: 'Buy each note once' },
  { feature: 'Bundles', free: 'Buy a bundle once', premium: 'Buy a bundle once' },
  { feature: 'Reader with saved progress', free: true, premium: true },
  { feature: 'Read on phone and laptop', free: true, premium: true },
  { feature: 'Access after you pay', free: 'Keep it', premium: 'For the period you chose' },
]

export const CHECKOUT_NOTE =
  'Premium is a one-time payment for the period you choose, with no auto-renewal. You need an account to purchase, and payments are processed by Razorpay.'
