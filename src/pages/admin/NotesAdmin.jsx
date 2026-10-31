import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Layers, Plus, Trash2, UploadCloud } from 'lucide-react'
import { Confirm, ErrorNote, Pager, PageTitle, StatusBadge, Table, INPUT } from '../../components/admin/ui'
import UploadPanel from '../../components/admin/UploadPanel'
import ProductCover from '../../components/store/ProductCover'
import Button from '../../components/ui/Button'
import { Tabs } from '../../components/ui/Tabs'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { CLASS_LABELS, formatPrice } from '../../utils/format'

const selectClass = `${INPUT} sm:w-auto`

export default function NotesAdmin() {
  const toast = useToast()
  const navigate = useNavigate()
  const [kind, setKind] = useState('note')
  const [filters, setFilters] = useState({ q: '', status: '', subject: '', classLevel: '', sort: 'priority' })
  const [page, setPage] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const path = useMemo(() => {
    const p = new URLSearchParams({ kind, page: String(page), limit: '25', sort: filters.sort })
    for (const key of ['q', 'status', 'subject', 'classLevel']) if (filters[key]) p.set(key, filters[key])
    return `/admin/products?${p}`
  }, [kind, page, filters])
  const { data, meta, error, loading, reload } = useApi(path)
  const rows = data ?? []

  const setFilter = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }))
    setPage(1)
    setSelected(new Set())
  }

  const act = async (ids, action) => {
    setBusy(true)
    let failed = []
    for (const id of ids) {
      try {
        if (action === 'delete') await api(`/admin/products/${id}`, { method: 'DELETE' })
        else await api(`/admin/products/${id}/${action}`, { method: 'POST' })
      } catch (err) {
        failed.push(`${rows.find((r) => r.id === id)?.title ?? id}: ${err.message}`)
      }
    }
    setBusy(false)
    setConfirm(null)
    setSelected(new Set())
    reload()
    if (failed.length) toast({ title: `${ids.length - failed.length} of ${ids.length} done`, description: failed[0], tone: 'info', duration: 7000 })
    else toast({ title: `${ids.length} ${ids.length === 1 ? 'item' : 'items'} ${action === 'delete' ? 'deleted' : 'updated'}` })
  }

  const newBundle = async () => {
    try {
      const { data: created } = await api('/admin/products', { method: 'POST', body: { title: 'New bundle', kind: 'bundle', price: 0 } })
      navigate(`/admin/notes/${created.id}`)
    } catch (err) {
      toast({ title: err.message, tone: 'info' })
    }
  }

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  const columns = [
    {
      key: 'select',
      label: '',
      render: (r) => <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.title}`} className="size-4 accent-[#c2571a]" />,
    },
    {
      key: 'title',
      label: 'Title',
      render: (r) => (
        <div className="flex min-w-[15rem] items-center gap-3">
          <div className="w-9 shrink-0">
            <ProductCover product={r} compact />
          </div>
          <div className="min-w-0">
            <Link to={`/admin/notes/${r.id}`} className="block truncate font-medium text-ink-900 hover:text-ember-600">
              {r.title}
            </Link>
            <p className="truncate font-mono text-[0.7rem] text-ink-400">/{r.slug}</p>
          </div>
        </div>
      ),
    },
    { key: 'subject', label: 'Subject · class', render: (r) => <span className="capitalize">{[r.subject, r.classLevel && CLASS_LABELS[r.classLevel]].filter(Boolean).join(' · ') || <em className="text-ink-400">not set</em>}</span> },
    { key: 'pages', label: kind === 'bundle' ? 'Notes' : 'Pages', align: 'right', render: (r) => (kind === 'bundle' ? r.bundleItemIds.length : r.pages ?? '–') },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      render: (r) => (
        <span>
          {formatPrice(r.price)}
          {r.mrp ? <s className="ml-1.5 text-xs text-ink-400">{formatPrice(r.mrp)}</s> : null}
        </span>
      ),
    },
    { key: 'views', label: 'Views', align: 'right', render: (r) => r.viewCount },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.hasFile && (
            <Button to={`/admin/read/${r.id}`} size="sm" variant="ghost" icon={Eye} aria-label={`Preview ${r.title}`}>
              Preview
            </Button>
          )}
          {r.status === 'published' ? (
            <Button size="sm" variant="outline" onClick={() => act([r.id], 'unpublish')} disabled={busy}>
              Unpublish
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => act([r.id], 'publish')} disabled={busy}>
              Publish
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={Trash2} className="text-danger-500" aria-label={`Delete ${r.title}`} onClick={() => setConfirm({ action: 'delete', label: 'Delete', danger: true, ids: [r.id] })} disabled={busy} />
        </div>
      ),
    },
  ]

  return (
    <>
      <PageTitle title="Notes & bundles" description="Upload PDFs, set prices, and decide what students can see.">
        {kind === 'note' ? (
          <Button variant="accent" icon={UploadCloud} onClick={() => setUploading(true)}>
            Upload PDFs
          </Button>
        ) : (
          <Button variant="accent" icon={Plus} onClick={newBundle}>
            New bundle
          </Button>
        )}
      </PageTitle>

      {uploading && kind === 'note' && (
        <div className="mb-8">
          <UploadPanel onDone={reload} onClose={() => setUploading(false)} />
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'note', label: 'Notes' },
          { id: 'bundle', label: 'Bundles' },
        ]}
        value={kind}
        onChange={(id) => {
          setKind(id)
          setPage(1)
          setSelected(new Set())
        }}
        idPrefix="kind"
        label="Type"
      />

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <input type="search" aria-label="Search notes" placeholder="Search title, chapter, tag" value={filters.q} onChange={setFilter('q')} className={`${INPUT} sm:w-72`} />
        <select aria-label="Filter by status" value={filters.status} onChange={setFilter('status')} className={selectClass}>
          <option value="">Any status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select aria-label="Filter by subject" value={filters.subject} onChange={setFilter('subject')} className={selectClass}>
          <option value="">All subjects</option>
          <option value="physics">Physics</option>
          <option value="chemistry">Chemistry</option>
          <option value="mathematics">Mathematics</option>
          <option value="mixed">Mixed (PCM)</option>
        </select>
        <select aria-label="Filter by class" value={filters.classLevel} onChange={setFilter('classLevel')} className={selectClass}>
          <option value="">Any class</option>
          <option value="11">Class 11</option>
          <option value="12">Class 12</option>
          <option value="both">Both</option>
        </select>
        <select aria-label="Sort notes" value={filters.sort} onChange={setFilter('sort')} className={selectClass}>
          <option value="priority">Display order</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
          <option value="price">Price</option>
          <option value="views">Most viewed</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm text-ivory-50">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="sm" variant="accent" onClick={() => setConfirm({ action: 'publish', label: 'Publish' })}>
            Publish
          </Button>
          <Button size="sm" variant="soft" onClick={() => setConfirm({ action: 'unpublish', label: 'Unpublish' })}>
            Unpublish
          </Button>
          <Button size="sm" variant="soft" onClick={() => setConfirm({ action: 'archive', label: 'Archive' })}>
            Archive
          </Button>
          <Button size="sm" variant="soft" icon={Trash2} onClick={() => setConfirm({ action: 'delete', label: 'Delete', danger: true })}>
            Delete
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto underline underline-offset-4">
            Clear
          </button>
        </div>
      )}

      <div className="mt-4">
        <ErrorNote error={error} onRetry={reload} />
        {loading ? (
          <div className="h-64 animate-pulse rounded-xl bg-ivory-200" aria-busy="true" />
        ) : (
          data && (
            <>
              {rows.length > 0 && (
                <label className="mb-2 flex items-center gap-2 text-xs text-ink-600">
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} className="size-4 accent-[#c2571a]" />
                  Select all on this page
                </label>
              )}
              <Table
                columns={columns}
                rows={rows}
                empty={kind === 'note' ? 'No notes match. Use “Upload PDFs” to add your first ones.' : 'No bundles yet. A bundle sells several notes together at one price.'}
              />
              <Pager meta={meta} onPage={setPage} />
            </>
          )
        )}
      </div>

      {kind === 'bundle' && (
        <p className="mt-6 flex items-center gap-2 text-sm text-ink-600">
          <Layers size={15} aria-hidden="true" />
          A bundle can only be published once all of its notes are published.
        </p>
      )}

      <Confirm
        open={Boolean(confirm)}
        title={`${confirm?.label ?? ''} ${(confirm?.ids ?? [...selected]).length} ${(confirm?.ids ?? [...selected]).length === 1 ? 'item' : 'items'}?`}
        confirmLabel={confirm?.label}
        danger={confirm?.danger}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => act(confirm.ids ?? [...selected], confirm.action)}
      >
        {confirm?.action === 'publish' && 'Published items become visible and purchasable straight away.'}
        {confirm?.action === 'unpublish' && 'They disappear from the store. People who already bought them keep their access.'}
        {confirm?.action === 'archive' && 'They are taken off sale. People who already bought them keep their access.'}
        {confirm?.action === 'delete' && 'This permanently removes the item and its files. Anything that has been ordered cannot be deleted; archive it instead.'}
      </Confirm>
    </>
  )
}
