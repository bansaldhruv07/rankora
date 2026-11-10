import { useState } from 'react'
import { ErrorNote, Field, PageTitle, StatusBadge, Table } from '../../components/admin/ui'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { formatLongDate, formatPrice } from '../../utils/format'

const FILTERS = [
  ['eligible', 'To approve'],
  ['approved', 'To send'],
  ['issued', 'Sent'],
]
const BADGE = { eligible: 'open', approved: 'active', issued: 'active' }
const LABEL = { eligible: 'to approve', approved: 'approved', issued: 'sent' }

// Gift cards students unlocked through refer and earn. Approving or marking one sent does not move money or message
// anyone: you buy and send the card yourself, then record what you did here.
export default function ReferralGifts() {
  const toast = useToast()
  const [status, setStatus] = useState('eligible')
  const { data, error, reload } = useApi(`/admin/referral-gifts?status=${status}`)
  const [issuing, setIssuing] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')

  const act = async (id, action, body, done) => {
    setBusy(id)
    try {
      await api(`/admin/referral-gifts/${id}/${action}`, { method: 'POST', body })
      toast({ title: done })
      setIssuing(null)
      setNote('')
      reload()
    } catch (err) {
      toast({ title: err.message, tone: 'info', duration: 6000 })
    }
    setBusy('')
  }

  return (
    <>
      <PageTitle title="Gift cards" description="Students whose friends reached a refer-and-earn milestone. Approve, buy and send the card yourself, then mark it sent with the details." />
      <ErrorNote error={error} onRetry={reload} />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Show gift cards that are">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${status === value ? 'border-ember-500 bg-ember-500 text-white' : 'border-line text-ink-700 hover:border-ember-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {data && (
        <Table
          rows={data}
          empty="Nothing here yet."
          columns={[
            { key: 'student', label: 'Student', render: (g) => <span className="font-semibold">{g.student.name}<span className="ml-2 text-xs font-normal text-ink-500">{g.student.email}</span></span> },
            { key: 'tier', label: 'Milestone', render: (g) => `${g.tier} friends` },
            { key: 'gift', label: 'Gift card', align: 'right', render: (g) => <span title={`${g.percent}% of ${formatPrice(g.basis)}`}>{formatPrice(g.value)}</span> },
            { key: 'reached', label: 'Reached', render: (g) => formatLongDate(g.reachedAt) },
            { key: 'status', label: 'Status', render: (g) => <StatusBadge status={BADGE[g.status]}>{LABEL[g.status]}</StatusBadge> },
            { key: 'note', label: 'Note', render: (g) => g.note || '—' },
            {
              key: 'actions',
              label: '',
              render: (g) =>
                g.status === 'eligible' ? (
                  <Button size="sm" variant="accent" disabled={busy === g.id} onClick={() => act(g.id, 'approve', undefined, 'Gift card approved')}>
                    Approve
                  </Button>
                ) : g.status === 'approved' ? (
                  <Button size="sm" variant="outline" onClick={() => setIssuing(g)}>
                    Mark sent
                  </Button>
                ) : null,
            },
          ]}
        />
      )}

      {issuing && (
        <Modal
          open
          onClose={() => setIssuing(null)}
          title={`Mark ${issuing.student.name}'s gift card as sent`}
          description="Record what you sent and how, for example the brand and that it went on WhatsApp."
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setIssuing(null)}>
                Cancel
              </Button>
              <Button variant="accent" disabled={busy === issuing.id || note.trim().length < 2} onClick={() => act(issuing.id, 'issue', { note: note.trim() }, 'Marked as sent')}>
                Mark sent
              </Button>
            </>
          }
        >
          <Field label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="PVR voucher, code sent on WhatsApp" />
        </Modal>
      )}
    </>
  )
}
