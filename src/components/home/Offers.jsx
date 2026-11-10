import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Copy, GraduationCap, Gift, Layers } from 'lucide-react'
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
      className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-ember-500/60 bg-ember-50 px-4 py-2 font-mono text-sm font-bold tracking-widest text-ember-700 transition hover:border-ember-500 hover:bg-ember-100"
    >
      {code}
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      <span className="font-sans text-xs font-semibold tracking-normal">{copied ? 'Copied' : 'Tap to copy'}</span>
    </button>
  )
}

// Real offers only: the bundle saving is read live from the catalogue, so it can never drift from the price.
export default function Offers() {
  const { loaded, referrals, teachers, welcome, friendDiscount, referrerCredit } = useFeatures()
  // With refer and earn switched on it takes the first slot, so the bundle is only fetched when it is shown.
  const { data: bundles } = useApi(loaded && !referrals ? '/products?kind=bundle&limit=20' : null)
  // The complete-subject pack: its price and the list price it is compared against come straight from the catalogue.
  const subjectPack = (bundles ?? [])
    .filter((b) => /^(physics|chemistry|mathematics)-complete$/.test(b.slug))
    .sort((a, b) => a.price - b.price)[0]

  const cards = Number(referrals || Boolean(subjectPack)) + Number(Boolean(welcome)) + Number(Boolean(teachers))
  if (cards === 0) return null
  const columns = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }[cards]

  return (
    <section aria-label="Offers" className="page-container py-8 sm:py-10">
      <div className={`grid gap-4 ${columns}`}>
        {referrals && (
          <Reveal className="h-full">
            <Link
              to="/refer"
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-night p-6 text-white shadow-lift transition duration-300 hover:-translate-y-1"
            >
              <span aria-hidden="true" className="absolute -right-10 -top-10 size-40 rounded-full border border-white/10" />
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-500 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide">
                <Gift size={13} aria-hidden="true" />
                Refer and earn
              </span>
              <p className="mt-4 font-display text-4xl font-semibold leading-none sm:text-5xl">
                <span className="block">Give {formatPrice(friendDiscount)},</span>
                <span className="mt-1 block text-ember-400">get {formatPrice(referrerCredit)}</span>
              </p>
              <p className="mt-2 text-white/75">Share your link. Your friend saves on their first order and you earn store credit for your next notes.</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-white">
                Start earning
                <ArrowRight size={15} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
              </span>
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
            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-soft">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-sage-700">
                Student welcome offer
              </span>
              <p className="mt-4 font-display text-4xl font-semibold leading-none sm:text-5xl">{welcome.percent}% off</p>
              <p className="mt-2 text-ink-600">
                Use this code for an instant {welcome.percent}% discount on any note or pack. It is applied automatically at checkout.
              </p>
              <div className="mt-auto">
                <CopyCode code={welcome.code} />
              </div>
            </div>
          </Reveal>
        )}

        {teachers && (
          <Reveal delay={180} className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-soft">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-50 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wide text-ember-700">
                <GraduationCap size={13} aria-hidden="true" />
                Teacher&apos;s code
              </span>
              <p className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">Got a code from your teacher?</p>
              <p className="mt-2 text-ink-600">Enter it at checkout for your teacher&apos;s discount. It is used in place of the welcome offer.</p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
