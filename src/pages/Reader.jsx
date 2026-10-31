import { useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ReaderScreen from '../components/reader/ReaderScreen'
import { openReaderSession } from '../lib/reader'
import { ROUTES, notePath } from '../utils/routes'

// Full-screen reader for a purchased note (or its free sample with ?preview=1). Rendered outside the site layout.
export default function Reader() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const preview = params.get('preview') === '1'
  const open = useCallback(() => openReaderSession(slug, preview ? 'preview' : 'full'), [slug, preview])

  return (
    <ReaderScreen
      key={`${slug}-${preview}`}
      openSession={open}
      backTo={preview ? notePath(slug) : ROUTES.library}
      buyTo={notePath(slug)}
      trackProgress={!preview}
    />
  )
}
