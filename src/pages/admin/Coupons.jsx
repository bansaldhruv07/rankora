import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Confirm, ErrorNote, Field, PageTitle, StatusBadge, Table } from '../../components/admin/ui'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { formatLongDate, formatPrice } from '../../utils/format'

const EMPTY = { code: '', description: '', type: 'percent', value: '', maxDiscount: '', minOrder: '', usageLimit: '', perUserLimit: '1', validUntil: '', active: true }
const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

function CouponForm({ coupon, onClose, onSaved }) {
  const toast = useToast()
  const editing = Boolean(coupon)
  const [form, setForm] = useState(
    coupon
      ? { code: coupon.code, description: coupon.description, type: coupon.type, value: String(coupon.value), maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '', minOrder: coupon.minOrder ? String(coupon.minOrder) : '', usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '', perUserLimit: String(coupon.perUserLimit), validUntil: dateInput(coupon.validUntil), active: coupon.active }
      : EMPTY,
  )
  const [state, setState] = useState({ busy: false, errors: {}, message: '' })
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setState({ busy: true, errors: {}, message: '' })
    const num = (v) => (v === '' ? null : Number(v))
    const body = {
      description: form.description.trim(),
      type: form.type,
      value: Number(form.value),
      maxDiscount: form.type === 'percent' ? num(form.maxDiscount) : null,
      minOrder: num(form.minOrder) ?? 0,
      usageLimit: num(form.usageLimit),
      perUserLimit: Number(form.perUserLimit) || 1,
      // End of the chosen day, so "valid until 30 Nov" includes the 30th.
      validUntil: form.validUntil ? new Date(`${form.validUntil}T23:59:59`).toISOString() : null,
      active: form.active,
    }
    try {
      if (editing) await api(`/admin/coupons/${coupon.id}`, { method: 'PATCH', body })
      else await api('/admin/coupons', { method: 'POST', body: { ...body, code: form.code.trim().toUpperCase() } })
      toast({ title: editing ? 'Offer updated' : 'Offer created' })
      onSaved()
    } catch (err) {
      setState({ busy: false, errors: Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message])), message: err.message })
    }
  }

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${coupon.code}` : 'New offer code'} description="Students enter the code at checkout. The discount is calculated on the server." size="md">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Code" value={form.code} onChange={set('code')} disabled={editing} placeholder="LAUNCH20" maxLength={30} error={state.errors.code} hint="Letters, numbers, - and _. Cannot be changed later." className="sm:col-span-2" />
        <Field as="select" label="Discount type" value={form.type} onChange={set('type')}>
          <option value="percent">Percentage off</option>
          <option value="flat">Flat amount off</option>
        </Field>
        <Field label={form.type === 'percent' ? 'Percent off (1–90)' : 'Amount off (₹)'} type="number" min="1" step={form.type === 'percent' ? '1' : '0.01'} value={form.value} onChange={set('value')} error={state.errors.value} />
        {form.type === 'percent' && <Field label="Maximum discount (₹)" type="number" min="1" value={form.maxDiscount} onChange={set('maxDiscount')} hint="Optional cap." />}
        <Field label="Minimum order (₹)" type="number" min="0" value={form.minOrder} onChange={set('minOrder')} hint="Optional." />
        <Field label="Total uses allowed" type="number" min="1" value={form.usageLimit} onChange={set('usageLimit')} hint="Leave empty for unlimited." />
        <Field label="Uses per student" type="number" min="1" value={form.perUserLimit} onChange={set('perUserLimit')} />
        <Field label="Valid until" type="date" value={form.validUntil} onChange={set('validUntil')} hint="Optional." />
        <Field label="Note to yourself" value={form.description} onChange={set('description')} maxLength={200} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="size-4 accent-[#c2571a]" />
          Active
        </label>
        {state.message && !Object.keys(state.errors).length && <p role="alert" className="text-sm text-ember-700 sm:col-span-2">{state.message}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent" disabled={state.busy || !form.value || (!editing && !form.code)}>
            {state.busy ? 'Saving…' : 'Save offer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Coupons() {
  const toast = useToast()
  const { data, error, reload } = useApi('/admin/coupons')
  const [editing, setEditing] = useState(null) // null | 'new' | coupon
  const [removing, setRemoving] = useState(null)

  const remove = async () => {
    try {
      await api(`/admin/coupons/${removing.id}`, { method: 'DELETE' })
      toast({ title: 'Offer deleted' })
      reload()
    } catch (err) {
      toast({ title: err.message, tone: 'info', duration: 6000 })
    }
    setRemoving(null)
  }

  const state = (c) => (!c.active ? 'inactive' : c.validUntil && new Date(c.validUntil) < new Date() ? 'archived' : 'active')

  return (
    <>
      <PageTitle title="Offers" description="Discount codes for individual notes, bundles and Premium. Sale prices and original prices are set on each note.">
        <Button variant="accent" icon={Plus} onClick={() => setEditing('new')}>
          New offer
        </Button>
      </PageTitle>
      <ErrorNote error={error} onRetry={reload} />
      {data && (
        <Table
          rows={data}
          empty="No offer codes yet."
          columns={[
            { key: 'code', label: 'Code', render: (c) => <span className="font-mono font-semibold">{c.code}</span> },
            { key: 'value', label: 'Discount', render: (c) => (c.type === 'percent' ? `${c.value}% off${c.maxDiscount ? ` (max ${formatPrice(c.maxDiscount)})` : ''}` : `${formatPrice(c.value)} off`) },
            { key: 'used', label: 'Used', align: 'right', render: (c) => `${c.used}${c.usageLimit ? ` / ${c.usageLimit}` : ''}` },
            { key: 'validUntil', label: 'Valid until', render: (c) => (c.validUntil ? formatLongDate(c.validUntil) : 'No end') },
            { key: 'status', label: 'Status', render: (c) => <StatusBadge status={state(c)}>{state(c) === 'archived' ? 'expired' : state(c)}</StatusBadge> },
            {
              key: 'actions',
              label: '',
              render: (c) => (
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(c)}>Delete</Button>
                </div>
              ),
            },
          ]}
        />
      )}
      {editing && <CouponForm coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      <Confirm open={Boolean(removing)} title={`Delete ${removing?.code}?`} confirmLabel="Delete" danger onClose={() => setRemoving(null)} onConfirm={remove}>
        Codes that have been used cannot be deleted; switch those off with Edit → Active instead.
      </Confirm>
    </>
  )
}
