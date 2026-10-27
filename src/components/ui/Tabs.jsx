import { useRef } from 'react'
import { cn } from '../../utils/cn'

export function Tabs({ tabs, value, onChange, idPrefix, label, className }) {
  const refs = useRef({})

  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === value)
    let next = -1
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    if (next === -1) return
    event.preventDefault()
    const id = tabs[next].id
    onChange(id)
    refs.current[id]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[tab.id] = node
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors',
              active ? 'text-ink-950' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="tabular ml-2 font-mono text-xs text-ink-400">{tab.count}</span>
            )}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-0 h-0.5 origin-left animate-grow-x rounded bg-ember-500"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ idPrefix, id, value, children, className }) {
  if (id !== value) return null
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      tabIndex={0}
      className={cn('animate-fade', className)}
    >
      {children}
    </div>
  )
}