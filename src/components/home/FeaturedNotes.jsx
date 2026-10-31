import { ArrowRight } from 'lucide-react'
import ProductCard from '../store/ProductCard'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { ROUTES } from '../../utils/routes'

// Live from the catalogue: it shows what is actually on sale, and renders nothing until something is published.
export default function FeaturedNotes() {
  const { access } = useAuth()
  const { data } = useApi('/products?limit=4&sort=featured')
  if (!data?.length) return null

  return (
    <section className="border-t border-line-soft bg-ivory-100/60 py-16 sm:py-20">
      <div className="page-container">
        <Reveal>
          <SectionHeading
            eyebrow="Notes library"
            title="Revision notes, read inside Rankora"
            description="Chapter-wise PDF notes you read in the Rankora reader, on your phone or laptop. It remembers your page."
          >
            <Button to={ROUTES.notes} variant="primary" iconRight={ArrowRight}>
              Browse all notes
            </Button>
          </SectionHeading>
        </Reveal>
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4 lg:gap-x-6">
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
