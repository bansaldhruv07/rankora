import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, FileUp, ImagePlus, Trash2 } from 'lucide-react'
import { Confirm, ErrorNote, Field, Panel, StatusBadge, Toggle } from '../../components/admin/ui'
import ProductCover from '../../components/store/ProductCover'
import Button from '../../components/ui/Button'
import { useApi } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { api, uploadFile, API_BASE } from '../../lib/api'
import { formatBytes, formatLongDate, formatPrice } from '../../utils/format'

const DONE = { publish: 'Published', unpublish: 'Unpublished', archive: 'Archived' }
const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean)
const fromList = (list) => (list ?? []).join('\n')

// "1-3, 7" -> [1,2,3,7]; returns null when the text is not a valid page list.
function parsePages(text) {
  const out = new Set()
  for (const part of text.split(',').map((p) => p.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part)
    if (!m) return null
    const from = Number(m[1])
    const to = m[2] ? Number(m[2]) : from
    if (from < 1 || to < from || to - from > 60) return null
    for (let n = from; n <= to; n += 1) out.add(n)
  }
  return [...out].sort((a, b) => a - b)
}

const toForm = (p) => ({
  title: p.title,
  subject: p.subject ?? '',
  classLevel: p.classLevel ?? '',
  chapter: p.chapter ?? '',
  topic: p.topic ?? '',
  type: p.type === 'bundle' ? 'notes' : p.type,
  difficulty: p.difficulty ?? '',
  tags: (p.tags ?? []).join(', '),
  summary: p.summary ?? '',
  description: p.description ?? '',
  price: String(p.price),
  mrp: p.mrp == null ? '' : String(p.mrp),
  sortOrder: String(p.sortOrder ?? 0),
  premiumEligible: Boolean(p.premiumEligible),
  contents: fromList(p.contents),
  includes: fromList(p.includes),
  audience: fromList(p.audience),
  previewPages: (p.previewPages ?? []).join(', '),
  pages: p.pages == null ? '' : String(p.pages),
  bundleItems: p.bundleItemIds ?? [],
})

// Turns the form into the API body, or returns { errors } for fields that cannot be sent.
function toBody(f, product) {
  const errors = {}
  const price = Number(f.price)
  if (f.price.trim() === '' || !Number.isFinite(price) || price < 0) errors.price = 'Enter a price of 0 or more'
  let mrp = null
  if (f.mrp.trim() !== '') {
    mrp = Number(f.mrp)
    if (!Number.isFinite(mrp) || mrp < 0) errors.mrp = 'Enter a valid amount'
    else if (mrp < price) errors.mrp = 'Original price must be at least the selling price'
  }
  const preview = parsePages(f.previewPages)
  if (preview === null) errors.previewPages = 'Use page numbers like 1-3, 7'
  else if (product.file?.pages && preview.some((n) => n > product.file.pages)) errors.previewPages = `This PDF has ${product.file.pages} pages`
  if (f.title.trim().length < 2) errors.title = 'Enter a title'
  const body = {
    title: f.title.trim(),
    summary: f.summary.trim(),
    description: f.description.trim(),
    chapter: f.chapter.trim(),
    topic: f.topic.trim(),
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
    price,
    mrp,
    sortOrder: Math.max(0, Math.round(Number(f.sortOrder) || 0)),
    contents: lines(f.contents),
    includes: lines(f.includes),
    audience: lines(f.audience),
    difficulty: f.difficulty || null,
    pages: f.pages.trim() === '' ? null : Math.round(Number(f.pages)),
  }
  if (f.subject) body.subject = f.subject
  if (f.classLevel) body.classLevel = f.classLevel
  if (product.kind === 'note') {
    body.type = f.type
    body.premiumEligible = f.premiumEligible
    body.previewPages = preview ?? []
  }
  if (product.kind === 'bundle') body.bundleItems = f.bundleItems
  return { body, errors }
}

export default function NoteEditor() {
  const { id } = useParams()
  const { data: product, error, loading, reload } = useApi(`/admin/products/${id}`)
  if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-ivory-200" aria-busy="true" />
  if (error) return <ErrorNote error={error} onRetry={reload} />
  // Remount only when the note itself changes (another note, publish state, new PDF). Saving or changing the cover
  // must not rebuild the form, or whatever has been typed but not saved would be lost.
  return <Editor key={`${product.id}-${product.status}-${product.file?.version ?? 0}`} product={product} reload={reload} />
}

function Editor({ product, reload }) {
  const toast = useToast()
  const navigate = useNavigate()
  const isBundle = product.kind === 'bundle'
  const initial = useMemo(() => toForm(product), [product])
  const [form, setForm] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [upload, setUpload] = useState(null)
  const fileRef = useRef(null)
  const coverRef = useRef(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const parsedPreview = parsePages(form.previewPages)

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return undefined
    const handler = (e) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const save = async () => {
    const { body, errors } = toBody(form, product)
    setFieldErrors(errors)
    if (Object.keys(errors).length) return toast({ title: 'Fix the highlighted fields', tone: 'info' })
    setSaving(true)
    try {
      const { data: saved } = await api(`/admin/products/${product.id}`, { method: 'PATCH', body })
      setForm(toForm(saved))
      toast({ title: 'Saved' })
      reload()
    } catch (err) {
      setFieldErrors(Object.fromEntries((err.details ?? []).map((d) => [d.field, d.message])))
      toast({ title: err.message, description: err.details?.[0] ? `${err.details[0].field}: ${err.details[0].message}` : undefined, tone: 'info', duration: 6000 })
    } finally {
      setSaving(false)
    }
  }

  const post = async (action, label) => {
    setBusy(true)
    try {
      await api(`/admin/products/${product.id}/${action}`, { method: 'POST' })
      toast({ title: label })
      setConfirm(null)
      reload()
    } catch (err) {
      setConfirm(null)
      toast({ title: err.message, tone: 'info', duration: 7000 })
    } finally {
      setBusy(false)
    }
  }
  const destroy = async () => {
    setBusy(true)
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE' })
      toast({ title: 'Deleted' })
      navigate('/admin/notes')
    } catch (err) {
      setConfirm(null)
      toast({ title: err.message, tone: 'info', duration: 8000 })
    } finally {
      setBusy(false)
    }
  }

  const sendFile = async (file, path, label) => {
    if (!file) return
    setUpload({ label, progress: 0, error: '' })
    try {
      await uploadFile(path, file, { method: 'PUT', headers: { 'X-Filename': encodeURIComponent(file.name) }, onProgress: (progress) => setUpload((u) => ({ ...u, progress })) })
      setUpload(null)
      toast({ title: `${label} updated` })
      reload()
    } catch (err) {
      setUpload({ label, progress: 0, error: err.message })
    }
  }

  const missing = [
    !isBundle && !product.hasFile && 'Upload the PDF',
    !(form.subject || product.subject) && 'Choose a subject',
    !(form.classLevel || product.classLevel) && 'Choose a class',
    isBundle && product.bundleItemIds.length < 2 && 'Add at least two notes',
  ].filter(Boolean)

  return (
    <>
      <Link to="/admin/notes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ember-600">
        <ArrowLeft size={15} aria-hidden="true" />
        All notes
      </Link>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 shrink-0">
            <ProductCover product={{ ...product, ...form, price: Number(form.price) || 0, coverUrl: product.coverUrl }} compact />
          </div>
          <div>
            <h1 className="text-3xl font-semibold">{form.title || 'Untitled'}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-600">
              <StatusBadge status={product.status} />
              <span className="font-mono text-xs text-ink-400">/{product.slug}</span>
              {product.status === 'published' && (
                <Link to={`/notes/${product.slug}`} target="_blank" className="font-semibold text-ember-600 underline-offset-4 hover:underline">
                  View in store
                </Link>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.status === 'published' ? (
            <Button variant="outline" onClick={() => setConfirm({ action: 'unpublish', title: 'Unpublish this item?', label: 'Unpublish', text: 'It disappears from the store. People who already bought it keep their access.' })}>
              Unpublish
            </Button>
          ) : (
            <Button variant="accent" disabled={dirty || missing.length > 0} onClick={() => setConfirm({ action: 'publish', title: 'Publish this item?', label: 'Publish', text: 'Students will see it in the store and can buy it straight away.' })}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {product.status !== 'published' && (missing.length > 0 || dirty) && (
        <p className="mb-6 rounded-xl bg-ivory-100 px-4 py-3 text-sm text-ink-700">
          {dirty ? 'Save your changes, then publish. ' : ''}
          {missing.length > 0 && `Before publishing: ${missing.join(', ')}.`}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {!isBundle && (
            <Panel title="PDF file" description="The original is stored privately and is never served to anyone. Students only ever read a personalised copy.">
              {product.hasFile ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ivory-100 px-4 py-3">
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium text-ink-900">{product.file.originalName}</p>
                    <p className="text-ink-600">
                      {product.file.pages} pages · {formatBytes(product.file.size)} · version {product.file.version} · uploaded {formatLongDate(product.file.uploadedAt)}
                    </p>
                  </div>
                  <Button to={`/admin/read/${product.id}`} variant="outline" size="sm" icon={Eye}>
                    Preview in reader
                  </Button>
                </div>
              ) : (
                <p className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-700">No PDF yet. Upload one to enable publishing.</p>
              )}
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Choose a PDF" onChange={(e) => { sendFile(e.target.files[0], `/admin/products/${product.id}/file`, 'PDF'); e.target.value = '' }} />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm" icon={FileUp} onClick={() => fileRef.current?.click()} disabled={Boolean(upload && !upload.error)}>
                  {product.hasFile ? 'Replace PDF' : 'Upload PDF'}
                </Button>
                {product.hasFile && <p className="text-xs text-ink-500">Replacing keeps every purchase. Buyers read the new version straight away.</p>}
              </div>
              {upload && (
                <div className="mt-3" role="status">
                  {upload.error ? (
                    <p role="alert" className="text-sm text-danger-500">{upload.error}</p>
                  ) : (
                    <div className="h-1.5 overflow-hidden rounded-full bg-ivory-200" role="progressbar" aria-valuenow={Math.round(upload.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
                      <div className="h-full rounded-full bg-ember-500" style={{ width: `${upload.progress * 100}%` }} />
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          <Panel title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2" label="Title" value={form.title} onChange={set('title')} maxLength={160} error={fieldErrors.title} />
              <Field as="select" label="Subject" value={form.subject} onChange={set('subject')}>
                <option value="">Choose…</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="mathematics">Mathematics</option>
                <option value="mixed">Mixed (PCM)</option>
              </Field>
              <Field as="select" label="Class" value={form.classLevel} onChange={set('classLevel')}>
                <option value="">Choose…</option>
                <option value="11">Class 11</option>
                <option value="12">Class 12</option>
                <option value="both">Both 11 &amp; 12</option>
              </Field>
              {!isBundle && <Field label="Chapter" value={form.chapter} onChange={set('chapter')} maxLength={120} hint="Used for chapter-wise browsing. Keep the name identical across notes of the same chapter." />}
              {!isBundle && <Field label="Topic (optional)" value={form.topic} onChange={set('topic')} maxLength={120} />}
              {!isBundle && (
                <Field as="select" label="Kind of notes" value={form.type} onChange={set('type')}>
                  <option value="notes">Short notes</option>
                </Field>
              )}
              <Field as="select" label="Difficulty" value={form.difficulty} onChange={set('difficulty')}>
                <option value="">Not set</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </Field>
              {!isBundle && <Field label="Number of pages" type="number" min="1" value={form.pages} onChange={set('pages')} hint="Filled from the PDF. Change only if you want a different number shown." error={fieldErrors.pages} />}
              <Field label="Tags" value={form.tags} onChange={set('tags')} hint="Comma separated, e.g. mechanics, revision, jee-main" error={fieldErrors.tags} />
              <Field className="sm:col-span-2" as="textarea" rows={2} label="Short description" value={form.summary} onChange={set('summary')} maxLength={1000} hint="One or two sentences shown on cards and at the top of the page." />
              <Field className="sm:col-span-2" as="textarea" rows={7} label="Detailed description" value={form.description} onChange={set('description')} maxLength={8000} hint="How these notes help revision. Separate paragraphs with a blank line. Plain text only." />
            </div>
          </Panel>

          <Panel title="Page content" description="These lists build the product page. Write one item per line. Empty sections are hidden.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field as="textarea" rows={7} label="What the student receives" value={form.includes} onChange={set('includes')} />
              <Field as="textarea" rows={7} label="Who should buy this" value={form.audience} onChange={set('audience')} />
              <Field className="md:col-span-2" as="textarea" rows={8} label="Chapters and topics covered" value={form.contents} onChange={set('contents')} />
            </div>
          </Panel>

          {isBundle && <BundleItems form={form} setForm={setForm} price={Number(form.price) || 0} />}

          {!isBundle && (
            <Panel title="Free sample" description="Pages anyone can read before buying. They open in the real reader, stamped “SAMPLE”.">
              <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Quick choices for the free sample">
                <span className="text-sm text-ink-600">Quick choice:</span>
                {[0, 1, 2, 3, 5].map((n) => {
                  const limit = product.file?.pages ? Math.min(n, product.file.pages - 1) : n
                  const value = Array.from({ length: limit }, (_, i) => i + 1).join(', ')
                  const active = form.previewPages.replace(/\s/g, '') === value.replace(/\s/g, '')
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setForm((f) => ({ ...f, previewPages: value }))}
                      className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${active ? 'border-ember-500 bg-ember-500 text-white' : 'border-line text-ink-700 hover:border-ember-500'}`}
                    >
                      {n === 0 ? 'No sample' : `First ${n}`}
                    </button>
                  )
                })}
              </div>
              <Field label="Sample pages" value={form.previewPages} onChange={set('previewPages')} placeholder="e.g. 1-3, 7" error={fieldErrors.previewPages} hint={parsedPreview ? `${parsedPreview.length} ${parsedPreview.length === 1 ? 'page' : 'pages'} will be free.` : 'Use page numbers like 1-3, 7'} />
              {product.hasFile && product.previewPages.length > 0 && !dirty && (
                <Button to={`/admin/read/${product.id}?sample=1`} variant="outline" size="sm" icon={Eye} className="mt-4">
                  See what students see
                </Button>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Price">
            <div className="space-y-4">
              <Field label="Selling price (₹)" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set('price')} error={fieldErrors.price} hint="What the student pays. 0 makes it free to read." />
              <Field label="Original price (₹)" type="number" min="0" step="0.01" inputMode="decimal" value={form.mrp} onChange={set('mrp')} error={fieldErrors.mrp} hint="Optional. A “Save x%” badge appears only when this is higher than the selling price, so use a price you really charged or list." />
              {isBundle && <p className="text-xs text-ink-500">A bundle also shows a saving against its notes’ own prices, calculated automatically.</p>}
              <Field label="Display priority" type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} hint="Lower numbers appear first." />
              {!isBundle && <Toggle label="Include in Premium plan" hint="On by default: Premium subscribers get it without buying. Turn off to sell it only on its own." checked={form.premiumEligible} onChange={(v) => setForm((f) => ({ ...f, premiumEligible: v }))} />}
            </div>
          </Panel>

          <Panel title="Cover image" description="Optional. Without one, a designed cover is generated from the title and subject.">
            <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Choose a cover image" onChange={(e) => { sendFile(e.target.files[0], `/admin/products/${product.id}/cover`, 'Cover'); e.target.value = '' }} />
            {product.hasCover && <img src={`${API_BASE}/admin/products/${product.id}/cover?v=${product.updatedAt}`} alt="Current cover" className="mb-3 max-h-48 rounded-md border border-line" />}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={ImagePlus} onClick={() => coverRef.current?.click()}>
                {product.hasCover ? 'Replace image' : 'Upload image'}
              </Button>
              {product.hasCover && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await api(`/admin/products/${product.id}/cover`, { method: 'DELETE' })
                    reload()
                  }}
                >
                  Use generated cover
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-ink-500">PNG, JPEG or WebP, 3:4 portrait works best. Max 2 MB.</p>
          </Panel>

          <Panel title="Availability">
            <p className="text-sm text-ink-600">
              {product.status === 'published' && 'On sale now.'}
              {product.status === 'draft' && 'Draft: not visible to students.'}
              {product.status === 'archived' && 'Archived: off sale. Existing buyers keep access.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {product.status !== 'archived' && (
                <Button variant="outline" size="sm" onClick={() => setConfirm({ action: 'archive', title: 'Archive this item?', label: 'Archive', text: 'It is taken off sale. People who already bought it keep their access.' })}>
                  Archive
                </Button>
              )}
              <Button variant="ghost" size="sm" icon={Trash2} className="text-danger-500" onClick={() => setConfirm({ action: 'delete', title: 'Delete permanently?', label: 'Delete', danger: true, text: 'This removes the item and its files. It is only possible if nobody has ordered it; otherwise archive it instead.' })}>
                Delete
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-line bg-ivory-50/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <p role="status" className="text-sm text-ink-600">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!dirty || saving} onClick={() => { setForm(initial); setFieldErrors({}) }}>
            Discard
          </Button>
          <Button variant="accent" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      <Confirm
        open={Boolean(confirm)}
        title={confirm?.title ?? ''}
        confirmLabel={confirm?.label}
        danger={confirm?.danger}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm.action === 'delete' ? destroy() : post(confirm.action, DONE[confirm.action]))}
      >
        {confirm?.text}
      </Confirm>
    </>
  )
}

function BundleItems({ form, setForm, price }) {
  const [q, setQ] = useState('')
  const { data } = useApi('/admin/products?kind=note&limit=100&sort=title')
  const notes = (data ?? []).filter((n) => n.title.toLowerCase().includes(q.toLowerCase()))
  const chosen = (data ?? []).filter((n) => form.bundleItems.includes(n.id))
  const separate = chosen.reduce((sum, n) => sum + n.price, 0)
  const toggle = (id) => setForm((f) => ({ ...f, bundleItems: f.bundleItems.includes(id) ? f.bundleItems.filter((x) => x !== id) : [...f.bundleItems, id] }))

  return (
    <Panel title="Notes in this bundle" description="Buyers get every note listed here. Notes you add later are given to existing buyers; removing one never takes access away.">
      <input type="search" aria-label="Find a note" placeholder="Find a note" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm focus:border-ember-500 focus:outline-none focus:ring-4 focus:ring-ember-500/15" />
      <ul className="max-h-80 divide-y divide-line-soft overflow-y-auto rounded-xl border border-line">
        {notes.map((n) => (
          <li key={n.id}>
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-ivory-100">
              <input type="checkbox" checked={form.bundleItems.includes(n.id)} onChange={() => toggle(n.id)} className="size-4 accent-[#c2571a]" />
              <span className="min-w-0 flex-1 truncate text-sm">{n.title}</span>
              <StatusBadge status={n.status} />
              <span className="tabular w-16 text-right text-sm text-ink-600">{formatPrice(n.price)}</span>
            </label>
          </li>
        ))}
        {data && notes.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-500">No notes found.</li>}
      </ul>
      <p className="mt-4 rounded-xl bg-ivory-100 px-4 py-3 text-sm text-ink-700" role="status">
        {chosen.length} selected · sold separately {formatPrice(separate)} · bundle price {formatPrice(price)}
        {separate > price && price > 0 ? ` · students save ${formatPrice(separate - price)} (${Math.round(((separate - price) / separate) * 100)}%)` : separate > 0 ? ' · no saving at this price' : ''}
      </p>
    </Panel>
  )
}
