import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, RefreshCw, WifiOff } from 'lucide-react'
import Button from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useLightOnly } from '../../hooks/useTheme'
import { closeSession, saveProgress, saveProgressOnExit } from '../../lib/reader'
import PdfViewer from './PdfViewer'

// Owns the reading session: opens it, saves the last-read page, recovers when it ends, and frees it on exit.
// `openSession` returns the server's session payload; `backTo` is where the back button goes.
export default function ReaderScreen({ openSession, backTo, signInHint = 'Sign in to read your notes.', buyTo, trackProgress = true }) {
  useLightOnly()
  const navigate = useNavigate()
  const { user, loading, openAuth } = useAuth()
  const [state, setState] = useState({ phase: 'opening', session: null, error: null, startPage: 1 })
  const [attempt, setAttempt] = useState(0)
  const lastPage = useRef(1)
  const saved = useRef(0)
  const timer = useRef(0)
  const tokenRef = useRef(null)
  const modeRef = useRef('full')

  // Open (or reopen) the session.
  useEffect(() => {
    if (loading) return undefined
    let active = true
    openSession()
      .then((session) => {
        if (!active) {
          closeSession(session.token)
          return
        }
        tokenRef.current = session.token
        modeRef.current = session.mode
        // A resumed session continues where this one stopped; a fresh open uses the server's saved page.
        if (attempt === 0) lastPage.current = session.progress?.page ?? 1
        setState({ phase: 'ready', session, error: null, startPage: lastPage.current })
      })
      .catch((error) => active && setState({ phase: 'blocked', session: null, error }))
    return () => {
      active = false
    }
    // `user` is a dependency so signing in from the prompt retries automatically.
  }, [attempt, loading, user, openSession])

  // Free the session slot when leaving.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      if (tokenRef.current) closeSession(tokenRef.current)
    },
    [],
  )

  // Persist the page shortly after the reader stops moving, and immediately when the tab is hidden.
  const persist = useCallback(() => {
    if (!trackProgress || modeRef.current !== 'full' || !tokenRef.current || saved.current === lastPage.current) return
    saved.current = lastPage.current
    saveProgress(tokenRef.current, lastPage.current).catch(() => {})
  }, [trackProgress])

  const onPage = useCallback(
    (page) => {
      lastPage.current = page
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(persist, 1200)
    },
    [persist],
  )

  useEffect(() => {
    const flush = () => {
      if (!trackProgress || modeRef.current !== 'full' || !tokenRef.current) return
      saveProgressOnExit(tokenRef.current, lastPage.current)
    }
    const onVisibility = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [trackProgress])

  const onExpired = useCallback(() => setState((prev) => (prev.phase === 'ready' ? { ...prev, phase: 'expired' } : prev)), [])
  const onFatal = useCallback((error) => setState({ phase: 'blocked', session: null, error: Object.assign(error ?? new Error(), { fatal: true }) }), [])
  const reopen = () => {
    setState({ phase: 'opening', session: null, error: null })
    setAttempt((n) => n + 1)
  }
  const goBack = () => navigate(backTo)

  if (state.phase === 'ready' || state.phase === 'expired') {
    return (
      <>
        <PdfViewer
          key={`${state.session.sessionId}`}
          session={state.session}
          title={state.session.document.title}
          initialPage={state.startPage}
          onPage={onPage}
          onExpired={onExpired}
          onFatal={onFatal}
          onBack={goBack}
          buyTo={buyTo}
        />
        {state.phase === 'expired' && (
          <Notice icon={WifiOff} title="Your reading session ended" onBack={goBack} overlay>
            <p>
              For your security a reading session closes after a period of inactivity, when you sign out, or when the account is opened in more places than allowed.
            </p>
            <Button variant="accent" icon={RefreshCw} className="mt-6" onClick={reopen}>
              Resume reading
            </Button>
          </Notice>
        )}
      </>
    )
  }

  if (state.phase === 'opening') {
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-black px-6 text-center text-ivory-200">
        <div role="status">
          <span aria-hidden="true" className="mx-auto block size-10 animate-spin rounded-full border-2 border-white/20 border-t-ember-400" />
          <p className="mt-4 font-display text-lg text-ivory-50">Preparing your copy…</p>
          <p className="mt-1 text-sm">Adding your personal watermark.</p>
        </div>
      </div>
    )
  }

  const { error } = state
  if (error?.status === 401) {
    return (
      <Notice icon={Lock} title="Sign in to read" onBack={goBack}>
        <p>{signInHint}</p>
        <Button variant="accent" className="mt-6" onClick={() => openAuth('login')}>
          Sign in
        </Button>
      </Notice>
    )
  }
  if (error?.status === 403) {
    return (
      <Notice icon={Lock} title="This note is not in your library" onBack={goBack}>
        <p>Reading is available to the account that bought it.</p>
        {buyTo && (
          <Button to={buyTo} variant="accent" className="mt-6">
            See this note
          </Button>
        )}
      </Notice>
    )
  }
  return (
    <Notice icon={WifiOff} title={error?.status === 404 ? 'Document not found' : 'Could not open this document'} onBack={goBack}>
      <p>{error?.message ?? 'Something went wrong.'}</p>
      {error?.status !== 404 && (
        <Button variant="accent" icon={RefreshCw} className="mt-6" onClick={reopen}>
          Try again
        </Button>
      )}
    </Notice>
  )
}

function Notice({ icon: Icon, title, children, onBack, overlay = false }) {
  return (
    <div className={`fixed inset-0 z-50 grid place-items-center px-6 ${overlay ? 'bg-ink-950/80 backdrop-blur-sm' : 'bg-ivory-50'}`}>
      <div role="alert" className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-ember-50 text-ember-600">
          <Icon size={24} aria-hidden="true" />
        </span>
        <h1 className={`mt-5 text-2xl font-semibold ${overlay ? 'text-ivory-50' : ''}`}>{title}</h1>
        <div className={`mt-3 leading-relaxed ${overlay ? 'text-ivory-200' : 'text-ink-600'}`}>{children}</div>
        <button type="button" onClick={onBack} className={`mt-6 text-sm font-semibold underline underline-offset-4 ${overlay ? 'text-ivory-200' : 'text-ink-700'}`}>
          Go back
        </button>
      </div>
    </div>
  )
}
