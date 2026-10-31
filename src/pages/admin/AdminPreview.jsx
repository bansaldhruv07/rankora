import { useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ReaderScreen from '../../components/reader/ReaderScreen'
import { api } from '../../lib/api'

// Staff proof a note in the real reader (drafts included), or see exactly the free sample students get.
export default function AdminPreview() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const sample = params.get('sample') === '1'
  const open = useCallback(
    () => api(`/admin/products/${id}/preview-session${sample ? '?sample=1' : ''}`, { method: 'POST' }).then((json) => json.data),
    [id, sample],
  )
  return <ReaderScreen key={`${id}-${sample}`} openSession={open} backTo={`/admin/notes/${id}`} trackProgress={false} signInHint="Sign in to Rankora Studio to preview." />
}
