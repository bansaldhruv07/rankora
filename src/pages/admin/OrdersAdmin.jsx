import { useState } from 'react'
import { Confirm, ErrorNote, Field, INPUT, PageTitle, Pager, StatusBadge, Table } from '../../components/admin/ui'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { formatDateTime, formatPrice } from '../../utils/format'
import { useAdmin } from './adminContext'

export default function OrdersAdmin() {
  const toast = useToast()
  const { can } = useAdmin()
  const [filters, setFilters] = useState({ status: '', email: '' })
  const [page, setPage] = useState(1)
  const [refund, setRefund] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const p = new URLSearchParams({ page: String(page), limit: '25' })
  if (filters.status) p.set('status', filters.status)
  if (filters.email.trim()) p.set('email', filters.email.trim())
  const { data, meta, error, reload } = useApi(`/admin/orders?${p}`)

  const doRefund = async () => {
    setBusy(true)
    try {
      await api(`/admin/orders/${refund.id}/refund`, { method: 'POST', body: { reason: reason.trim() || 'admin refund' } })
      toast({ title: 'Refund processed', description: 'Access to this item has been removed.' })
      reload()
    } catch (err) {
      toast({ title: err.message, tone: 'info', duration: 7000 })
    }
    setBusy(false)
    setRefund(null)
    setReason('')
  }

  return (
    <>
      <PageTitle title="Orders" description="Every checkout, with its verified payment status." />
      <div className="mb-4 flex flex-wrap gap-2.5">
        <input type="search" aria-label="Student email" placeholder="Student email starts with…" value={filters.email} onChange={(e) => { setFilters({ ...filters, email: e.target.value }); setPage(1) }} className={`${INPUT} sm:w-72`} />
        <select aria-label="Status" value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }} className={`${INPUT} sm:w-auto`}>
          <option value="">Any status</option>
          {['paid', 'pending', 'failed', 'cancelled', 'refunded'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <ErrorNote error={error} onRetry={reload} />
      {data && (
        <>
          <Table
            rows={data}
            empty="No orders match."
            columns={[
              { key: 'reference', label: 'Order', render: (o) => <span className="font-mono text-xs">{o.reference}</span> },
              { key: 'productTitle', label: 'Item', render: (o) => <span className="block max-w-[15rem] truncate">{o.productTitle}</span> },
              { key: 'user', label: 'Student', render: (o) => <span className="block max-w-[14rem] truncate text-ink-600">{o.user.email}</span> },
              { key: 'amount', label: 'Amount', align: 'right', render: (o) => <span>{formatPrice(o.amount)}{o.couponCode && <span className="block text-xs text-ink-500">{o.couponCode}</span>}</span> },
              { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
              { key: 'createdAt', label: 'Created', render: (o) => <span className="whitespace-nowrap text-ink-600">{formatDateTime(o.createdAt)}</span> },
              { key: 'actions', label: '', render: (o) => o.status === 'paid' && can('refund') && <button type="button" onClick={() => setRefund(o)} className="text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">Refund</button> },
            ]}
          />
          <Pager meta={meta} onPage={setPage} />
        </>
      )}
      <Confirm open={Boolean(refund)} title="Refund this order?" confirmLabel="Refund in full" danger busy={busy} onClose={() => setRefund(null)} onConfirm={doRefund}>
        <p>
          <strong>{refund?.productTitle}</strong> for {refund?.user.email}: {refund && formatPrice(refund.amount)} goes back to the original payment method through Razorpay, and the student loses access immediately (any open reader closes).
        </p>
        <div className="mt-4">
          <Field label="Reason (kept in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </div>
      </Confirm>
    </>
  )
}
