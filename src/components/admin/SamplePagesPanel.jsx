import { useState } from 'react'
import { Eye } from 'lucide-react'
import Button from '../ui/Button'
import { Confirm, INPUT } from './ui'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'

// One place to decide how much of every note students can read for free. Each note can still be set on its own page.
export default function SamplePagesPanel({ onDone }) {
  const toast = useToast()
  const [count, setCount] = useState('2')
  const [scope, setScope] = useState('all')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const n = Number(count)
  const valid = Number.isInteger(n) && n >= 0 && n <= 100

  const apply = async () => {
    setBusy(true)
    try {
      const { data } = await api('/admin/products/sample-pages', { method: 'POST', body: { count: n, scope } })
      toast({ title: 'Free samples updated', description: `${data.changed} of ${data.total} notes changed.` })
      onDone?.()
    } catch (err) {
      toast({ title: err.message, tone: 'info', duration: 6000 })
    }
    setBusy(false)
    setConfirming(false)
  }

  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Eye size={16} aria-hidden="true" className="text-ember-600" />
        Free sample for every note
      </p>
      <p className="mt-1 text-sm text-ink-600">Choose how many pages from the start of each note anyone can read before buying. A note always keeps at least one page locked. You can still set any note on its own page.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1.5 block text-xs font-medium text-ink-600">First pages (0 = no sample)</span>
          <input type="number" min="0" max="100" value={count} onChange={(e) => setCount(e.target.value)} className={`${INPUT} w-32`} />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-xs font-medium text-ink-600">Apply to</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={`${INPUT} w-60`}>
            <option value="all">Every note (replaces what is set)</option>
            <option value="empty">Only notes with no sample yet</option>
          </select>
        </label>
        <Button variant="accent" disabled={!valid || busy} onClick={() => setConfirming(true)}>
          Apply
        </Button>
      </div>
      <Confirm open={confirming} title={`Give ${n} free ${n === 1 ? 'page' : 'pages'} on ${scope === 'all' ? 'every note' : 'notes with no sample'}?`} confirmLabel="Apply" busy={busy} onClose={() => setConfirming(false)} onConfirm={apply}>
        {scope === 'all' ? 'This replaces the sample pages you set on individual notes.' : 'Notes that already have a sample are left alone.'} It takes effect straight away for everyone.
      </Confirm>
    </div>
  )
}
