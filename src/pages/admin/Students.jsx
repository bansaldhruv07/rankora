import { useState } from 'react'
import { Confirm, ErrorNote, INPUT, PageTitle, Pager, Panel, StatusBadge, Table } from '../../components/admin/ui'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { formatDateTime, formatLongDate, formatPrice } from '../../utils/format'

function StudentDetail({ id, onClose, onChanged }) {
  const toast = useToast()
  const { data, error, reload } = useApi(`/admin/users/${id}`)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await api(`/admin/users/${id}/${confirm.action}`, { method: 'POST' })
      toast({ title: confirm.done })
      reload()
      onChanged()
    } catch (err) {
      toast({ title: err.message, tone: 'info' })
    }
    setBusy(false)
    setConfirm(null)
  }

  const user = data?.user
  return (
    <Modal open onClose={onClose} size="lg" title={user ? user.name : 'Student'} description={user?.email}>
      <ErrorNote error={error} onRetry={reload} />
      {data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={user.suspended ? 'suspended' : 'active'} />
            <span className="text-sm text-ink-600">Joined {formatLongDate(user.createdAt)} · last sign-in {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'never'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'revoke-sessions', title: 'Sign this student out everywhere?', text: 'All their logins and open readers are closed. They can sign in again.', label: 'Revoke sessions', done: 'Sessions revoked' })}>
              Revoke all sessions
            </Button>
            {user.suspended ? (
              <Button size="sm" variant="primary" onClick={() => setConfirm({ action: 'unsuspend', title: 'Reinstate this account?', text: 'They will be able to sign in again.', label: 'Reinstate', done: 'Account reinstated' })}>
                Reinstate
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="text-danger-500" onClick={() => setConfirm({ action: 'suspend', title: 'Suspend this account?', text: 'They are signed out, cannot sign in, and every open reader closes. Their purchases are kept.', label: 'Suspend', danger: true, done: 'Account suspended' })}>
                Suspend
              </Button>
            )}
          </div>
          <Panel title="Orders">
            <Table rows={data.orders} empty="No orders." columns={[
              { key: 'reference', label: 'Order', render: (o) => <span className="font-mono text-xs">{o.reference}</span> },
              { key: 'productTitle', label: 'Item' },
              { key: 'amount', label: 'Amount', align: 'right', render: (o) => formatPrice(o.amount) },
              { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
            ]} />
          </Panel>
          <Panel title={`Open readers (${data.activeSessions.length})`}>
            <Table rows={data.activeSessions} empty="None right now." columns={[
              { key: 'product', label: 'Note' },
              { key: 'ip', label: 'IP' },
              { key: 'lastSeenAt', label: 'Last active', render: (s) => formatDateTime(s.lastSeenAt) },
            ]} />
          </Panel>
          <Panel title="Recent access">
            <Table rows={data.recentAccess.map((a, i) => ({ ...a, id: i }))} empty="No activity." columns={[
              { key: 'action', label: 'Action', render: (a) => <StatusBadge status={['denied', 'suspicious', 'rate_limited'].includes(a.action) ? 'failed' : 'draft'}>{a.action}</StatusBadge> },
              { key: 'product', label: 'Note' },
              { key: 'ip', label: 'IP' },
              { key: 'note', label: 'Detail' },
              { key: 'createdAt', label: 'When', render: (a) => formatDateTime(a.createdAt) },
            ]} />
          </Panel>
        </div>
      )}
      <Confirm open={Boolean(confirm)} title={confirm?.title ?? ''} confirmLabel={confirm?.label} danger={confirm?.danger} busy={busy} onClose={() => setConfirm(null)} onConfirm={run}>
        {confirm?.text}
      </Confirm>
    </Modal>
  )
}

export default function Students() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const { data, meta, error, reload } = useApi(`/admin/users?page=${page}&limit=25${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`)

  return (
    <>
      <PageTitle title="Students" description="Accounts, their purchases and reading activity." />
      <input type="search" aria-label="Search students" placeholder="Search name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className={`${INPUT} mb-4 sm:w-80`} />
      <ErrorNote error={error} onRetry={reload} />
      {data && (
        <>
          <Table
            rows={data}
            empty="No accounts match."
            columns={[
              { key: 'name', label: 'Name', render: (u) => <button type="button" onClick={() => setOpen(u.id)} className="font-medium text-ink-900 hover:text-ember-600">{u.name}</button> },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role', render: (u) => (u.role === 'student' ? <span className="text-ink-500">student</span> : <StatusBadge status="published">{u.role}</StatusBadge>) },
              { key: 'orders', label: 'Orders', align: 'right' },
              { key: 'spent', label: 'Spent', align: 'right', render: (u) => formatPrice(u.spent) },
              { key: 'createdAt', label: 'Joined', render: (u) => formatLongDate(u.createdAt) },
              { key: 'suspended', label: '', render: (u) => u.suspended && <StatusBadge status="suspended" /> },
            ]}
          />
          <Pager meta={meta} onPage={setPage} />
        </>
      )}
      {open && <StudentDetail id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}
