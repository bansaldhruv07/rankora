export const ROUTES = {
  home: '/',
  notes: '/notes',
  pricing: '/pricing',
  library: '/library',
  account: '/account',
  policies: '/policies',
}

function withQuery(base, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const text = query.toString()
  return text ? `${base}?${text}` : base
}

export const notePath = (slug) => `/notes/${slug}`
export const notesPath = (params) => withQuery(ROUTES.notes, params)
// Reader for a purchased note, or the free sample extract with { preview: true }.
export const readPath = (slug, { preview = false } = {}) => `/read/${slug}${preview ? '?preview=1' : ''}`
