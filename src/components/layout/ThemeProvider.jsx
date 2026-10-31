import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '../../hooks/useTheme'

const KEY = 'rk-theme'
const COLORS = { light: '#fbf8f1', dark: '#0b101c' }

// The first paint is themed by a tiny script in index.html (so there is no flash); this keeps React in step
// with it, remembers the choice, and follows the device setting until the student picks one themselves.
export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))

  const apply = useCallback((next) => {
    const root = document.documentElement
    root.classList.add('theme-fade')
    root.dataset.theme = next
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[next])
    setTheme(next)
    window.setTimeout(() => root.classList.remove('theme-fade'), 450)
  }, [])

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    apply(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* private mode */
    }
  }, [theme, apply])

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => {
      let chosen = null
      try {
        chosen = localStorage.getItem(KEY)
      } catch {
        /* ignore */
      }
      if (!chosen) apply(event.matches ? 'dark' : 'light')
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [apply])

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
