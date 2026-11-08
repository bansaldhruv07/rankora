import { ArrowRight } from 'lucide-react'
import ProductCard from '../store/ProductCard'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { ROUTES } from '../../utils/routes'

// Live from the catalogue: it shows what is actually on sale, and renders nothing until something is published.
// The toughest chapters come first (they are what students go looking for), then the rest in book order.
export default function FeaturedNotes() {
  const { access } = useAuth()
  const { data: all } = useApi('/products?limit=50&sort=featured')
  const data = all && [...all.filter((p) => p.difficulty === 'Hard'), ...all.filter((p) => p.difficulty !== 'Hard')].slice(0, 5)
  if (!data?.length) return null

  return (
    <section className="border-y border-line-soft bg-ivory-100/60 py-12 sm:py-14">
      <div className="page-container">
        <Reveal>
          <SectionHeading eyebrow="Notes library" title="Start with a chapter you are weak in">

            <Button to={ROUTES.notes} variant="primary" iconRight={ArrowRight}>
              Browse all notes
            </Button>
          </SectionHeading>
        </Reveal>
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
          {data.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} owned={access.productSlugs.includes(product.slug) || (access.premium && product.premiumIncluded)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
