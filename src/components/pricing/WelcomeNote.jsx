import { useState } from 'react'
import { Check, Copy, Tag } from 'lucide-react'
import { useFeatures } from '../../hooks/useFeatures'
import { cn } from '../../utils/cn'

// Suggests the welcome code next to a price. It is applied on its own at checkout, so the code is only there to be
// seen (and copied, for anyone who wants to type it). Renders nothing while the offer is off.
export default function WelcomeNote({ className }) {
  const { welcome } = useFeatures()
  const [copied, setCopied] = useState(false)
  if (!welcome) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(welcome.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={cn('rounded-xl bg-sage-50 px-3.5 py-3 text-sm leading-relaxed text-sage-700', className)}>
      <p className="flex items-center gap-2 font-semibold">
        <Tag size={15} aria-hidden="true" className="shrink-0" />
        Student welcome offer: {welcome.percent}% off
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        Use
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy code ${welcome.code}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-sage-600/50 bg-surface px-2.5 py-0.5 font-mono text-xs font-bold tracking-widest text-sage-700 transition hover:border-sage-600"
        >
          {welcome.code}
          {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
        </button>
        for an instant {welcome.percent}% discount. It is applied automatically at checkout.
      </p>
    </div>
  )
}
