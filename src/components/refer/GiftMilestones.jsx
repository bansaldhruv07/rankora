import { useEffect, useRef, useState } from 'react'
import { Check, Gift, Lock, PartyPopper, Send, Sparkles } from 'lucide-react'
import { cn } from '../../utils/cn'
import { formatPrice } from '../../utils/format'

// Gift cards for students whose friends keep buying: a progress track with a stop at every tier, and a card per tier.
// `gifts` is the signed-in student's progress from /growth/referrals/me; signed out, `tiers` (from /growth/features)
// is shown as a preview with nothing earned yet.

const STATE = {
  locked: { label: 'Locked', icon: Lock, tone: 'border-line bg-surface text-ink-600', badge: 'bg-ivory-200 text-ink-600' },
  unlocked: { label: 'Unlocked', icon: PartyPopper, tone: 'border-ember-500 bg-ember-50 text-ink-900 shadow-lift', badge: 'bg-ember-500 text-white' },
  approved: { label: 'Approved', icon: Send, tone: 'border-sage-400 bg-sage-50 text-ink-900', badge: 'bg-sage-500 text-white' },
  issued: { label: 'Sent', icon: Check, tone: 'border-sage-400 bg-sage-50 text-ink-900', badge: 'bg-sage-600 text-white' },
}

const NOTE = {
  locked: (tier) => `Bring ${tier.friends} friends who buy.`,
  unlocked: () => 'You did it. We will check it and send your gift card soon.',
  approved: () => 'Approved. Your gift card is on its way to you.',
  issued: () => 'Sent to you. Check your messages and email.',
}

// Fills from the left when the section first scrolls into view, so the progress feels earned rather than printed.
function useInView() {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      const id = requestAnimationFrame(() => setSeen(true))
      return () => cancelAnimationFrame(id)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true)
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, seen]
}

function Track({ points, tiers, seen }) {
  const top = tiers[tiers.length - 1].friends
  const fill = seen ? Math.min(100, (points / top) * 100) : 0
  return (
    <div className="px-4 pb-11 pt-2" role="img" aria-label={`${points} of ${top} friends counted`}>
      <div className="relative h-3 rounded-full bg-ivory-200">
        <div className="h-full rounded-full bg-gradient-to-r from-ember-400 to-ember-500 transition-[width] duration-1000 ease-out" style={{ width: `${fill}%` }} />
        {tiers.map((tier) => {
          const reached = points >= tier.friends
          return (
            <span key={tier.friends} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(tier.friends / top) * 100}%` }}>
              <span className={cn('grid size-8 place-items-center rounded-full border-2 text-xs font-bold transition-colors duration-500', reached ? 'border-ember-500 bg-ember-500 text-white' : 'border-line bg-surface text-ink-500')}>
                {reached ? <Check size={14} aria-hidden="true" /> : <Gift size={13} aria-hidden="true" />}
              </span>
              <span className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap font-mono text-[0.7rem] font-semibold text-ink-600">{tier.friends}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function GiftMilestones({ gifts, previewTiers, bigPackPoints, signedIn, onJoin }) {
  const [ref, seen] = useInView()
  const tiers = gifts?.tiers ?? previewTiers.map((tier) => ({ friends: tier.friends, percent: tier.percent, state: 'locked', value: 0 }))
  if (tiers.length === 0) return null
  const points = gifts?.points ?? 0
  const next = gifts?.next
  const percent = tiers[0].percent

  return (
    <section ref={ref} aria-labelledby="gift-cards" className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
      <div className="relative border-b border-line-soft bg-ember-50 px-6 py-6 sm:px-8">
        <Sparkles aria-hidden="true" className="absolute right-6 top-6 size-6 animate-wiggle text-ember-400" />
        <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.18em] text-ember-700">Bonus rewards</p>
        <h2 id="gift-cards" className="mt-1 text-2xl font-semibold sm:text-3xl">
          Bring {tiers[0].friends} friends, win a gift card
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700 sm:text-base">
          Think movie tickets or a shopping voucher. Every friend who buys counts, and each step up is worth {percent}% of what your friends paid. The all-subjects pack counts as{' '}
          <span className="marker font-semibold">{bigPackPoints} friends</span> in one go.
        </p>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <p className="text-sm font-semibold text-ink-900">
              {signedIn ? (
                <>
                  <span className="font-display text-3xl tabular text-ember-600">{points}</span> {points === 1 ? 'friend' : 'friends'} counted
                </>
              ) : (
                'Your progress shows up here'
              )}
            </p>
            {signedIn && next && (
              <p className="text-sm text-ink-600">
                <strong className="text-ink-900">{next.left}</strong> more for your next gift card
                {next.valueSoFar > 0 && <> · worth {formatPrice(next.valueSoFar)} so far</>}
              </p>
            )}
            {signedIn && !next && points > 0 && <p className="text-sm font-semibold text-sage-700">Every gift card unlocked. Wow.</p>}
          </div>
          <Track points={points} tiers={tiers} seen={seen} />
          {signedIn && gifts?.waitingPoints > 0 && (
            <p className="text-xs text-ink-500">
              {gifts.waitingPoints} more {gifts.waitingPoints === 1 ? 'friend is' : 'friends are'} waiting out the refund window and will be added automatically.
            </p>
          )}
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {tiers.map((tier, index) => {
            const style = STATE[tier.state] ?? STATE.locked
            const Icon = style.icon
            return (
              <li
                key={tier.friends}
                className={cn('relative rounded-2xl border p-5 transition duration-300 hover:-translate-y-1', style.tone)}
                style={{ transitionDelay: seen ? `${index * 60}ms` : '0ms' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-4xl font-semibold leading-none tabular">{tier.friends}</span>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold', style.badge)}>
                    <Icon size={12} aria-hidden="true" />
                    {style.label}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-ink-800">friends who buy</p>
                <p className="mt-3 text-sm text-ink-700">
                  Gift card worth <strong className="text-ink-900">{tier.percent}%</strong> of what they paid
                  {tier.state !== 'locked' && tier.value > 0 && (
                    <>
                      {' '}
                      · <strong className="text-ember-700">{formatPrice(tier.value)}</strong>
                    </>
                  )}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-600">{NOTE[tier.state](tier)}</p>
              </li>
            )
          })}
        </ul>

        {!signedIn && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ivory-100 px-5 py-4">
            <p className="text-sm text-ink-700">Create your free account to get your link and start counting.</p>
            <button type="button" onClick={onJoin} className="rounded-full bg-ember-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-ember-600">
              Get my link
            </button>
          </div>
        )}
        <p className="text-xs leading-relaxed text-ink-500">
          A friend counts once their first order has passed the refund window and has not been refunded. Gift cards are checked and sent by us, so allow a few days.
        </p>
      </div>
    </section>
  )
}
