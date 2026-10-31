import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Maximize2, Minimize2, Minus, Moon, Plus, Sun } from 'lucide-react'
import { isSessionError, openDocument } from '../../lib/pdf'
import { cn } from '../../utils/cn'
import WatermarkLayer from './WatermarkLayer'

const ZOOM_STEPS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5, 3]
// Browsers cap canvas memory (iOS Safari is the tightest); stay well under the limit on every device.
const MAX_CANVAS_PIXELS = 12_000_000
const MAX_DPR = 2

const readFlag = (key) => {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
const writeFlag = (key, value) => {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* private mode */
  }
}

const Page = memo(function Page({ pdf, n, w, h, scale, render, watermark, night, zoom, registerEl, onSize, onError }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!render) {
      // Far from the viewport: release the bitmap so long documents stay light on phones.
      canvas.width = 0
      canvas.height = 0
      return undefined
    }
    let cancelled = false
    let task
    const buffer = document.createElement('canvas')
    ;(async () => {
      try {
        const page = await pdf.getPage(n)
        if (cancelled) return
        const natural = page.getViewport({ scale: 1 })
        onSize(n, natural.width, natural.height)
        let output = scale * Math.min(window.devicePixelRatio || 1, MAX_DPR)
        const pixels = natural.width * natural.height * output * output
        if (pixels > MAX_CANVAS_PIXELS) output *= Math.sqrt(MAX_CANVAS_PIXELS / pixels)
        const viewport = page.getViewport({ scale: output })
        // Draw off-screen, then swap in: zooming never flashes a blank page.
        buffer.width = Math.floor(viewport.width)
        buffer.height = Math.floor(viewport.height)
        task = page.render({ canvas: buffer, canvasContext: buffer.getContext('2d'), viewport, background: 'rgb(255,255,255)' })
        await task.promise
        if (cancelled) return
        canvas.width = buffer.width
        canvas.height = buffer.height
        canvas.getContext('2d').drawImage(buffer, 0, 0)
      } catch (error) {
        if (!cancelled && error?.name !== 'RenderingCancelledException') onError(error)
      } finally {
        buffer.width = 0
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pdf, n, scale, render, onSize, onError])

  return (
    <div ref={registerEl} data-page={n} className={cn('relative mx-auto mb-3 shadow-lift sm:mb-4', night ? 'bg-neutral-800' : 'bg-white')} style={{ width: w, height: h }}>
      <div aria-hidden="true" className={cn('absolute inset-0 animate-pulse', night ? 'bg-neutral-700' : 'bg-ivory-100')} />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" style={night ? { filter: 'invert(0.92) hue-rotate(180deg)' } : undefined} />
      <WatermarkLayer watermark={watermark} night={night} zoom={zoom} />
    </div>
  )
})

function IconButton({ label, onClick, disabled, active, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full text-ivory-100 transition hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent',
        active && 'bg-white/15',
        className,
      )}
    >
      {children}
    </button>
  )
}

export default function PdfViewer({ session, title, onBack, onPage, onExpired, onFatal, initialPage = 1, buyTo }) {
  const { token, watermark } = session
  const rootRef = useRef(null)
  const scrollerRef = useRef(null)
  const unlockRef = useRef(null)
  const pageEls = useRef(new Map())
  const observerRef = useRef(null)
  const anchorRef = useRef(null)
  const didInit = useRef(false)

  const [doc, setDoc] = useState(null)
  const [failed, setFailed] = useState(false)
  const [base, setBase] = useState(null)
  const [sizes, setSizes] = useState({})
  const [width, setWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [current, setCurrent] = useState(initialPage)
  const [near, setNear] = useState(() => new Set([initialPage]))
  const [night, setNight] = useState(() => readFlag('rk-reader-night'))
  const [fullscreen, setFullscreen] = useState(false)
  const [typedPage, setTypedPage] = useState(null)

  // The file holds the pages the student may read. In a free sample the note is longer than the file;
  // the counter shows the full length and an unlock panel follows the last free page.
  const numPages = doc?.pdf.numPages ?? session.document.pages
  const totalPages = Math.max(session.document.totalPages ?? numPages, numPages)
  const isSample = totalPages > numPages

  // Open the document through the authorised stream.
  useEffect(() => {
    let cancelled = false
    let task
    ;(async () => {
      try {
        const opened = await openDocument(token)
        task = opened.task
        const pdf = await opened.promise
        const first = await pdf.getPage(1)
        const viewport = first.getViewport({ scale: 1 })
        if (cancelled) return
        setBase({ w: viewport.width, h: viewport.height })
        setDoc({ pdf, pdfjs: opened.pdfjs })
      } catch (error) {
        if (cancelled) return
        if (isSessionError(error)) onExpired?.()
        else {
          setFailed(true)
          onFatal?.(error)
        }
      }
    })()
    return () => {
      cancelled = true
      task?.destroy()
    }
  }, [token, onExpired, onFatal])

  // Track the scroller's width (rotation, window resize); keep the reader's place when it changes.
  useEffect(() => {
    const scroller = scrollerRef.current
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width)
      setWidth((prev) => {
        if (prev !== next && prev > 0) anchorRef.current = readAnchor(scroller, pageEls.current)
        return next
      })
    })
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  const gutter = width < 640 ? 10 : 32
  const fitScale = base && width ? Math.max(0.1, (width - gutter * 2) / base.w) : 1
  const scale = fitScale * zoom
  const dims = useCallback(
    (n) => {
      const s = sizes[n] ?? base
      return s ? { w: s.w * scale, h: s.h * scale } : { w: 0, h: 0 }
    },
    [sizes, base, scale],
  )

  // After a zoom or resize, put the reader back at the same spot in the same page.
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    anchorRef.current = null
    const el = pageEls.current.get(anchor.n)
    if (el) scrollerRef.current.scrollTop = el.offsetTop + anchor.ratio * el.offsetHeight
  }, [scale, width])

  // Which pages are close enough to the viewport to be worth drawing.
  useEffect(() => {
    if (!doc) return undefined
    const visible = new Set()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const n = Number(entry.target.dataset.page)
          if (entry.isIntersecting) visible.add(n)
          else visible.delete(n)
        }
        setNear(new Set(visible))
      },
      { root: scrollerRef.current, rootMargin: '120% 0px 120% 0px' },
    )
    observerRef.current = observer
    pageEls.current.forEach((el) => observer.observe(el))
    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [doc])

  const registerEl = useCallback(
    (n) => (el) => {
      const prev = pageEls.current.get(n)
      if (prev && prev !== el) observerRef.current?.unobserve(prev)
      if (el) {
        pageEls.current.set(n, el)
        observerRef.current?.observe(el)
      } else pageEls.current.delete(n)
    },
    [],
  )

  const onSize = useCallback((n, w, h) => {
    setSizes((prev) => (prev[n] && prev[n].w === w && prev[n].h === h ? prev : { ...prev, [n]: { w, h } }))
  }, [])
  const onError = useCallback(
    (error) => {
      if (isSessionError(error)) onExpired?.()
    },
    [onExpired],
  )

  // Pages beyond the free ones lead to the unlock panel rather than to a page.
  const goToPage = useCallback(
    (n, smooth = true) => {
      const behavior = smooth ? 'smooth' : 'auto'
      const wanted = Math.round(n)
      if (isSample && wanted > numPages) {
        unlockRef.current?.scrollIntoView({ behavior, block: 'center' })
        return
      }
      const el = pageEls.current.get(Math.min(Math.max(1, wanted), numPages))
      if (el) scrollerRef.current.scrollTo({ top: el.offsetTop - 8, behavior })
    },
    [numPages, isSample],
  )

  // Resume position: jump to the saved page once the layout exists.
  useLayoutEffect(() => {
    if (didInit.current || !base || !width) return
    didInit.current = true
    goToPage(initialPage, false)
  }, [base, width, initialPage, goToPage])

  // Current page = the one under the top third of the screen.
  useEffect(() => {
    const scroller = scrollerRef.current
    let frame = 0
    const update = () => {
      frame = 0
      if (!didInit.current) return
      const line = scroller.scrollTop + scroller.clientHeight * 0.35
      let found = 1
      for (const [n, el] of pageEls.current) if (el.offsetTop <= line && n >= found) found = n
      setCurrent(found)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [doc])

  useEffect(() => {
    if (didInit.current) onPage?.(current)
  }, [current, onPage])

  const changeZoom = useCallback((next) => {
    anchorRef.current = readAnchor(scrollerRef.current, pageEls.current)
    setZoom(next)
  }, [])
  const zoomIn = () => changeZoom(ZOOM_STEPS.find((z) => z > zoom + 0.01) ?? zoom)
  const zoomOut = () => changeZoom([...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.01) ?? zoom)

  const toggleNight = () =>
    setNight((value) => {
      writeFlag('rk-reader-night', !value)
      return !value
    })

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else rootRef.current?.requestFullscreen?.().catch(() => {})
  }
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Deterrents: no context menu, drag, save or print shortcuts. (These cannot stop screenshots.)
  useEffect(() => {
    const onKey = (event) => {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (mod && (key === 's' || key === 'p')) event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pagesList = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages])
  // One stable ref callback per page, so React does not re-attach refs on every render.
  const refCallbacks = useMemo(() => pagesList.map((n) => registerEl(n)), [pagesList, registerEl])
  const pct = totalPages > 1 ? ((current - 1) / (totalPages - 1)) * 100 : 100
  const lastReadable = current >= numPages

  const controls = (
    <div className="flex items-center gap-0.5 text-ivory-50">
      <IconButton label="Zoom out" onClick={zoomOut} disabled={!doc || zoom <= ZOOM_STEPS[0]}>
        <Minus size={18} aria-hidden="true" />
      </IconButton>
      <button type="button" onClick={() => changeZoom(1)} aria-label="Fit to width" title="Fit to width" className="tabular h-10 min-w-12 rounded-full px-2 text-sm font-semibold hover:bg-white/10">
        {Math.round(zoom * 100)}%
      </button>
      <IconButton label="Zoom in" onClick={zoomIn} disabled={!doc || zoom >= ZOOM_STEPS.at(-1)}>
        <Plus size={18} aria-hidden="true" />
      </IconButton>
      <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-white/20" />
      <IconButton label="Previous page" onClick={() => goToPage(current - 1)} disabled={!doc || current <= 1}>
        <ChevronLeft size={19} aria-hidden="true" />
      </IconButton>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const n = Number.parseInt(typedPage ?? '', 10)
          if (Number.isFinite(n)) goToPage(n)
          setTypedPage(null)
        }}
        className="flex items-center gap-1 text-sm"
      >
        <label className="sr-only" htmlFor="reader-page">
          Page number
        </label>
        <input
          id="reader-page"
          inputMode="numeric"
          value={typedPage ?? String(current)}
          onChange={(e) => setTypedPage(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onFocus={(e) => e.target.select()}
          onBlur={() => setTypedPage(null)}
          className="tabular h-8 w-11 rounded-md border border-white/20 bg-white/10 text-center font-semibold text-ivory-50 focus:border-ember-400 focus:outline-none"
        />
        <span className="tabular pr-1 text-ivory-300">/ {totalPages}</span>
      </form>
      <IconButton label="Next page" onClick={() => goToPage(current + 1)} disabled={!doc || (lastReadable && !isSample)}>
        <ChevronRight size={19} aria-hidden="true" />
      </IconButton>
    </div>
  )

  return (
    <div ref={rootRef} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} className="reader-root fixed inset-0 z-40 flex select-none flex-col bg-black">
      <header className="relative shrink-0 bg-neutral-950 pt-[env(safe-area-inset-top)] text-ivory-50 shadow-lift">
        <div className="flex min-h-14 flex-wrap items-center gap-1 px-2 sm:px-4">
          <IconButton label="Back" onClick={onBack}>
            <ArrowLeft size={20} aria-hidden="true" />
          </IconButton>
          <h1 className="min-w-0 flex-1 truncate px-1 font-display text-base font-medium text-ivory-50 sm:max-w-[26%] sm:text-lg">{title}</h1>
          {/* Centred in the header on wide screens; on phones it sits on its own row beneath. */}
          <div className="order-last flex basis-full justify-center pb-2 sm:pointer-events-none sm:absolute sm:inset-x-0 sm:top-[env(safe-area-inset-top)] sm:order-none sm:h-14 sm:basis-auto sm:items-center sm:pb-0">
            <div className="sm:pointer-events-auto">{controls}</div>
          </div>
          <span className="hidden flex-1 sm:block" />
          <IconButton label={night ? 'Switch to day mode' : 'Switch to night mode'} onClick={toggleNight} active={night}>
            {night ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </IconButton>
          {typeof document !== 'undefined' && document.fullscreenEnabled && (
            <IconButton label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={toggleFullscreen} className="hidden sm:grid">
              {fullscreen ? <Minimize2 size={19} aria-hidden="true" /> : <Maximize2 size={19} aria-hidden="true" />}
            </IconButton>
          )}
        </div>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
          <span className="block h-full bg-ember-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </span>
      </header>

      <div ref={scrollerRef} tabIndex={0} aria-label="Document pages" className="relative min-h-0 flex-1 overflow-auto overscroll-contain outline-none [-webkit-touch-callout:none]">
        {doc && base ? (
          <div className="mx-auto w-max min-w-full py-3 sm:py-5" style={{ paddingInline: gutter }}>
            {pagesList.map((n) => {
              const { w, h } = dims(n)
              return (
                <Page
                  key={n}
                  n={n}
                  pdf={doc.pdf}
                  w={w}
                  h={h}
                  scale={scale}
                  zoom={zoom}
                  render={near.has(n) || n === current}
                  watermark={watermark}
                  night={night}
                  registerEl={refCallbacks[n - 1]}
                  onSize={onSize}
                  onError={onError}
                />
              )
            })}
            {isSample && (
              <div ref={unlockRef} className="mx-auto mb-3 grid place-items-center rounded-lg border border-white/10 bg-neutral-900 px-6 py-14 text-center text-ivory-50" style={{ width: dims(1).w }}>
                <div className="max-w-sm">
                  <Lock size={26} aria-hidden="true" className="mx-auto text-ember-400" />
                  <h2 className="mt-4 font-display text-2xl font-semibold text-ivory-50">Unlock the full notes</h2>
                  <p className="mt-2 leading-relaxed text-ivory-300">
                    You have read the {numPages === 1 ? 'free page' : `${numPages} free pages`}. The full notes run to {totalPages} pages.
                  </p>
                  {buyTo && (
                    <Link to={buyTo} className="mt-6 inline-flex h-12 items-center rounded-full bg-ember-500 px-7 font-semibold text-white hover:bg-ember-600">
                      Unlock the full notes
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          !failed && (
            <div className="grid h-full place-items-center px-6 text-center text-ivory-200">
              <div role="status">
                <span aria-hidden="true" className="mx-auto block size-10 animate-spin rounded-full border-2 border-white/20 border-t-ember-400" />
                <p className="mt-4 font-display text-lg text-ivory-50">Opening your notes…</p>
                <p className="mt-1 text-sm">Only the pages you read are loaded.</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function readAnchor(scroller, els) {
  let best = null
  for (const [n, el] of els) if (el.offsetTop <= scroller.scrollTop + 1 && (!best || n > best.n)) best = { n, el }
  if (!best) return null
  return { n: best.n, ratio: (scroller.scrollTop - best.el.offsetTop) / Math.max(1, best.el.offsetHeight) }
}
