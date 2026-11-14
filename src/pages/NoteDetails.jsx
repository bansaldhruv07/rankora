import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, Check, ChevronRight, Eye, FileText, Lock, ShieldCheck, Smartphone } from 'lucide-react'
import BundleCard from '../components/store/BundleCard'
import PriceTag from '../components/store/PriceTag'
import ProductCard from '../components/store/ProductCard'
import ProductCover from '../components/store/ProductCover'
import AddToCartButton from '../components/cart/AddToCartButton'
import CheckoutModal from '../components/pricing/CheckoutModal'
import { DifficultyBadge, SubjectBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import WelcomeNote from '../components/pricing/WelcomeNote'
import BundleHighlights from '../components/store/BundleHighlights'
import EmptyState from '../components/ui/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useApi } from '../hooks/useApi'
import { CLASS_LABELS, formatPrice, pluralize } from '../utils/format'
import { ROUTES, notesPath, readPath } from '../utils/routes'
import { getSubjectTheme } from '../utils/subjectTheme'

function Section({ eyebrow, title, children, className = '' }) {
  return (
    <section className={`py-9 first:pt-0 ${className}`}>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Bullets({ items }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 leading-relaxed text-ink-700">
          <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-sage-600" />
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function NoteDetails() {
  const { slug } = useParams()
  const { data: product, error, loading } = useApi(`/products/${encodeURIComponent(slug)}`)

  if (loading) return <DetailSkeleton />
  if (error || !product) {
    return (
      <section className="page-container py-20">
        <EmptyState title={error?.status === 404 ? 'This note is not available' : 'Could not load this note'} description={error?.status === 404 ? 'It may have been renamed or taken off sale.' : error?.message}>
          <Button to={ROUTES.notes} variant="accent">
            Browse all notes
          </Button>
        </EmptyState>
      </section>
    )
  }
  return <Detail key={product.slug} product={product} />
}

function Detail({ product }) {
  const { user, access, openAuth } = useAuth()
  const [checkout, setCheckout] = useState({ open: false, key: 0 })
  const isBundle = product.kind === 'bundle'
  const theme = getSubjectTheme(product.subject)
  const owned = access.productSlugs.includes(product.slug) || (access.premium && product.premiumIncluded)
  const free = product.price === 0
  const { data: library } = useApi(owned && user ? '/library' : null)
  const progress = library?.items.find((item) => item.product.slug === product.slug)?.progress

  useEffect(() => {
    const previous = document.title
    document.title = `${product.title} · JEEdge`
    return () => {
      document.title = previous
    }
  }, [product.title])

  const buy = () => setCheckout((prev) => ({ open: true, key: prev.key + 1 }))
  const readLabel = progress ? `Continue reading · page ${progress.page}` : 'Start reading'
  const paragraphs = (product.description || '').split(/\n{2,}/).filter(Boolean)
  const items = product.items ?? []

  const facts = [
    ['Format', isBundle ? `${pluralize(items.length, 'note')}, read online` : 'PDF, read online in JEEdge'],
    product.pages > 0 && ['Length', pluralize(product.pages, 'page')],
    product.classLevel && ['Class', CLASS_LABELS[product.classLevel]],
    product.chapter && ['Chapter', product.chapter],
    product.difficulty && ['Level', product.difficulty],
  ].filter(Boolean)

  return (
    <>
      <div className="border-b border-line-soft bg-ivory-100/60">
        <div className="page-container py-8 sm:py-12">
          <nav aria-label="Breadcrumb" className="animate-fade">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
              <li>
                <Link to={ROUTES.notes} className="underline-offset-4 hover:text-ember-600 hover:underline">
                  Notes
                </Link>
              </li>
              {product.subject && product.subject !== 'mixed' && (
                <>
                  <ChevronRight size={14} aria-hidden="true" />
                  <li>
                    <Link to={notesPath({ subject: product.subject })} className="underline-offset-4 hover:text-ember-600 hover:underline">
                      {theme.label}
                    </Link>
                  </li>
                </>
              )}
              <ChevronRight size={14} aria-hidden="true" />
              <li aria-current="page" className="max-w-[14rem] truncate font-medium text-ink-800 sm:max-w-none">
                {product.title}
              </li>
            </ol>
          </nav>

          <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)_21rem] lg:gap-12">
            <div className="animate-rise mx-auto w-44 sm:w-52 lg:mx-0 lg:w-full">
              <ProductCover product={product} />
            </div>

            <div>
              <div className="animate-rise flex flex-wrap items-center gap-2">
                <SubjectBadge subject={product.subject} />
                {product.difficulty && <DifficultyBadge level={product.difficulty} />}
                {isBundle && <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold text-ivory-50">Bundle</span>}
              </div>
              <h1 className="animate-rise stagger mt-4 text-4xl font-semibold leading-[1.08] sm:text-5xl" style={{ '--d': '70ms' }}>
                {product.title}
              </h1>
              {product.summary && (
                <p className="animate-rise stagger mt-4 max-w-2xl text-lg leading-relaxed text-ink-600" style={{ '--d': '140ms' }}>
                  {product.summary}
                </p>
              )}
              <dl className="animate-rise stagger mt-7 grid max-w-xl grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-6" style={{ '--d': '210ms' }}>
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink-400">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-ink-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <aside aria-label="Purchase" className="animate-rise stagger lg:sticky lg:top-24 lg:self-start" style={{ '--d': '180ms' }}>
              <Card className="p-6 sm:p-7">
                {owned ? (
                  <>
                    <p className="inline-flex items-center gap-2 rounded-full bg-sage-100 px-3 py-1 text-sm font-semibold text-sage-700">
                      <Check size={14} aria-hidden="true" />
                      {isBundle ? 'Bundle in your library' : 'In your library'}
                    </p>
                    {isBundle ? (
                      <Button to={ROUTES.library} variant="accent" size="lg" className="mt-5 w-full">
                        Open my library
                      </Button>
                    ) : (
                      <Button to={readPath(product.slug)} variant="accent" size="lg" icon={BookOpen} className="mt-5 w-full">
                        {readLabel}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-400">Price</p>
                    <PriceTag product={product} size="lg" className="mt-1" />
                    {product.savings && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">
                        {isBundle ? `${formatPrice(product.savings.referencePrice)} if you bought these notes one by one. ` : ''}You save {formatPrice(product.savings.amount)}.
                      </p>
                    )}
                    <div className="mt-6 flex flex-col gap-3">
                      {free ? (
                        <Button to={readPath(product.slug)} variant="accent" size="lg" icon={BookOpen}>
                          Read for free
                        </Button>
                      ) : (
                        <>
                          <Button variant="accent" size="lg" icon={Lock} onClick={buy}>
                            Buy now · {formatPrice(product.price)}
                          </Button>
                          <AddToCartButton slug={product.slug} size="lg" />
                        </>
                      )}
                      {product.previewPageCount > 0 && (
                        <Button to={readPath(product.slug, { preview: true })} variant="outline" size="lg" icon={Eye}>
                          Read free sample · {pluralize(product.previewPageCount, 'page')}
                        </Button>
                      )}
                    </div>
                    {!free && <WelcomeNote className="mt-4" />}
                    {!user && !free && (
                      <p className="mt-4 text-sm text-ink-600">
                        You&apos;ll sign in or create an account at checkout.{' '}
                        <button type="button" onClick={() => openAuth('login')} className="font-semibold text-ember-600 underline-offset-4 hover:underline">
                          Sign in now
                        </button>
                      </p>
                    )}
                    <ul className="mt-6 space-y-2.5 border-t border-line-soft pt-5 text-sm text-ink-700">
                      <li className="flex gap-2.5">
                        <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-600" />
                        Access is instant once payment is verified
                      </li>
                      <li className="flex gap-2.5">
                        <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-600" />
                        Read on phone or laptop, your page is remembered
                      </li>
                      <li className="flex gap-2.5">
                        <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-600" />
                        Secure payment through Razorpay
                      </li>
                    </ul>
                    <p className="mt-5 flex items-center gap-2 border-t border-line-soft pt-4 text-xs text-ink-600">
                      <ShieldCheck size={15} aria-hidden="true" className="shrink-0 text-ember-600" />
                      Made by an IIT Delhi student and used in her own JEE prep
                    </p>
                  </>
                )}
              </Card>
            </aside>
          </div>
        </div>
      </div>

      <div className="page-container pb-28 pt-12 lg:pb-16">
        <div className="max-w-3xl divide-y divide-line-soft">
          {isBundle && <BundleHighlights items={items} subject={product.subject} />}

          {isBundle && items.length > 0 && (
            <Section eyebrow="In this bundle" title={`${pluralize(items.length, 'note')} you get`}>
              <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <ProductCard product={item} owned={access.productSlugs.includes(item.slug)} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {product.includes.length > 0 && (
            <Section eyebrow="What you receive" title="Inside this purchase">
              <Bullets items={product.includes} />
            </Section>
          )}

          {product.contents.length > 0 && (
            <Section eyebrow="Syllabus" title="Chapters and topics covered">
              <ol className="divide-y divide-line-soft rounded-2xl border border-line bg-surface">
                {product.contents.map((item, index) => (
                  <li key={item} className="flex items-baseline gap-5 px-5 py-3.5">
                    <span className="tabular font-mono text-sm text-ember-600">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-ink-800">{item}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {product.audience.length > 0 && (
            <Section eyebrow="Is it for you" title="Who should buy this">
              <Bullets items={product.audience} />
            </Section>
          )}

          {paragraphs.length > 0 && (
            <Section eyebrow="Revision" title="How it helps you revise">
              <div className="space-y-4 text-lg leading-relaxed text-ink-700">
                {paragraphs.map((text, index) => (
                  <p key={index}>{text}</p>
                ))}
              </div>
            </Section>
          )}

          {product.previewPageCount > 0 && !owned && (
            <Section eyebrow="Try before you buy" title="Read a free sample">
              <Card className="flex flex-col items-start gap-4 bg-ivory-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md leading-relaxed text-ink-700">
                  {pluralize(product.previewPageCount, 'page')} from this note, in the same reader you&apos;ll use after buying. No sign-in needed.
                </p>
                <Button to={readPath(product.slug, { preview: true })} variant="primary" icon={Eye}>
                  Open the sample
                </Button>
              </Card>
            </Section>
          )}

          <Section eyebrow="Reading" title="How reading works">
            <ul className="grid gap-5 sm:grid-cols-3">
              {[
                [FileText, 'In your browser', 'Notes open in the JEEdge reader with zoom, page jump and search. There is no file to manage.'],
                [Smartphone, 'Pick up where you left off', 'Your last page is saved to your account, on any device you sign in from.'],
                [ShieldCheck, 'Protected, not locked', 'Pages carry your name as a watermark, which discourages sharing. Downloads are turned off.'],
              ].map(([Icon, title, text]) => (
                <li key={title}>
                  <span className="grid size-10 place-items-center rounded-xl bg-ivory-200 text-ink-800">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-ink-600">
              Questions about payment or access? Read the{' '}
              <Link to={ROUTES.policies} className="font-semibold text-ember-600 underline-offset-4 hover:underline">
                policies
              </Link>
              .
            </p>
          </Section>
        </div>

        {!isBundle && product.bundles?.length > 0 && !owned && (
          <section className="mt-6 border-t border-line-soft pt-12">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">Better together</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Get this note in a bundle</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {product.bundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} owned={access.productSlugs.includes(bundle.slug)} />
              ))}
            </div>
          </section>
        )}

        {product.related?.length > 0 && (
          <section className="mt-6 border-t border-line-soft pt-12">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-ember-600">Keep going</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">More {theme.label} notes</h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:gap-x-6">
              {product.related.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} owned={access.productSlugs.includes(item.slug)} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {!owned && !free && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory-50/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <PriceTag product={product} />
            <div className="flex items-center gap-2">
              <AddToCartButton slug={product.slug} variant="soft" label="Add" />
              <Button variant="accent" icon={Lock} onClick={buy}>
                Buy now
              </Button>
            </div>
          </div>
        </div>
      )}

      <CheckoutModal
        key={checkout.key}
        open={checkout.open}
        onClose={() => setCheckout((prev) => ({ ...prev, open: false }))}
        slug={product.slug}
        title={product.title}
        kind={product.kind}
        itemCount={isBundle ? items.length : undefined}
        fallbackAmount={product.price}
      />
    </>
  )
}

function DetailSkeleton() {
  return (
    <div className="page-container animate-pulse py-12" aria-busy="true" aria-label="Loading note">
      <div className="h-4 w-48 rounded bg-ivory-200" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_1fr_21rem]">
        <div className="mx-auto aspect-[3/4] w-44 rounded bg-ivory-200 lg:w-full" />
        <div>
          <div className="h-6 w-40 rounded bg-ivory-200" />
          <div className="mt-5 h-12 w-3/4 rounded bg-ivory-200" />
          <div className="mt-4 h-5 w-2/3 rounded bg-ivory-200" />
        </div>
        <div className="h-64 rounded-2xl bg-ivory-200" />
      </div>
    </div>
  )
}
