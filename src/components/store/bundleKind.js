// Which picture and label a bundle gets: all three subjects together, the toughest chapters, or one subject.
const SUBJECTS = ['physics', 'chemistry', 'mathematics']

export function bundleKind(bundle) {
  if (/toughest/.test(bundle.slug)) return 'hard'
  if (SUBJECTS.includes(bundle.subject)) return bundle.subject
  return 'all'
}

export const BUNDLE_LABEL = {
  all: 'All subjects',
  hard: 'Toughest chapters',
  physics: 'Complete Physics',
  chemistry: 'Complete Chemistry',
  mathematics: 'Complete Mathematics',
}
