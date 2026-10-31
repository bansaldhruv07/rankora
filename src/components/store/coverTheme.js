// Each subject gets its own palette and motif so a shelf of notes is readable at a glance.
const THEMES = {
  physics: { bg: '#14213d', spine: '#0b1424', ink: '#fbf8f1', accent: '#d9763a', label: 'Physics' },
  chemistry: { bg: '#435c46', spine: '#2f4232', ink: '#f6f1e6', accent: '#e1c27a', label: 'Chemistry' },
  mathematics: { bg: '#a54615', spine: '#7c3410', ink: '#fdf3ec', accent: '#f4d9a8', label: 'Mathematics' },
  mixed: { bg: '#2f4064', spine: '#1f2f4f', ink: '#fbf8f1', accent: '#d9763a', label: 'PCM' },
}


export function coverTheme(subject) {
  return THEMES[subject] ?? THEMES.mixed
}
