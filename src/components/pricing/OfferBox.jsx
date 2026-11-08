import { useId } from 'react'
import { AlertCircle, Check, Loader2, Tag } from 'lucide-react'
import { useFeatures } from '../../hooks/useFeatures'
import { formatPrice } from '../../utils/format'
import { cn } from '../../utils/cn'

// The code field at checkout, with live validation, plus the store-credit switch. `live` comes from useLiveQuote.
export default function OfferBox({ live, className }) {
  const id = useId()
  const { referrals, teachers } = useFeatures()
  const quote = live.quote
  const kinds = ['Coupon', teachers && 'teacher', referrals && 'friend'].filter(Boolean)
  const label = kinds.length === 1 ? 'Coupon code' : `${kinds.slice(0, -1).join(', ')} or ${kinds.at(-1)} code`
  const auto = !live.code.trim() && ['teacher', 'referral'].includes(quote?.discountSource)

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-600">
          {label[0].toUpperCase() + label.slice(1)}
        </label>
        <div className="relative">
          <input
            id={id}
            value={live.code}
            onChange={(event) => live.setCode(event.target.value.toUpperCase())}
            placeholder="Enter a code"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={30}
            aria-invalid={live.status === 'error'}
            aria-describedby={`${id}-status`}
            className="h-11 w-full rounded-xl border border-line bg-surface pl-4 pr-10 text-sm uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15"
          />
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {live.status === 'checking' && <Loader2 size={16} className="animate-spin text-ink-400" />}
            {live.status === 'ok' && <Check size={16} className="text-sage-600" />}
            {live.status === 'error' && <AlertCircle size={16} className="text-ember-600" />}
          </span>
        </div>
        <div id={`${id}-status`} aria-live="polite" className="min-h-0">
          {live.status === 'error' && (
            <p role="alert" className="mt-1.5 text-sm text-ember-700">
              {live.error}
            </p>
          )}
          {live.status === 'ok' && quote?.discountLabel && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-sage-700">
              <Check size={14} aria-hidden="true" />
              {quote.discountLabel} applied
            </p>
          )}
          {quote?.notice && live.status !== 'error' && <p className="mt-1.5 text-sm text-ink-600">{quote.notice}</p>}
        </div>
      </div>

      {auto && (
        <p className="flex items-center gap-2 rounded-xl bg-sage-50 px-4 py-2.5 text-sm font-medium text-sage-700">
          <Tag size={14} aria-hidden="true" />
          {quote.discountLabel} applied from your link
        </p>
      )}

      {quote?.creditAvailable > 0 && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm">
          <input type="checkbox" checked={live.useCredit} onChange={(event) => live.setUseCredit(event.target.checked)} className="mt-0.5 size-4 accent-[#c2571a]" />
          <span>
            <span className="font-medium text-ink-900">Use my store credit</span>
            <span className="block text-xs text-ink-600">You have {formatPrice(quote.creditAvailable)} from referrals. It is taken off this order.</span>
          </span>
        </label>
      )}
    </div>
  )
}
