import { useState } from 'react'
import { ErrorNote, PageTitle, Pager, StatusBadge, Table } from '../../components/admin/ui'
import { Tabs } from '../../components/ui/Tabs'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { formatDateTime } from '../../utils/format'
import { useAdmin } from './adminContext'

const ACTIONS = ['', 'open', 'preview', 'denied', 'rate_limited', 'suspicious', 'revoked']
const warn = (action) => ['denied', 'suspicious', 'rate_limited'].includes(action)

function AccessLog() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const { data, meta, error, reload } = useApi(`/admin/access-logs?page=${page}&limit=50${action ? `&action=${action}` : ''}`)
  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-ink-600">Every time a document is opened or refused. “Suspicious” means one account used many IPs or opened many documents within an hour.</p>
      <select aria-label="Action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className="mb-4 h-11 rounded-xl border border-line bg-surface px-3 text-sm">
        {ACTIONS.map((a) => (
          <option key={a} value={a}>{a || 'All actions'}</option>
        ))}
      </select>
      <ErrorNote error={error} onRetry={reload} />
      {data && (
        <>
          <Table rows={data} empty="Nothing logged yet." columns={[
            { key: 'createdAt', label: 'When', render: (l) => <span className="whitespace-nowrap">{formatDateTime(l.createdAt)}</span> },
            { key: 'action', label: 'Action', render: (l) => <StatusBadge status={warn(l.action) ? 'failed' : 'draft'}>{l.action}</StatusBadge> },
            { key: 'user', label: 'Student', render: (l) => l.user ?? <span className="text-ink-400">anonymous</span> },
            { key: 'product', label: 'Note' },
            { key: 'ip', label: 'IP' },
            { key: 'note', label: 'Detail' },
          ]} />
          <Pager meta={meta} onPage={setPage} />
        </>
      )}
    </>
  )
}

function AuditLog() {
  const [page, setPage] = useState(1)
  const { data, meta, error, reload } = useApi(`/admin/audit-logs?page=${page}&limit=50`)
  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-ink-600">Every change made in Studio: who, what and when. This list cannot be edited.</p>
      <ErrorNote error={error} onRetry={reload} />
      {data && (
        <>
          <Table rows={data} empty="Nothing yet." columns={[
            { key: 'createdAt', label: 'When', render: (l) => <span className="whitespace-nowrap">{formatDateTime(l.createdAt)}</span> },
            { key: 'actor', label: 'By' },
            { key: 'action', label: 'Action', render: (l) => <span className="font-mono text-xs">{l.action}</span> },
            { key: 'summary', label: 'Detail' },
            { key: 'ip', label: 'IP' },
          ]} />
          <Pager meta={meta} onPage={setPage} />
        </>
      )}
    </>
  )
}

function Readers() {
  const toast = useToast()
  const { data, error, reload } = useApi('/admin/viewer-sessions?limit=100')
  const close = async (id) => {
    await api(`/admin/viewer-sessions/${id}/revoke`, { method: 'POST' })
    toast({ title: 'Reader closed' })
    reload()
  }
  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-ink-600">Reading sessions open right now. Closing one ends it immediately; the student can reopen the note.</p>
      <ErrorNote error={error} onRetry={reload} />
      {data && (
        <Table rows={data} empty="Nobody is reading right now." columns={[
          { key: 'user', label: 'Student' },
          { key: 'product', label: 'Note' },
          { key: 'mode', label: 'Type', render: (s) => <StatusBadge status="draft">{s.mode}</StatusBadge> },
          { key: 'ip', label: 'IP' },
          { key: 'lastSeenAt', label: 'Last active', render: (s) => formatDateTime(s.lastSeenAt) },
          { key: 'megabytesServed', label: 'MB', align: 'right' },
          { key: 'x', label: '', render: (s) => <button type="button" onClick={() => close(s.id)} className="text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">Close</button> },
        ]} />
      )}
    </>
  )
}

export default function Activity() {
  const { can } = useAdmin()
  const tabs = [
    { id: 'access', label: 'Document access' },
    can('users') && { id: 'readers', label: 'Open readers' },
    can('audit') && { id: 'audit', label: 'Audit log' },
  ].filter(Boolean)
  const [tab, setTab] = useState('access')
  return (
    <>
      <PageTitle title="Activity" description="Who opened what, what was refused, and what staff changed." />
      <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="activity" label="Activity" />
      <div className="mt-6">
        {tab === 'access' && <AccessLog />}
        {tab === 'readers' && <Readers />}
        {tab === 'audit' && <AuditLog />}
      </div>
    </>
  )
}
