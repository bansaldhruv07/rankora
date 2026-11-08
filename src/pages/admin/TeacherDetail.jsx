import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Download } from 'lucide-react'
import { Confirm, ErrorNote, Field, PageTitle, Panel, StatusBadge, Table, Toggle } from '../../components/admin/ui'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { API_BASE, api } from '../../lib/api'
import { formatLongDate, formatPrice } from '../../utils/format'

const today = () => new Date().toISOString().slice(0, 10)
const errorsOf = (err) => Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message]))

function Figure({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="font-display text-2xl font-semibold tabular">{value}</p>
      <p className="text-sm font-medium text-ink-800">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

function Details({ teacher, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: teacher.name,
    phone: teacher.phone,
    email: teacher.email ?? '',
    discountPercent: String(teacher.discountPercent),
    commissionPercent: String(teacher.commissionPercent),
    active: teacher.active,
    blocked: teacher.blocked,
    notes: teacher.notes ?? '',
  })
  const [state, setState] = useState({ busy: false, errors: {}, message: '' })
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setState({ busy: true, errors: {}, message: '' })
    try {
      await api(`/admin/growth/teachers/${teacher.id}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          discountPercent: Number(form.discountPercent),
          commissionPercent: Number(form.commissionPercent),
          active: form.active,
          blocked: form.blocked,
          notes: form.notes.trim(),
        },
      })
      toast({ title: 'Teacher updated' })
      setState({ busy: false, errors: {}, message: '' })
      onSaved()
    } catch (err) {
      setState({ busy: false, errors: errorsOf(err), message: err.message })
    }
  }

  return (
    <Panel title="Details" description="Rates apply to future orders only; sales already made keep the rate they were made at. The code itself never changes.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Name" value={form.name} onChange={set('name')} error={state.errors.name} />
        <Field label="Phone" value={form.phone} onChange={set('phone')} error={state.errors.phone} />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} error={state.errors.email} />
        <Field label="Code" value={teacher.code} disabled readOnly />
        <Field label="Student discount %" type="number" min="0" max="90" value={form.discountPercent} onChange={set('discountPercent')} error={state.errors.discountPercent} />
        <Field label="Commission %" type="number" min="0" max="90" value={form.commissionPercent} onChange={set('commissionPercent')} error={state.errors.commissionPercent} />
        <Field as="textarea" rows={2} label="Notes (private)" value={form.notes} onChange={set('notes')} maxLength={500} className="sm:col-span-2" />
        <Toggle label="Active" hint="Off stops new students from using the code." checked={form.active} onChange={(value) => setForm((f) => ({ ...f, active: value }))} />
        <Toggle label="Blocked" hint="For misuse: students see that the code is no longer available." checked={form.blocked} onChange={(value) => setForm((f) => ({ ...f, blocked: value }))} />
        {state.message && !Object.keys(state.errors).length && (
          <p role="alert" className="text-sm text-ember-700 sm:col-span-2">
            {state.message}
          </p>
        )}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" variant="accent" disabled={state.busy}>
            {state.busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function ShareLink({ teacher, onRotated }) {
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const studentLink = `${window.location.origin}/?t=${teacher.code}`

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `${what} copied` })
    } catch {
      toast({ title: 'Copy failed: select it and copy by hand', tone: 'info' })
    }
  }
  const rotate = async () => {
    setBusy(true)
    try {
      await api(`/admin/growth/teachers/${teacher.id}/rotate-token`, { method: 'POST' })
      toast({ title: 'New stats link created', description: 'The old one no longer works.' })
      setConfirming(false)
      onRotated()
    } catch (err) {
      toast({ title: err.message, tone: 'info' })
    }
    setBusy(false)
  }

  const row = (label, value, what, hint) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-800">{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value} onFocus={(event) => event.target.select()} className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-ivory-50 px-3.5 font-mono text-xs text-ink-800" />
        <Button variant="outline" icon={Copy} onClick={() => copy(value, what)}>
          Copy
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
    </div>
  )

  return (
    <Panel title="Links" description="Send the stats link only to the teacher. Anyone who has it can see their numbers (never student details).">
      <div className="space-y-5">
        {row('Teacher’s private stats page', teacher.statsUrl, 'Stats link', 'Read-only, no login, not indexed by search engines.')}
        {row('Link for students', studentLink, 'Student link', 'Opens the site and saves the code for 30 days. They can also type the code at checkout.')}
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          Replace the stats link
        </Button>
      </div>
      <Confirm open={confirming} title="Replace the stats link?" confirmLabel="Replace link" busy={busy} danger onClose={() => setConfirming(false)} onConfirm={rotate}>
        The current link stops working immediately. Use this if it was shared by mistake, then send the teacher the new one.
      </Confirm>
    </Panel>
  )
}

function Payout({ teacher, onPaid }) {
  const toast = useToast()
  const orders = teacher.payableOrders
  const [picked, setPicked] = useState(() => new Set(orders.map((o) => o.id)))
  const [form, setForm] = useState({ upiRef: '', note: '', paidAt: today() })
  const [confirming, setConfirming] = useState(false)
  const [state, setState] = useState({ busy: false, errors: {}, message: '' })

  const chosen = orders.filter((o) => picked.has(o.id))
  const gross = chosen.reduce((sum, o) => sum + o.commission, 0)
  const owed = teacher.stats.adjustmentsOwed
  const net = gross - owed
  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = async () => {
    setState({ busy: true, errors: {}, message: '' })
    try {
      await api(`/admin/growth/teachers/${teacher.id}/payouts`, {
        method: 'POST',
        body: { orderIds: chosen.map((o) => o.id), upiRef: form.upiRef.trim(), note: form.note.trim(), paidAt: new Date(`${form.paidAt}T12:00:00`).toISOString() },
      })
      toast({ title: 'Payout recorded' })
      setConfirming(false)
      onPaid()
    } catch (err) {
      setConfirming(false)
      setState({ busy: false, errors: errorsOf(err), message: err.message })
    }
  }

  return (
    <Panel title="Record a payout" description="Send the money by UPI first, then record it here with the UPI reference. Only commissions past the refund window can be selected. Refunds owed back are deducted automatically.">
      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-600">Nothing is payable yet. Commissions become payable after the refund window.</p>
      ) : (
        <div className="space-y-5">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-ivory-100 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-500">
                <tr>
                  <th scope="col" className="w-10 px-4 py-3" />
                  <th scope="col" className="px-4 py-3 font-medium">Order</th>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Product</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft bg-surface">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={picked.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Include order ${o.reference}`} className="size-4 accent-[#c2571a]" />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{o.reference}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">{formatLongDate(o.date)}</td>
                    <td className="px-4 py-3">{o.product}</td>
                    <td className="px-4 py-3 text-right tabular">{formatPrice(o.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <Figure label="Selected commissions" value={formatPrice(gross)} />
            <Figure label="Refunds owed back" value={owed ? `− ${formatPrice(owed)}` : formatPrice(0)} hint="Deducted from this payout." />
            <Figure label="Amount to send" value={formatPrice(Math.max(0, net))} hint={net < 0 ? 'Select more orders: refunds exceed the selection.' : undefined} />
          </dl>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="UPI reference" value={form.upiRef} onChange={(e) => setForm((f) => ({ ...f, upiRef: e.target.value }))} maxLength={100} error={state.errors.upiRef} />
            <Field label="Paid on" type="date" max={today()} value={form.paidAt} onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))} error={state.errors.paidAt} />
            <Field label="Note (optional)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} maxLength={300} />
          </div>
          {state.message && !Object.keys(state.errors).length && (
            <p role="alert" className="text-sm text-ember-700">
              {state.message}
            </p>
          )}
          <div className="flex justify-end">
            <Button variant="accent" disabled={!chosen.length || net < 0 || form.upiRef.trim().length < 3} onClick={() => setConfirming(true)}>
              Record payout
            </Button>
          </div>
        </div>
      )}
      <Confirm open={confirming} title={`Record a payout of ${formatPrice(Math.max(0, net))}?`} confirmLabel="Record payout" busy={state.busy} onClose={() => setConfirming(false)} onConfirm={submit}>
        {chosen.length} {chosen.length === 1 ? 'order' : 'orders'} will be marked as paid with UPI reference <strong className="font-mono">{form.upiRef.trim()}</strong>. This is a record only; no money moves from here.
      </Confirm>
    </Panel>
  )
}

function BonusRows({ teacher, onChanged }) {
  const toast = useToast()
  const [issuing, setIssuing] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const act = async (path, body, done) => {
    setBusy(true)
    try {
      await api(path, { method: 'POST', body })
      toast({ title: done })
      setIssuing(null)
      setNote('')
      onChanged()
    } catch (err) {
      toast({ title: err.message, tone: 'info', duration: 6000 })
    }
    setBusy(false)
  }

  const bonuses = teacher.stats.bonuses
  return (
    <Panel title="Milestone bonuses" description={`${teacher.stats.qualifiedStudents} qualified students (unique buyers past the refund window, not refunded). Each milestone is awarded once. Nothing is paid or issued automatically.`}>
      <Table
        rows={bonuses}
        empty="No milestone reached yet."
        columns={[
          { key: 'milestone', label: 'Milestone', render: (b) => `${b.milestone} students${b.partnerTeacher ? ' · Partner Teacher' : ''}` },
          { key: 'gift', label: 'Gift card', align: 'right', render: (b) => formatPrice(b.giftValue) },
          { key: 'status', label: 'Status', render: (b) => <StatusBadge status={b.status === 'eligible' ? 'open' : b.status === 'not_eligible' ? 'inactive' : 'active'}>{b.status.replace('_', ' ')}</StatusBadge> },
          { key: 'note', label: 'Note', render: (b) => b.note || '—' },
          {
            key: 'actions',
            label: '',
            render: (b) =>
              b.status === 'eligible' ? (
                <Button size="sm" variant="accent" disabled={busy} onClick={() => act(`/admin/growth/bonuses/${b.id}/approve`, undefined, 'Bonus approved')}>
                  Approve
                </Button>
              ) : b.status === 'approved' ? (
                <Button size="sm" variant="outline" onClick={() => setIssuing(b)}>
                  Mark issued
                </Button>
              ) : null,
          },
        ]}
      />
      {issuing && (
        <Modal
          open
          onClose={() => setIssuing(null)}
          title={`Mark the ${issuing.milestone}-student bonus as issued`}
          description="Record what you sent, for example the gift card brand and how it was delivered."
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setIssuing(null)}>
                Cancel
              </Button>
              <Button variant="accent" disabled={busy || note.trim().length < 2} onClick={() => act(`/admin/growth/bonuses/${issuing.id}/issue`, { note: note.trim() }, 'Marked as issued')}>
                Mark issued
              </Button>
            </>
          }
        >
          <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Amazon gift card, code sent on WhatsApp" />
        </Modal>
      )}
    </Panel>
  )
}

function Exports({ teacher }) {
  const [month, setMonth] = useState('')
  const link = (type) => `${API_BASE}/admin/growth/teachers/${teacher.id}/export?type=${type}${month ? `&month=${month}` : ''}`
  return (
    <Panel title="Export" description="CSV for your records. It never includes student names, emails or phone numbers.">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Month (optional)" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" hint="Empty exports everything." />
        {[['orders', 'Orders'], ['payouts', 'Payouts'], ['bonuses', 'Bonuses']].map(([type, label]) => (
          <Button key={type} href={link(type)} variant="outline" icon={Download}>
            {label}
          </Button>
        ))}
      </div>
    </Panel>
  )
}

export default function TeacherDetail() {
  const { id } = useParams()
  const { data, error, reload } = useApi(`/admin/growth/teachers/${id}`)

  if (error) {
    return (
      <>
        <Link to="/admin/teachers" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ember-600">
          <ArrowLeft size={15} aria-hidden="true" /> Teachers
        </Link>
        <ErrorNote error={error} onRetry={reload} />
      </>
    )
  }
  if (!data) return <p role="status" className="text-ink-600">Loading…</p>

  const s = data.stats
  return (
    <>
      <Link to="/admin/teachers" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ember-600">
        <ArrowLeft size={15} aria-hidden="true" /> Teachers
      </Link>
      <PageTitle title={data.name} description={`Code ${data.code} · ${data.discountPercent}% off for students · ${data.commissionPercent}% commission`}>
        <StatusBadge status={data.blocked ? 'suspended' : data.active ? 'active' : 'inactive'}>{data.blocked ? 'blocked' : data.active ? 'active' : 'off'}</StatusBadge>
        {data.partnerTeacher && <StatusBadge status="published">Partner Teacher</StatusBadge>}
      </PageTitle>

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label="Link clicks" value={s.clicks} />
          <Figure label="Paid students" value={s.paidStudents} hint={`${s.qualifiedStudents} qualified`} />
          <Figure label="Orders" value={s.orders} hint={s.refundedOrders ? `${s.refundedOrders} refunded` : undefined} />
          <Figure label="Sales" value={formatPrice(s.sales)} />
          <Figure label="Commission earned" value={formatPrice(s.earned)} />
          <Figure label="Payable now" value={formatPrice(s.netPayable)} hint={s.adjustmentsOwed ? `after ${formatPrice(s.adjustmentsOwed)} owed back` : undefined} />
          <Figure label="Paid out" value={formatPrice(s.paidOut)} />
          <Figure label="In refund window" value={formatPrice(s.inRefundWindow)} />
        </div>

        <ShareLink teacher={data} onRotated={reload} />
        <Payout key={data.payableOrders.map((o) => o.id).join('|')} teacher={data} onPaid={reload} />

        <Panel title="Payouts">
          <Table
            rows={data.payouts}
            empty="No payouts yet."
            columns={[
              { key: 'paidAt', label: 'Paid on', render: (p) => formatLongDate(p.paidAt) },
              { key: 'upiRef', label: 'UPI reference', render: (p) => <span className="font-mono text-xs">{p.upiRef}</span> },
              { key: 'orders', label: 'Orders', align: 'right' },
              { key: 'gross', label: 'Commissions', align: 'right', render: (p) => formatPrice(p.gross) },
              { key: 'adjustments', label: 'Refunds deducted', align: 'right', render: (p) => (p.adjustments ? `− ${formatPrice(Math.abs(p.adjustments))}` : '—') },
              { key: 'amount', label: 'Sent', align: 'right', render: (p) => <strong>{formatPrice(p.amount)}</strong> },
              { key: 'note', label: 'Note', render: (p) => p.note || '—' },
            ]}
          />
        </Panel>

        <BonusRows teacher={data} onChanged={reload} />

        <div className="grid gap-8 xl:grid-cols-2">
          <Panel title="Month by month">
            <Table
              rows={data.monthly}
              rowKey={(m) => m.month}
              empty="No sales yet."
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'orders', label: 'Orders', align: 'right' },
                { key: 'sales', label: 'Sales', align: 'right', render: (m) => formatPrice(m.sales) },
                { key: 'commission', label: 'Commission', align: 'right', render: (m) => formatPrice(m.commission) },
              ]}
            />
          </Panel>
          <Panel title="Recent orders">
            <Table
              rows={data.recent}
              rowKey={(o) => `${o.date}-${o.product}-${o.amount}`}
              empty="No orders yet."
              columns={[
                { key: 'date', label: 'Date', render: (o) => formatLongDate(o.date) },
                { key: 'product', label: 'Product' },
                { key: 'amount', label: 'Amount', align: 'right', render: (o) => formatPrice(o.amount) },
                { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status === 'refunded' ? 'refunded' : o.status === 'paid' ? 'paid' : 'pending'}>{o.status}</StatusBadge> },
              ]}
            />
          </Panel>
        </div>

        <Details key={data.name + data.phone + data.discountPercent + data.commissionPercent + data.active + data.blocked} teacher={data} onSaved={reload} />
        <Exports teacher={data} />
      </div>
    </>
  )
}
