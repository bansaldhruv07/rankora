import { ArrowRight } from 'lucide-react'
import ProductCard from '../store/ProductCard'
import Button from '../ui/Button'
import Reveal from '../ui/Reveal'
import SectionHeading from '../ui/SectionHeading'
import { useAuth } from '../../hooks/useAuth'
import { useApi } from '../../hooks/useApi'
import { ROUTES } from '../../utils/routes'

// Live from the catalogue: it shows what is actually on sale, and renders nothing until something is published.
// A mix of subjects, not one subject's run: the toughest chapters of each subject go first (they are what students go
// looking for), and the subjects then take turns: Physics, Chemistry, Maths, Physics, ...
const SUBJECT_ORDER = ['physics', 'chemistry', 'mathematics']

function mixSubjects(products, count) {
  const lanes = SUBJECT_ORDER.map((subject) => {
    const own = products.filter((p) => p.subject === subject)
    return [...own.filter((p) => p.difficulty === 'Hard'), ...own.filter((p) => p.difficulty !== 'Hard')]
  }).filter((lane) => lane.length > 0)
  const picked = []
  for (let round = 0; picked.length < count && lanes.some((lane) => lane[round]); round += 1) {
    for (const lane of lanes) if (lane[round] && picked.length < count) picked.push(lane[round])
  }
  return picked
}

export default function FeaturedNotes() {
  const { access } = useAuth()
  const { data: all } = useApi('/products?limit=100&sort=featured')
  const data = all && mixSubjects(all, 5)
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
