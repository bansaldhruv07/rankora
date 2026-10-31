import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, FileUp, RotateCw, UploadCloud, X } from 'lucide-react'
import Button from '../ui/Button'
import { uploadFile } from '../../lib/api'
import { formatBytes } from '../../utils/format'
import { cn } from '../../utils/cn'
import { Field, Panel } from './ui'

const MAX_MB = 60 // matches the server default (MAX_PDF_MB); the server is the authority

function validate(file) {
  const looksPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!looksPdf) return 'Not a PDF file'
  if (file.size === 0) return 'The file is empty'
  if (file.size > MAX_MB * 1024 * 1024) return `Larger than ${MAX_MB} MB`
  return null
}

let counter = 0

// Uploads many PDFs one after another. Each becomes a draft note; details are filled in afterwards.
export default function UploadPanel({ onDone, onClose }) {
  const [defaults, setDefaults] = useState({ subject: '', classLevel: '', price: '' })
  const [items, setItems] = useState([])
  const [dragging, setDragging] = useState(false)
  const running = useRef(false)
  const inputRef = useRef(null)
  const itemsRef = useRef([])

  // The ref is the source of truth for the upload loop; state mirrors it for rendering.
  const commit = (next) => {
    itemsRef.current = next
    setItems(next)
  }
  const patch = (id, change) => commit(itemsRef.current.map((item) => (item.id === id ? { ...item, ...change } : item)))

  const query = () => {
    const p = new URLSearchParams()
    if (defaults.subject) p.set('subject', defaults.subject)
    if (defaults.classLevel) p.set('classLevel', defaults.classLevel)
    if (defaults.price !== '') p.set('price', defaults.price)
    const text = p.toString()
    return text ? `?${text}` : ''
  }

  async function run() {
    if (running.current) return
    running.current = true
    try {
      for (;;) {
        const next = itemsRef.current.find((item) => item.status === 'queued')
        if (!next) break
        patch(next.id, { status: 'uploading', progress: 0, error: '' })
        try {
          const json = await uploadFile(`/admin/products/upload${query()}`, next.file, {
            headers: { 'X-Filename': encodeURIComponent(next.file.name) },
            onProgress: (progress) => patch(next.id, { progress }),
          })
          patch(next.id, { status: 'done', progress: 1, product: json.data })
        } catch (err) {
          patch(next.id, { status: 'error', error: err.message })
        }
      }
    } finally {
      running.current = false
      onDone?.()
    }
  }

  const add = (fileList) => {
    const added = [...fileList].map((file) => {
      const problem = validate(file)
      counter += 1
      return { id: counter, file, status: problem ? 'error' : 'queued', progress: 0, error: problem ?? '' }
    })
    if (!added.length) return
    commit([...itemsRef.current, ...added])
    run()
  }

  const retry = (id) => {
    patch(id, { status: 'queued', error: '' })
    run()
  }
  const remove = (id) => commit(itemsRef.current.filter((item) => item.id !== id))

  const done = items.filter((i) => i.status === 'done').length
  const busy = items.some((i) => i.status === 'uploading' || i.status === 'queued')

  return (
    <Panel
      title="Upload PDFs"
      description="Pick one PDF or many. Each one becomes a draft you can edit and publish. Nothing is visible to students until you publish it."
      action={
        <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
          Close
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field as="select" label="Subject for these files" value={defaults.subject} onChange={(e) => setDefaults({ ...defaults, subject: e.target.value })}>
          <option value="">Set later</option>
          <option value="physics">Physics</option>
          <option value="chemistry">Chemistry</option>
          <option value="mathematics">Mathematics</option>
        </Field>
        <Field as="select" label="Class" value={defaults.classLevel} onChange={(e) => setDefaults({ ...defaults, classLevel: e.target.value })}>
          <option value="">Set later</option>
          <option value="11">Class 11</option>
          <option value="12">Class 12</option>
          <option value="both">Both</option>
        </Field>
        <Field label="Selling price (₹)" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Set later" value={defaults.price} onChange={(e) => setDefaults({ ...defaults, price: e.target.value })} />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          add(e.dataTransfer.files)
        }}
        className={cn('mt-5 grid place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition', dragging ? 'border-ember-500 bg-ember-50' : 'border-line bg-ivory-100/60')}
      >
        <UploadCloud size={30} aria-hidden="true" className="text-ink-500" />
        <p className="mt-3 font-medium text-ink-900">Drop PDFs here</p>
        <p className="mt-1 text-sm text-ink-600">PDF only, up to {MAX_MB} MB each. Page count and title are read from the file.</p>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="sr-only" aria-label="Choose PDF files" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        <Button variant="primary" icon={FileUp} className="mt-4" onClick={() => inputRef.current?.click()}>
          Choose files
        </Button>
      </div>

      {items.length > 0 && (
        <>
          <p role="status" className="mt-5 text-sm text-ink-600">
            {busy ? `Uploading… ${done} of ${items.length} done` : `${done} of ${items.length} uploaded`}
          </p>
          <ul className="mt-3 divide-y divide-line-soft rounded-xl border border-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{item.product?.title ?? item.file.name}</p>
                  <p className="text-xs text-ink-500">
                    {item.file.name} · {formatBytes(item.file.size)}
                    {item.product && ` · ${item.product.pages} pages`}
                  </p>
                  {item.status === 'uploading' && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ivory-200" role="progressbar" aria-valuenow={Math.round(item.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${item.file.name}`}>
                      <div className="h-full rounded-full bg-ember-500 transition-[width]" style={{ width: `${item.progress * 100}%` }} />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <p role="alert" className="mt-1 text-xs text-danger-500">
                      {item.error}
                    </p>
                  )}
                </div>
                {item.status === 'done' && (
                  <>
                    <Check size={17} aria-label="Uploaded" className="text-sage-600" />
                    <Link to={`/admin/notes/${item.product.id}`} className="text-sm font-semibold text-ember-600 underline-offset-4 hover:underline">
                      Edit details
                    </Link>
                  </>
                )}
                {item.status === 'queued' && <span className="text-xs text-ink-500">Waiting</span>}
                {item.status === 'error' && (
                  <div className="flex items-center gap-1">
                    {!/Not a PDF|empty|Larger/.test(item.error) && (
                      <Button size="sm" variant="outline" icon={RotateCw} onClick={() => retry(item.id)}>
                        Retry
                      </Button>
                    )}
                    <button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.file.name}`} className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-ivory-200">
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}
