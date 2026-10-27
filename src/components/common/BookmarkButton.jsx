import { Bookmark } from 'lucide-react'
import { useBookmarks } from '../../hooks/useBookmarks'
import { useToast } from '../../hooks/useToast'
import { cn } from '../../utils/cn'

export default function BookmarkButton({ resourceId, title, showLabel = false, className }) {
  const { isBookmarked, toggle } = useBookmarks()
  const toast = useToast()
  const saved = isBookmarked(resourceId)

  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    toggle(resourceId)
    toast({
      title: saved ? 'Removed from saved' : 'Saved to your shelf',
      description: title,
      tone: saved ? 'info' : 'success',
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={`${saved ? 'Remove bookmark for' : 'Bookmark'} ${title}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full transition duration-200 active:scale-90',
        showLabel
          ? 'h-10 border border-line bg-[#fffdf8] px-4 text-sm font-medium hover:border-ember-500'
          : 'size-9 justify-center hover:bg-ivory-200',
        saved ? 'text-ember-600' : 'text-ink-500 hover:text-ink-900',
        className,
      )}
    >
      <Bookmark size={18} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
      {showLabel && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  )
}