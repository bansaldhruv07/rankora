import { useId, useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function Accordion({ items, defaultOpen = 0, className }) {
  const baseId = useId()
  const [openIndex, setOpenIndex] = useState(defaultOpen)

  return (
    <div className={cn('divide-y divide-line border-y border-line', className)}>
      {items.map((item, index) => {
        const open = openIndex === index
        const buttonId = `${baseId}-btn-${index}`
        const panelId = `${baseId}-panel-${index}`
        return (
          <div key={item.id ?? index}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? -1 : index)}
                className="group flex w-full items-center justify-between gap-6 py-3.5 text-left"
              >
                <span className="font-display text-base font-medium text-ink-900 transition-colors group-hover:text-ember-600 sm:text-lg">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full border border-line text-ink-700 transition duration-300 group-hover:border-ember-500 group-hover:text-ember-600',
                    open && 'rotate-45 border-ember-500 bg-ember-50 text-ember-600',
                  )}
                >
                  <Plus size={16} />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                'grid transition-[grid-template-rows,visibility] duration-300 ease-out',
                open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-3xl pb-4 pr-10 text-[0.95rem] leading-relaxed text-ink-600">{item.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}