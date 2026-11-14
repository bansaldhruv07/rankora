// The standard free sample, by how long the note is: 2-3 pages -> the first page, 4 pages -> the first two, 5 or more
// -> the first three. A single-page note has no sample (a sample is never the whole note). Admins can change any note, or
// every note at once, from the notes admin.
export function standardSampleCount(pages) {
  const total = Number(pages) || 0
  if (total <= 1) return 0
  if (total <= 3) return 1
  if (total === 4) return 2
  return 3
}

export const standardSamplePages = (pages) => Array.from({ length: standardSampleCount(pages) }, (_, i) => i + 1)
