import { useCallback, useSyncExternalStore } from 'react'
import { getSnapshot, subscribe, toggleBookmark } from '../utils/bookmarkStore'

export function useBookmarks() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const isBookmarked = useCallback((id) => ids.includes(id), [ids])
  return { ids, count: ids.length, isBookmarked, toggle: toggleBookmark }
}