import { createContext, useContext, useEffect } from 'react'

export const ThemeContext = createContext(null)

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}

// Screens that are dark or light by design (the PDF reader, the admin area) opt out of the site theme
// while they are open, and hand the student's choice back when they close.
export function useLightOnly() {
  useEffect(() => {
    const root = document.documentElement
    const previous = root.dataset.theme
    root.dataset.theme = 'light'
    return () => {
      root.dataset.theme = previous
    }
  }, [])
}
