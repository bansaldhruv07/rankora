import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ErrorNote, Field, PageTitle, Panel, StatusBadge, Table } from '../../components/admin/ui'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { formatLongDate, formatPrice } from '../../utils/format'

const EMPTY = { name: '', phone: '', email: '', code: '', discountPercent: '', commissionPercent: '' }

function NewTeacher({ onClose, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [state, setState] = useState({ busy: false, errors: {}, message: '' })
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setState({ busy: true, errors: {}, message: '' })
    const percent = (value) => (value === '' ? undefined : Number(value))
    try {
      const { data } = await api('/admin/growth/teachers', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
          ...(form.code.trim() ? { code: form.code.trim().toUpperCase() } : {}),
          ...(percent(form.discountPercent) !== undefined ? { discountPercent: percent(form.discountPercent) } : {}),
          ...(percent(form.commissionPercent) !== undefined ? { commissionPercent: percent(form.commissionPercent) } : {}),
        },
      })
      toast({ title: 'Teacher added', description: `Their code is ${data.code}.` })
      onCreated(data)
    } catch (err) {
      setState({ busy: false, errors: Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message])), message: err.message })
    }
  }

  return (
    <Modal open onClose={onClose} title="Add a teacher" description="They get a code for their students and a private link to see their numbers. There is no teacher sign-up." size="md">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Name" value={form.name} onChange={set('name')} maxLength={80} error={state.errors.name} className="sm:col-span-2" autoFocus />
        <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={state.errors.phone} hint="Used to stop them using their own code." />
        <Field label="Email (optional)" type="email" value={form.email} onChange={set('email')} error={state.errors.email} hint="Also used to stop self-use." />
        <Field label="Code (optional)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={16} error={state.errors.code} hint="4 to 16 letters or numbers. Left empty, one is made from the name." className="sm:col-span-2" />
        <Field label="Student discount % (optional)" type="number" min="0" max="90" value={form.discountPercent} onChange={set('discountPercent')} error={state.errors.discountPercent} hint="Empty uses the default." />
        <Field label="Commission % (optional)" type="number" min="0" max="90" value={form.commissionPercent} onChange={set('commissionPercent')} error={state.errors.commissionPercent} hint="Empty uses the default." />
        {state.message && !Object.keys(state.errors).length && (
          <p role="alert" className="text-sm text-ember-700 sm:col-span-2">
            {state.message}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={state.busy || !form.name.trim() || !form.phone.trim()}>
            {state.busy ? 'Adding…' : 'Add teacher'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Bonuses({ onChanged }) {
  const toast = useToast()
  const { data, error, reload } = useApi('/admin/growth/bonuses?status=eligible')
  const [busy, setBusy] = useState('')

  const approve = async (bonus) => {
    setBusy(bonus.id)
    try {
      await api(`/admin/growth/bonuses/${bonus.id}/approve`, { method: 'POST' })
      toast({ title: 'Bonus approved', description: 'Mark it as issued from the teacher page once the gift is sent.' })
      reload()
      onChanged()
    } catch (err) {
      toast({ title: err.message, tone: 'info', duration: 6000 })
    }
    setBusy('')
  }

  if (error) return <ErrorNote error={error} onRetry={reload} />
  if (!data?.length) return null
  return (
    <Panel title="Bonuses awaiting approval" description="A teacher reached a milestone. Approving does not pay or send anything: you issue the gift yourself and record it on their page.">
      <Table
        rows={data}
        columns={[
          { key: 'teacher', label: 'Teacher', render: (b) => <Link to={`/admin/teachers/${b.teacher.id}`} className="font-semibold hover:text-ember-600">{b.teacher.name} <span className="font-mono text-xs text-ink-500">{b.teacher.code}</span></Link> },
          { key: 'milestone', label: 'Milestone', render: (b) => `${b.milestone} students${b.partnerTeacher ? ' · Partner Teacher' : ''}` },
          { key: 'gift', label: 'Gift card', align: 'right', render: (b) => formatPrice(b.giftValue) },
          { key: 'reached', label: 'Reached', render: (b) => formatLongDate(b.reachedAt) },
          { key: 'actions', label: '', render: (b) => <Button size="sm" variant="accent" disabled={busy === b.id} onClick={() => approve(b)}>Approve</Button> },
        ]}
      />
    </Panel>
  )
}

export default function Teachers() {
  const { data, error, reload } = useApi('/admin/growth/teachers')
  const [adding, setAdding] = useState(false)

  const state = (t) => (t.blocked ? 'suspended' : t.active ? 'active' : 'inactive')

  return (
    <>
      <PageTitle title="Teachers" description="Offline teachers who share a code with their students. Commission becomes payable after the refund window.">
        <Button variant="accent" icon={Plus} onClick={() => setAdding(true)}>
          Add teacher
        </Button>
      </PageTitle>
      <ErrorNote error={error} onRetry={reload} />

      <div className="space-y-8">
        <Bonuses onChanged={reload} />
        {data && (
          <Table
            rows={data}
            empty="No teachers yet. Add the first one to give them a code."
            columns={[
              { key: 'name', label: 'Teacher', render: (t) => <Link to={`/admin/teachers/${t.id}`} className="font-semibold hover:text-ember-600">{t.name}<span className="ml-2 font-mono text-xs text-ink-500">{t.code}</span>{t.partnerTeacher && <span className="ml-2 text-xs text-sage-700">Partner</span>}</Link> },
              { key: 'clicks', label: 'Clicks', align: 'right', render: (t) => t.stats.clicks },
              { key: 'students', label: 'Students', align: 'right', render: (t) => t.stats.paidStudents },
              { key: 'orders', label: 'Orders', align: 'right', render: (t) => t.stats.orders },
              { key: 'sales', label: 'Sales', align: 'right', render: (t) => formatPrice(t.stats.sales) },
              { key: 'earned', label: 'Earned', align: 'right', render: (t) => formatPrice(t.stats.earned) },
              { key: 'payable', label: 'Payable now', align: 'right', render: (t) => formatPrice(t.stats.netPayable) },
              { key: 'paid', label: 'Paid out', align: 'right', render: (t) => formatPrice(t.stats.paidOut) },
              { key: 'pending', label: 'Pending', align: 'right', render: (t) => formatPrice(t.stats.pending) },
              { key: 'bonuses', label: 'Bonuses', render: (t) => (t.stats.bonuses.filter((b) => b.status === 'eligible').length ? <StatusBadge status="open">{t.stats.bonuses.filter((b) => b.status === 'eligible').length} to approve</StatusBadge> : t.stats.bonuses.length || '—') },
              { key: 'status', label: 'Status', render: (t) => <StatusBadge status={state(t)}>{t.blocked ? 'blocked' : t.active ? 'active' : 'off'}</StatusBadge> },
            ]}
          />
        )}
      </div>

      {adding && (
        <NewTeacher
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false)
            reload()
          }}
        />
      )}
    </>
  )
}
