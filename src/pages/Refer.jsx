import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Gift, Share2, ShoppingBag, UserPlus, Users, Wallet } from 'lucide-react'
import { WhatsAppIcon } from '../components/common/BrandIcons'
import GiftMilestones from '../components/refer/GiftMilestones'
import { SparkleArt } from '../components/common/Clipart'
import Accordion from '../components/ui/Accordion'
import Button from '../components/ui/Button'
import Reveal from '../components/ui/Reveal'
import { Tabs } from '../components/ui/Tabs'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { useFeatures } from '../hooks/useFeatures'
import { useToast } from '../hooks/useToast'
import { cn } from '../utils/cn'
import { formatLongDate, formatPrice } from '../utils/format'
import NotFound from './NotFound'

// formatPrice prints "Free" for 0, which reads wrong for a credit balance.
const money = (value) => (value === 0 ? '₹0' : formatPrice(value))

const ENTRY_LABEL = {
  referral_reward: 'Reward: a friend you invited made a purchase',
  reward_reversal: 'Reward taken back: the friend’s order was refunded',
  spend: 'Used at checkout',
  spend_refund: 'Returned: an order was refunded',
}

const RULED =
  'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, color-mix(in srgb, var(--color-ink-900) 5%, transparent) 31px, color-mix(in srgb, var(--color-ink-900) 5%, transparent) 32px)'
const FADE = 'linear-gradient(to bottom, black, transparent 85%)'

// A number that counts up to its target, so changing the slider feels alive. Jumps straight there for people who
// have asked their device for less motion.
function useCountUp(target) {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = from.current
    if (start === target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      from.current = target
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }
    let frame
    const began = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - began) / 450)
      const eased = 1 - (1 - t) ** 3
      from.current = Math.round(start + (target - start) * eased)
      setValue(from.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return value
}

// The "gift ticket": what the friend gets on top, what you get below, split by a perforated line.
function Ticket({ friend, credit }) {
  return (
    <div className="animate-float-slow">
      <div className="relative mx-auto w-full max-w-sm -rotate-2 rounded-3xl border border-line bg-surface shadow-lift transition duration-500 hover:rotate-0 hover:scale-[1.02]">
        <div className="p-6 pb-7">
          <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.18em] text-ink-500">Your friend gets</p>
          <p className="mt-2 font-display text-5xl font-semibold leading-none text-ember-600 tabular">{formatPrice(friend)} off</p>
          <p className="mt-2 text-sm text-ink-600">on their first order, applied automatically</p>
        </div>
        <div aria-hidden="true" className="relative">
          <div className="border-t-2 border-dashed border-line" />
          <span className="absolute -left-3 -top-3 size-6 rounded-full border border-line bg-ivory-50" />
          <span className="absolute -right-3 -top-3 size-6 rounded-full border border-line bg-ivory-50" />
        </div>
        <div className="p-6 pt-7">
          <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.18em] text-ink-500">You get</p>
          <p className="mt-2 font-display text-5xl font-semibold leading-none text-sage-700 tabular">{formatPrice(credit)}</p>
          <p className="mt-2 text-sm text-ink-600">store credit for every friend who buys</p>
        </div>
        <span className="absolute -right-3 -top-4 grid size-11 animate-wiggle place-items-center rounded-full bg-ember-500 text-white shadow-press">
          <Gift size={20} aria-hidden="true" />
        </span>
      </div>
    </div>
  )
}

// The student's own link with copy, WhatsApp and (on phones) the native share sheet.
function LinkCard({ link, code, friend }) {
  const toast = useToast()
  const [copied, setCopied] = useState('')
  const message = `I use JEEdge for JEE notes. Use my link to get ${formatPrice(friend)} off your first order: ${link}`

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      toast({ title: what === 'link' ? 'Link copied' : 'Code copied', description: 'Paste it in a chat or a story.' })
      setTimeout(() => setCopied(''), 2000)
    } catch {
      toast({ title: 'Could not copy automatically', description: 'Select it and copy by hand.', tone: 'info' })
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: 'JEEdge', text: message, url: link })
    } catch {
      /* closed the share sheet */
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5">
      <label htmlFor="ref-link" className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-ink-500">
        Your personal link
      </label>
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
        <input
          id="ref-link"
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-ivory-50 px-3.5 font-mono text-sm text-ink-800"
        />
        <Button variant="accent" icon={copied === 'link' ? Check : Copy} onClick={() => copy(link, 'link')} className="sm:w-36">
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </Button>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <Button href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" variant="outline" size="sm" icon={WhatsAppIcon}>
          WhatsApp
        </Button>
        {typeof navigator !== 'undefined' && navigator.share && (
          <Button variant="outline" size="sm" icon={Share2} onClick={share}>
            More apps
          </Button>
        )}
        <button
          type="button"
          onClick={() => copy(code, 'code')}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-dashed border-ember-500/50 px-3 py-1.5 text-sm text-ink-700 transition hover:border-ember-500 hover:bg-ember-50"
          aria-label={`Copy your code ${code}`}
        >
          Code <strong className="font-mono text-ink-900">{code}</strong>
          {copied === 'code' ? <Check size={14} aria-hidden="true" className="text-sage-700" /> : <Copy size={14} aria-hidden="true" className="text-ink-400" />}
        </button>
      </div>
    </div>
  )
}

// "What could I earn?": drag the slider or pick a number of friends.
function Calculator({ friend, credit, cap }) {
  const max = Math.max(1, cap)
  const [friends, setFriends] = useState(Math.min(3, max))
  const total = useCountUp(friends * credit)
  const presets = [...new Set([1, 3, 5, max])].filter((n) => n <= max)

  return (
    <div className="grid items-center gap-8 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <h2 className="text-2xl font-semibold sm:text-3xl">See what you could earn</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">
          How many friends do you think will buy? Move the slider and watch your store credit grow.
        </p>

        <div className="mt-6 flex items-end justify-between">
          <label htmlFor="friends" className="text-sm font-semibold text-ink-900">
            Friends who buy
          </label>
          <output htmlFor="friends" className="font-display text-3xl font-semibold tabular text-ink-900">
            {friends}
          </output>
        </div>
        <input
          id="friends"
          type="range"
          min="1"
          max={max}
          step="1"
          value={friends}
          onChange={(event) => setFriends(Number(event.target.value))}
          className="mt-3 h-2 w-full cursor-pointer accent-ember-500"
          aria-valuetext={`${friends} ${friends === 1 ? 'friend' : 'friends'}`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setFriends(n)}
              aria-pressed={friends === n}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
                friends === n ? 'border-ember-500 bg-ember-500 text-white' : 'border-line text-ink-700 hover:border-ember-500 hover:text-ember-600',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-ember-50 p-6 text-center ring-1 ring-ember-500/20">
        <SparkleArt className="absolute right-4 top-4 size-6 animate-wiggle text-ember-400" />
        <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.18em] text-ember-700">Your store credit</p>
        <p className="mt-2 font-display text-6xl font-semibold leading-none text-ember-600 tabular" aria-live="polite">
          {money(total)}
        </p>
        <p className="mt-3 text-sm text-ink-700">
          and your {friends === 1 ? 'friend saves' : 'friends save'} {formatPrice(friends * friend)} together
        </p>
        <p className="mt-4 border-t border-ember-500/20 pt-3 text-xs text-ink-600">Up to {max} rewards a month.</p>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
      <span className="grid size-9 place-items-center rounded-xl bg-ember-50 text-ember-600">
        <Icon size={17} aria-hidden="true" />
      </span>
      <p className="mt-3 font-display text-2xl font-semibold tabular">{value}</p>
      <p className="text-sm font-medium text-ink-800">{label}</p>
      {hint && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{hint}</p>}
    </div>
  )
}

function Ledger({ entries }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-600">
        Nothing yet. When a friend you invited pays and keeps their order, your reward shows up here.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-ivory-100 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Date</th>
            <th scope="col" className="px-4 py-3 font-medium">What happened</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft bg-surface">
          {entries.map((entry) => (
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
  )
}

// Refer and earn: a public landing page that turns into the student's own dashboard once they sign in.
export default function Refer() {
  const features = useFeatures()
  const { user, loading: authLoading, openAuth } = useAuth()
  const [tab, setTab] = useState('history')
  const enabled = features.referrals && Boolean(user)
  const { data, error, loading, reload } = useApi(enabled ? '/growth/referrals/me' : null)

  if (features.loaded && !features.referrals) return <NotFound />

  const friend = data?.rules.friendDiscount ?? features.friendDiscount ?? 0
  const credit = data?.rules.referrerCredit ?? features.referrerCredit ?? 0
  const windowDays = data?.rules.refundWindowDays ?? features.refundWindowDays ?? 7
  const cap = data?.rules.monthlyCap ?? features.monthlyCap ?? 10
  const bigPack = data?.gifts?.bigPackPoints ?? features.bigPackPoints ?? 3
  const link = data ? `${window.location.origin}/?ref=${data.code}` : ''
  const ready = features.loaded && !authLoading

  const steps = [
    { icon: Share2, title: 'Share your link', text: `Send it on WhatsApp or post it in a story. Your friend gets ${formatPrice(friend)} off their first order.` },
    { icon: ShoppingBag, title: 'Your friend buys', text: 'They sign up through your link and pay. The discount is applied for them automatically.' },
    { icon: Wallet, title: 'You earn credit', text: `${windowDays} days later, with no refund, ${formatPrice(credit)} lands in your store credit.` },
  ]

  const faqs = [
    { question: 'When do I get my credit?', answer: `${windowDays} days after your friend’s payment is confirmed, as long as they have not asked for a refund. It then shows up in your credit history here.` },
    { question: 'Where can I spend it?', answer: 'At checkout, on any note. Switch on “Use my store credit” and it is taken off your total.' },
    { question: 'What if my friend uses a teacher’s code?', answer: 'Only one discount applies to an order, and a teacher’s code always comes first. In that case your friend gets the teacher discount and no referral reward is made.' },
    { question: 'How do the gift cards work?', answer: `When friends who bought through your link reach the milestones, you unlock a gift card worth a share of what they paid. A friend counts once their first order has passed the ${windowDays}-day refund window. The all-subjects pack counts as ${bigPack} friends. We check each gift card and send it to you ourselves.` },
    { question: 'Are there any limits?', answer: `You earn one reward per friend, up to ${cap} a month. You cannot use your own link, and a reward is taken back if the friend’s order is refunded.` },
  ]

  return (
    <>
      <section className="relative overflow-hidden border-b border-line-soft">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: RULED, maskImage: FADE, WebkitMaskImage: FADE }} />
        <SparkleArt className="pointer-events-none absolute left-[46%] top-16 hidden size-6 animate-wiggle text-ember-400 lg:block" />
        <div className="page-container relative grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <p className="animate-rise mb-4 inline-flex items-center gap-2 rounded-full border border-ember-500/30 bg-surface px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ember-700 shadow-soft">
              <Gift size={14} aria-hidden="true" />
              Refer and earn
            </p>
            <h1 className="animate-rise stagger text-5xl font-semibold leading-[1.05] lg:text-6xl" style={{ '--d': '70ms' }}>
              Give {formatPrice(friend)}.
              <br />
              Get <span className="marker">{formatPrice(credit)}</span>.
            </h1>
            <p className="animate-rise stagger mt-4 max-w-lg text-base leading-relaxed text-ink-600 sm:text-lg" style={{ '--d': '150ms' }}>
              Know someone preparing for JEE? Share your link. They save on their first order, and you earn store credit for your next notes.
            </p>

            <div className="animate-rise stagger mt-6 max-w-xl" style={{ '--d': '230ms' }}>
              {!ready || (enabled && loading) ? (
                <div role="status" aria-busy="true" className="h-36 animate-pulse rounded-2xl bg-ivory-200" />
              ) : !user ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="accent" size="lg" icon={UserPlus} onClick={() => openAuth('register')}>
                    Get my link
                  </Button>
                  <button type="button" onClick={() => openAuth('login')} className="text-sm font-semibold text-ink-700 underline-offset-4 hover:text-ember-600 hover:underline">
                    I already have an account
                  </button>
                </div>
              ) : error ? (
                <div role="alert" className="rounded-2xl border border-line bg-surface p-4 text-sm">
                  <p className="font-semibold">Could not load your link</p>
                  <p className="mt-1 text-ink-600">{error.message}</p>
                  <Button variant="outline" size="sm" onClick={reload} className="mt-3">
                    Try again
                  </Button>
                </div>
              ) : data ? (
                <LinkCard link={link} code={data.code} friend={friend} />
              ) : null}
            </div>
          </div>

          <Ticket friend={friend} credit={credit} />
        </div>
      </section>

      <div className="page-container space-y-12 py-10 sm:space-y-16 sm:py-14">
        <ol className="grid gap-4 md:grid-cols-3" aria-label="How it works">
          {steps.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 90} className="group relative rounded-2xl border border-line bg-surface p-5 transition duration-300 hover:-translate-y-1 hover:border-ember-500/50 hover:shadow-soft">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-ember-50 text-ember-600 transition group-hover:scale-110 group-hover:bg-ember-500 group-hover:text-white">
                  <step.icon size={20} aria-hidden="true" />
                </span>
                <span className="font-mono text-sm font-medium text-ink-300">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.text}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal>
          <Calculator friend={friend} credit={credit} cap={cap} />
        </Reveal>

        {(data?.gifts || features.giftTiers?.length > 0) && (
          <Reveal>
            <GiftMilestones gifts={data?.gifts} previewTiers={features.giftTiers ?? []} bigPackPoints={bigPack} signedIn={Boolean(data)} onJoin={() => openAuth('register')} />
          </Reveal>
        )}

        {data && (
          <section aria-labelledby="your-referrals">
            <h2 id="your-referrals" className="text-2xl font-semibold">Your referrals</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat icon={Users} label="Friends invited" value={data.invited} hint="Signed up through your link" />
              <Stat icon={ShoppingBag} label="Friends who paid" value={data.paid} hint="First order confirmed" />
              <Stat icon={Wallet} label="Credit to use" value={money(data.balance)} hint="Taken off at checkout" />
              <Stat icon={Gift} label="Credit on the way" value={money(data.pendingCredit)} hint={`Released after ${windowDays} days`} />
            </div>
            <div className="mt-6">
              <Tabs
                idPrefix="refer"
                label="Your credit"
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: 'history', label: 'Credit history', count: data.ledger.length },
                  { id: 'faq', label: 'Good to know' },
                ]}
              />
              <div role="tabpanel" id={`refer-panel-${tab}`} aria-labelledby={`refer-tab-${tab}`} className="mt-4">
                {tab === 'history' ? <Ledger entries={data.ledger} /> : <Accordion items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} defaultOpen={-1} />}
              </div>
            </div>
          </section>
        )}

        {!data && (
          <section aria-labelledby="good-to-know" className="mx-auto max-w-3xl">
            <h2 id="good-to-know" className="text-2xl font-semibold">Good to know</h2>
            <Accordion className="mt-4" items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} defaultOpen={-1} />
          </section>
        )}
      </div>
    </>
  )
}
