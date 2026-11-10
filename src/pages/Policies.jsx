import { Link } from 'react-router-dom'
import PageHeader from '../components/common/PageHeader'
import { ROUTES } from '../utils/routes'

// Plain-language policies. Each statement describes what the platform actually does.
const SECTIONS = [
  {
    id: 'access',
    title: 'How access works',
    body: [
      'Notes are digital. As soon as your payment is verified by our server, the note appears in your library and you can start reading.',
      'You read inside the JEEdge reader in your browser. There is no download or print button, and the file is not available at a public link. Your last-read page is saved to your account so you can continue on any device.',
      'A reading session closes after a period of inactivity, when you sign out, or if your account is opened in more places than allowed at once. You can reopen the note straight away.',
    ],
  },
  {
    id: 'watermark',
    title: 'Your name on every page',
    body: [
      'Each page you read carries a watermark with your name, a masked version of your email, a student ID and your order reference. It is there to discourage sharing and to make any leaked copy traceable to the account it came from.',
      'No protection can stop someone photographing a screen, so we rely on this together with account limits.',
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    body: [
      'Payments are processed by Razorpay. JEEdge never sees or stores your card or UPI details.',
      'The price you pay is calculated on our server, including any coupon you applied. Access is granted only after the payment is confirmed. If a payment fails or is left incomplete, no access is granted; the order status in your account shows exactly where it stands.',
      'If money was deducted but the note did not appear, contact support from your account with your order reference and we will look into it.',
    ],
  },
  {
    id: 'refunds',
    title: 'Refunds',
    body: [
      'If something is wrong with a purchase, write to us from Account → Support with the order reference. Refund requests are reviewed individually.',
      'An approved refund is returned to the original payment method through Razorpay, and access to the refunded note ends when the refund is processed.',
    ],
  },
  {
    id: 'use',
    title: 'Using your notes',
    body: [
      'Notes are licensed to you for personal study. Sharing your login, or copying and redistributing the material, is not allowed. Accounts that are shared or show unusual reading activity may be limited or suspended.',
    ],
  },
  {
    id: 'data',
    title: 'What we keep',
    body: [
      'We store your name, email, orders and reading progress. To protect the notes we also keep a log of when documents are opened, with the IP address and browser used.',
    ],
  },
]

export default function Policies() {
  return (
    <>
      <PageHeader eyebrow="Policies" title="Clear terms for a digital product" description="How buying, reading, refunds and account use work on JEEdge." />
      <section className="page-container py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label="On this page" className="hidden lg:block">
            <ul className="sticky top-28 space-y-3 text-sm">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-ink-600 underline-offset-4 hover:text-ember-600 hover:underline">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="max-w-2xl space-y-12">
            {SECTIONS.map((section) => (
              <article key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-2xl font-semibold">{section.title}</h2>
                <div className="mt-4 space-y-4 leading-relaxed text-ink-700">
                  {section.body.map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                </div>
              </article>
            ))}
            <p className="border-t border-line pt-8 text-ink-600">
              Still unsure? Open{' '}
              <Link to={ROUTES.account} className="font-semibold text-ember-600 underline-offset-4 hover:underline">
                Account → Support
              </Link>{' '}
              and ask before you buy.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
