import { useId } from 'react'
import { cn } from '../../utils/cn'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

export const INPUT =
  'h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink-900 transition placeholder:text-ink-400 hover:border-ink-900/30 focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15 disabled:bg-ivory-100 disabled:text-ink-500'

// Label + control + hint/error, used by every admin form.
export function Field({ label, hint, error, as = 'input', children, className, ...props }) {
  const id = useId()
  const Control = as
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-800">
        {label}
      </label>
      {as === 'select' ? (
        <select id={id} className={INPUT} aria-invalid={Boolean(error)} {...props}>
          {children}
        </select>
      ) : (
        <Control id={id} className={cn(INPUT, as === 'textarea' && 'h-auto py-2.5 leading-relaxed')} aria-invalid={Boolean(error)} {...props} />
      )}
      {hint && !error && <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-ember-700">
          {error}
        </p>
      )}
    </div>
  )
}

export function Toggle({ label, hint, checked, onChange }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-[#c2571a]" />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-ink-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{hint}</span>}
      </label>
    </div>
  )
}

export function Panel({ title, description, children, className, action }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6', className)}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-relaxed text-ink-600">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageTitle({ title, description, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-ink-600">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

const STATUS_STYLE = {
  published: 'bg-sage-100 text-sage-700 ring-sage-600/25',
  paid: 'bg-sage-100 text-sage-700 ring-sage-600/25',
  resolved: 'bg-sage-100 text-sage-700 ring-sage-600/25',
  active: 'bg-sage-100 text-sage-700 ring-sage-600/25',
  draft: 'bg-ivory-200 text-ink-700 ring-ink-900/10',
  pending: 'bg-ivory-200 text-ink-700 ring-ink-900/10',
  open: 'bg-ember-50 text-ember-700 ring-ember-500/25',
  archived: 'bg-ink-900/[0.06] text-ink-600 ring-ink-900/10',
  cancelled: 'bg-ink-900/[0.06] text-ink-600 ring-ink-900/10',
  refunded: 'bg-ember-50 text-ember-700 ring-ember-500/25',
  failed: 'bg-danger-100 text-danger-500 ring-danger-500/25',
  suspended: 'bg-danger-100 text-danger-500 ring-danger-500/25',
  inactive: 'bg-ink-900/[0.06] text-ink-600 ring-ink-900/10',
}

export function StatusBadge({ status, children }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset', STATUS_STYLE[status] ?? STATUS_STYLE.draft)}>
      {children ?? status}
    </span>
  )
}

export function Table({ columns, rows, empty = 'Nothing here yet.', rowKey = (r) => r.id }) {
  if (!rows.length) return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-600">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-ivory-100 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 font-medium', c.align === 'right' && 'text-right')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft bg-surface">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="align-middle">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3', c.align === 'right' && 'text-right tabular')}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pager({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink-600">
      <p className="tabular">
        Page {meta.page} of {meta.pages} · {meta.total} total
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

// Destructive actions always ask first and say what will happen.
export function Confirm({ open, title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'primary' : 'accent'} onClick={onConfirm} disabled={busy} className={danger ? 'bg-danger-500 hover:bg-danger-500' : ''}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="leading-relaxed text-ink-700">{children}</div>
    </Modal>
  )
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">
      {error.message}{' '}
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Retry
        </button>
      )}
    </p>
  )
}
