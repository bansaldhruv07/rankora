import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Info, X } from 'lucide-react'
import { ToastContext } from '../../hooks/useToast'
import { cn } from '../../utils/cn'

const TONES = {
  success: { icon: Check, badge: 'bg-sage-100 text-sage-700' },
  info: { icon: Info, badge: 'bg-ember-50 text-ember-600' },
}

export default function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const counter = useRef(0)
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, tone = 'success', duration = 3600 }) => {
      counter.current += 1
      const id = counter.current
      setItems((prev) => [...prev.slice(-2), { id, title, description, tone }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach((timer) => clearTimeout(timer))
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-90 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
      >
        {items.map((item) => {
          const { icon: Icon, badge } = TONES[item.tone] ?? TONES.success
          return (
            <div
              key={item.id}
              className="pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-xl border border-line bg-ivory-50 p-3.5 pr-2 shadow-lift"
            >
              <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', badge)}>
                <Icon size={14} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 truncate text-sm text-ink-600">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-400 transition hover:bg-ivory-200 hover:text-ink-900"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}