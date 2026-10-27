import { getSubjectTheme } from './subjectTheme'

const DIFFICULTY_RANK = { Easy: 1, Medium: 2, Hard: 3 }

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'difficulty-asc', label: 'Difficulty: easiest first' },
  { value: 'title', label: 'Title A to Z' },
]

export const PRICE_OPTIONS = [
  { value: 'all', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
]

export const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'Any difficulty' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
]

function haystack(resource) {
  return [
    resource.title,
    resource.chapter,
    resource.summary,
    getSubjectTheme(resource.subject).label,
    ...resource.contents,
  ]
    .join(' ')
    .toLowerCase()
}

export function filterResources(resources, filters) {
  const {
    query = '',
    subject = 'all',
    type = 'all',
    difficulty = 'all',
    chapter = 'all',
    price = 'all',
    savedIds = null,
  } = filters
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)

  return resources.filter((resource) => {
    if (subject !== 'all' && resource.subject !== subject) return false
    if (type !== 'all' && resource.type !== type) return false
    if (difficulty !== 'all' && resource.difficulty !== difficulty) return false
    if (chapter !== 'all' && resource.chapter !== chapter) return false
    if (price === 'free' && resource.price !== 0) return false
    if (price === 'premium' && resource.price === 0) return false
    if (savedIds && !savedIds.includes(resource.id)) return false
    if (tokens.length > 0) {
      const text = haystack(resource)
      if (!tokens.every((token) => text.includes(token))) return false
    }
    return true
  })
}

export function sortResources(resources, sort) {
  const list = [...resources]
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price)
    case 'difficulty-asc':
      return list.sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty])
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title))
    default:
      return list
  }
}