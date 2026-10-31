import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { lockScroll } from '../../utils/scrollLock'

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const node = panelRef.current
    const first = node?.querySelector(FOCUSABLE)
    ;(first ?? node)?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !node) return
      const list = [...node.querySelectorAll(FOCUSABLE)]
      if (list.length === 0) {
        event.preventDefault()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault()
        lastEl.focus()
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const unlock = lockScroll()

    return () => {
      document.removeEventListener('keydown', onKey)
      unlock()
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-80 grid place-items-end sm:place-items-center">
      <div
        aria-hidden="true"
        onClick={() => closeRef.current?.()}
        className="absolute inset-0 animate-fade bg-black/60"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative max-h-[90vh] w-full animate-pop overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-lift sm:rounded-3xl sm:p-8',
          SIZES[size],
        )}
      >
        <button
          type="button"
          onClick={() => closeRef.current?.()}
          aria-label="Close dialog"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-ink-500 transition hover:bg-ivory-200 hover:text-ink-900"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <h2 id={titleId} className="pr-10 text-2xl font-semibold">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-2 leading-relaxed text-ink-600">
            {description}
          </p>
        )}
        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}