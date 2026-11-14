import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useFeatures } from '../../hooks/useFeatures'
import { ROUTES } from '../../utils/routes'

const KEY = 'jeedge-offer-hidden'

// The site-wide offer strip. It advertises the live welcome coupon, so it only shows while that coupon is on, and it
// says nothing about a deadline or stock that does not exist. Closing it hides it for the rest of the visit.
export default function OfferBanner() {
  const { welcome, loaded } = useFeatures()
  const [hidden, setHidden] = useState(() => {
    try {
      return window.sessionStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  if (!loaded || !welcome || hidden) return null

  const close = () => {
    setHidden(true)
    try {
      window.sessionStorage.setItem(KEY, '1')
    } catch {
      /* the strip simply returns on the next visit */
    }
  }

  return (
    <div role="region" aria-label="Offer" className="relative bg-ember-500 text-white">
      <div className="page-container flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 pr-9 text-center text-sm">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono text-[0.68rem] font-bold uppercase tracking-wide">JEE Main 2027 · Session 1 offer</span>
        <span className="font-semibold">
          Hurry up! Get {welcome.percent}% off notes and subject packs with code <strong className="rounded bg-white/20 px-1.5 font-mono tracking-wider">{welcome.code}</strong>
        </span>
        <Link to={ROUTES.notes} className="font-semibold underline underline-offset-4 hover:no-underline">
          Shop now →
        </Link>
      </div>
      <button type="button" onClick={close} aria-label="Close the offer" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-white/90 transition hover:bg-white/15">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
