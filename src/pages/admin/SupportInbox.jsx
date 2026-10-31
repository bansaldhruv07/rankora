import { useState } from 'react'
import { ErrorNote, PageTitle, Pager, StatusBadge } from '../../components/admin/ui'
import Button from '../../components/ui/Button'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { formatDateTime } from '../../utils/format'

export default function SupportInbox() {
  const toast = useToast()
  const [status, setStatus] = useState('open')
  const [page, setPage] = useState(1)
  const { data, meta, error, reload } = useApi(`/admin/support?page=${page}&limit=25${status ? `&status=${status}` : ''}`)

  const set = async (id, next) => {
    try {
      await api(`/admin/support/${id}`, { method: 'PATCH', body: { status: next } })
      toast({ title: next === 'resolved' ? 'Marked resolved' : 'Reopened' })
      reload()
    } catch (err) {
      toast({ title: err.message, tone: 'info' })
    }
  }

  return (
    <>
      <PageTitle title="Support" description="Messages from students. Reply from your own email; the student's address is shown on each message." />
      <div className="mb-4 flex gap-2" role="group" aria-label="Filter">
        {[['open', 'Open'], ['resolved', 'Resolved'], ['', 'All']].map(([value, label]) => (
          <Button key={label} size="sm" variant={status === value ? 'primary' : 'outline'} onClick={() => { setStatus(value); setPage(1) }}>
            {label}
          </Button>
        ))}
      </div>
      <ErrorNote error={error} onRetry={reload} />
      {data && data.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-ink-600">No messages here.</p>}
      <ul className="space-y-4">
        {data?.map((m) => (
          <li key={m.id} className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{m.subject}</h2>
                <p className="mt-0.5 text-sm text-ink-600">
                  {m.user.name} · <a href={`mailto:${m.user.email}`} className="underline underline-offset-4">{m.user.email}</a> · {formatDateTime(m.createdAt)}
                </p>
              </div>
              <StatusBadge status={m.status} />
            </div>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink-800">{m.message}</p>
            {m.orderId && <p className="mt-2 font-mono text-xs text-ink-500">Order RK-{m.orderId.slice(-8).toUpperCase()}</p>}
            <div className="mt-4">
              {m.status === 'open' ? (
                <Button size="sm" variant="primary" onClick={() => set(m.id, 'resolved')}>Mark resolved</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => set(m.id, 'open')}>Reopen</Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Pager meta={meta} onPage={setPage} />
    </>
  )
}
