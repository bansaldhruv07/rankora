import { useApi } from './useApi'
import { ROUTES, readPath } from '../utils/routes'

// Where "See a free sample" should go: straight into the reader on the first published note that has
// free sample pages. Falls back to the notes list while loading or when no note offers a sample yet.
export function useSampleLink() {
  const { data } = useApi('/products?limit=50&sort=featured')
  const withSample = data?.find((product) => product.previewPageCount > 0)
  return withSample ? readPath(withSample.slug, { preview: true }) : ROUTES.notes
}
