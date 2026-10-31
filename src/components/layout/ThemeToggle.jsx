import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../utils/cn'

// Sun and moon swap places with a turn, so the change feels like the page itself is changing.
export default function ThemeToggle({ className }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn('relative grid size-10 place-items-center overflow-hidden rounded-full text-ink-700 transition hover:bg-ivory-200 hover:text-ink-950', className)}
    >
      <Sun size={20} aria-hidden="true" className={cn('absolute transition duration-500', dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
      <Moon size={19} aria-hidden="true" className={cn('absolute transition duration-500', dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
    </button>
  )
}
