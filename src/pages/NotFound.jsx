import Button from '../components/ui/Button'
import { ROUTES } from '../utils/routes'

export default function NotFound() {
  return (
    <section className="page-container py-24 text-center sm:py-32">
      <p className="animate-rise font-mono text-xs font-medium uppercase tracking-[0.2em] text-ember-600">
        Error 404
      </p>
      <h1 className="animate-rise stagger mt-5 text-5xl font-semibold sm:text-6xl" style={{ '--d': '80ms' }}>
        We could not find that page
      </h1>
      <p
        className="animate-rise stagger mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink-600"
        style={{ '--d': '160ms' }}
      >
        The address may be mistyped or the page may have moved. Head back to somewhere useful.
      </p>
      <div className="animate-rise stagger mt-9 flex flex-wrap justify-center gap-3" style={{ '--d': '240ms' }}>
        <Button to={ROUTES.home} variant="accent" size="lg">
          Go to home
        </Button>
        <Button to={ROUTES.notes} variant="outline" size="lg">
          Browse notes
        </Button>
      </div>
    </section>
  )
}