import { useState } from 'react'
import { Copy, Gift, Share2, Users, Wallet } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import { WhatsAppIcon } from '../components/common/BrandIcons'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useFeatures } from '../hooks/useFeatures'
import { useToast } from '../hooks/useToast'
import { formatLongDate, formatPrice } from '../utils/format'
import NotFound from './NotFound'

const ENTRY_LABEL = {
  referral_reward: 'Reward: a friend you invited made a purchase',
  reward_reversal: 'Reward taken back: the friend’s order was refunded',
  spend: 'Used at checkout',
  spend_refund: 'Returned: an order was refunded',
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <Card className="p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-ember-50 text-ember-600">
        <Icon size={19} aria-hidden="true" />
      </span>
      <p className="mt-4 font-display text-3xl font-semibold tabular">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-ink-800">{label}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-ink-500">{hint}</p>}
    </Card>
  )
}

// Refer and earn: the student's link, share buttons, and how the rewards are doing.
export default function Refer() {
  const features = useFeatures()
  const { user, loading: authLoading, openAuth } = useAuth()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const enabled = features.referrals && Boolean(user)
  const { data, error, loading, reload } = useApi(enabled ? '/growth/referrals/me' : null)

  if (features.loaded && !features.referrals) return <NotFound />

  const link = data ? `${window.location.origin}/?ref=${data.code}` : ''
  const friend = data?.rules.friendDiscount ?? features.friendDiscount ?? 0
  const message = `I use Rankora for JEE notes. Use my link to get ${formatPrice(friend)} off your first order: ${link}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast({ title: 'Link copied', description: 'Paste it in a chat or a story.' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Could not copy automatically', description: 'Select the link and copy it by hand.', tone: 'info' })
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Refer and earn"
        title="Share Rankora, earn store credit"
        description={`Your friend gets ${formatPrice(friend)} off their first order. You get ${formatPrice(data?.rules.referrerCredit ?? features.referrerCredit ?? 0)} of store credit when they have kept it.`}
      />

      <section className="page-container py-10 sm:py-12">
        {authLoading || (enabled && loading) ? (
          <div role="status" aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-ivory-200" />
            ))}
          </div>
        ) : !user ? (
          <EmptyState icon={Gift} title="Sign in to get your link" description="Your referral link and rewards are tied to your account.">
            <Button variant="accent" onClick={() => openAuth('login')}>
              Sign in or create an account
            </Button>
          </EmptyState>
        ) : error ? (
          <EmptyState icon={Gift} title="Could not load your referrals" description={error.message}>
            <Button variant="outline" onClick={reload}>
              Try again
            </Button>
          </EmptyState>
        ) : data ? (
          <div className="space-y-10">
            <Card className="p-5 sm:p-7">
              <h2 className="text-xl font-semibold">Your link</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  readOnly
                  value={link}
                  aria-label="Your referral link"
                  onFocus={(event) => event.target.select()}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-ivory-50 px-4 font-mono text-sm text-ink-800"
                />
                <Button variant="accent" icon={Copy} onClick={copy} className="sm:w-40">
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
                <Button href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" variant="outline" icon={WhatsAppIcon}>
                  Share on WhatsApp
                </Button>
              </div>
              <p className="mt-3 text-sm text-ink-600">
                Your code is <strong className="font-mono text-ink-900">{data.code}</strong>. A friend can also type it at checkout.
              </p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Users} label="Friends invited" value={data.invited} hint="People who signed up through your link." />
              <Stat icon={Share2} label="Friends who paid" value={data.paid} hint="Their first order was confirmed." />
              <Stat icon={Wallet} label="Credit you can use" value={formatPrice(data.balance)} hint="Taken off your next order at checkout." />
              <Stat icon={Gift} label="Credit on the way" value={formatPrice(data.pendingCredit)} hint={`Released ${data.rules.refundWindowDays} days after a friend pays, if there is no refund.`} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">How it works</h2>
              <ol className="mt-4 grid gap-4 md:grid-cols-3">
                {[
                  ['Share your link', `A friend opens it and signs up. They get ${formatPrice(data.rules.friendDiscount)} off their first order automatically.`],
                  ['They buy', 'Once their payment is confirmed, your reward starts its waiting period.'],
                  ['You earn', `After ${data.rules.refundWindowDays} days with no refund, ${formatPrice(data.rules.referrerCredit)} lands in your credit. Up to ${data.rules.monthlyCap} rewards a month.`],
                ].map(([title, text], index) => (
                  <li key={title} className="rounded-2xl border border-line bg-surface p-5">
                    <span className="font-mono text-sm font-medium text-ember-600">{String(index + 1).padStart(2, '0')}</span>
                    <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{text}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm leading-relaxed text-ink-500">
                If a friend uses a teacher&apos;s code instead, or their order is refunded, no reward is given. You cannot use your own link.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Credit history</h2>
              {data.ledger.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-600">
                  Nothing yet. When a friend you invited pays and keeps their order, your reward shows up here.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-ivory-100 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-500">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">Date</th>
                        <th scope="col" className="px-4 py-3 font-medium">What happened</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft bg-surface">
                      {data.ledger.map((entry) => (
                        <tr key={entry.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatLongDate(entry.createdAt)}</td>
                          <td className="px-4 py-3">{ENTRY_LABEL[entry.type] ?? entry.note}</td>
                          <td className={`px-4 py-3 text-right font-semibold tabular ${entry.amount < 0 ? 'text-ember-700' : 'text-sage-700'}`}>
                            {entry.amount < 0 ? '−' : '+'} {formatPrice(Math.abs(entry.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </>
  )
}
