import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Copy, GraduationCap, Gift, Layers } from 'lucide-react'
import GiftCardPair from '../refer/GiftCardPair'
import Reveal from '../ui/Reveal'
import { useApi } from '../../hooks/useApi'
import { useFeatures } from '../../hooks/useFeatures'
import { formatPrice } from '../../utils/format'
import { ROUTES } from '../../utils/routes'

function CopyCode({ code }) {
  const [copied, setCopied] = useState(false)
  // If the browser blocks clipboard access the code is still readable on the button.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy code ${code}`}
      className="inline-flex items-center gap-2 rounded-full border border-dashed border-ember-500/60 bg-ember-50 px-4 py-2 font-mono text-sm font-bold tracking-widest text-ember-700 transition hover:border-ember-500 hover:bg-ember-100"
    >
      {code}
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      <span className="font-sans text-xs font-semibold tracking-normal">{copied ? 'Copied' : 'Tap to copy'}</span>
    </button>
  )
}

// Real offers only: the bundle saving is read live from the catalogue, so it can never drift from the price.
export default function Offers() {
  const { loaded, referrals, teachers, welcome, friendDiscount, referrerCredit, giftTiers } = useFeatures()
  // With refer and earn switched on it takes the first slot, so the bundle is only fetched when it is shown.
  const { data: bundles } = useApi(loaded && !referrals ? '/products?kind=bundle&limit=20' : null)
  // The complete-subject pack: its price and the list price it is compared against come straight from the catalogue.
  const subjectPack = (bundles ?? [])
    .filter((b) => /^(physics|chemistry|mathematics)-complete$/.test(b.slug))
    .sort((a, b) => a.price - b.price)[0]

  const cards = Number(referrals || Boolean(subjectPack)) + Number(Boolean(welcome)) + Number(Boolean(teachers))
  if (cards === 0) return null
  const columns = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }[cards]
  // With refer and earn on, it is the wide card on the left and the other offers sit compactly beside it.
  const side = Number(Boolean(welcome)) + Number(Boolean(teachers))

  return (
    <section aria-label="Offers" className="page-container py-8 sm:py-10">
      <div className={`grid gap-4 ${referrals && side > 0 ? 'lg:grid-cols-3' : columns}`}>
        {referrals && (
          <Reveal className={`h-full ${side > 0 ? `lg:col-span-2 ${side === 2 ? 'lg:row-span-2' : ''}` : 'lg:col-span-3'}`}>
            <Link
              to="/refer"
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-night p-6 text-white shadow-lift transition duration-300 hover:-translate-y-1"
            >
              <span aria-hidden="true" className="absolute -right-10 -top-10 size-40 rounded-full border border-white/10" />
              <div className="relative flex h-full flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-8">
                <GiftCardPair className="order-last lg:order-first" />
                <div className="flex flex-col">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-500 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide">
                    <Gift size={13} aria-hidden="true" />
                    Refer and earn
                  </span>
                  <p className="mt-4 font-display text-4xl font-semibold leading-none sm:text-5xl">
                    <span className="block">Give {formatPrice(friendDiscount)},</span>
                    <span className="mt-1 block text-ember-400">get {formatPrice(referrerCredit)}</span>
                  </p>
                  <p className="mt-2 text-white/75">Share your link. Your friend saves on their first order and you earn store credit that never expires.</p>
                  {giftTiers?.length > 0 && (
                    <>
                      <p className="mt-4 text-sm font-semibold text-ember-400">Plus gift cards when friends buy a subject pack*</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {giftTiers.map((tier, index) => (
                          <li key={tier.friends} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
                            {tier.friends}
                            {index === giftTiers.length - 1 ? '+' : ''} friends · {formatPrice(tier.value)}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-white">
                    Start earning
                    <ArrowRight size={15} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        )}

        {!referrals && subjectPack && (
          <Reveal className="h-full">
            <Link
              to={ROUTES.pricing}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-night p-6 text-white shadow-lift transition duration-300 hover:-translate-y-1"
            >
              <span aria-hidden="true" className="absolute -right-10 -top-10 size-40 rounded-full border border-white/10" />
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-500 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide">
                <Layers size={13} aria-hidden="true" />
                Complete subject
              </span>
              <p className="mt-4 flex items-baseline gap-3">
                <span className="font-display text-4xl font-semibold leading-none sm:text-5xl">{formatPrice(subjectPack.price)}</span>
                {subjectPack.savings && <s className="text-lg text-white/50">{formatPrice(subjectPack.savings.referencePrice)}</s>}
              </p>
              <p className="mt-2 text-white/75">Every chapter of a subject in one pack, at a much lower price than buying them one by one.</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-white">
                See subject packs
                <ArrowRight size={15} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        )}

        {welcome && (
          <Reveal delay={90} className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-sage-700">
                Student welcome offer
              </span>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p className="font-display text-3xl font-semibold leading-none">{welcome.percent}% off</p>
                <CopyCode code={welcome.code} />
              </div>
              <p className="mt-2 text-sm text-ink-600">An instant {welcome.percent}% off any note or pack, applied automatically at checkout.</p>
            </div>
          </Reveal>
        )}

        {teachers && (
          <Reveal delay={180} className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-50 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-ember-700">
                <GraduationCap size={13} aria-hidden="true" />
                Teacher&apos;s code
              </span>
              <p className="mt-3 font-display text-2xl font-semibold leading-tight">Got a code from your teacher?</p>
              <p className="mt-2 text-sm text-ink-600">Enter it at checkout for your teacher&apos;s discount. It is used in place of the welcome offer.</p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
