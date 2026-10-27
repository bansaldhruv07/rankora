export const ROUTES = {
  home: '/',
  explore: '/explore',
  practice: '/practice',
  mocks: '/mock-tests',
  analytics: '/analytics',
  pricing: '/pricing',
}

export const DIAGNOSTIC_PATH = '/practice?mode=diagnostic'

function withQuery(base, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const text = query.toString()
  return text ? `${base}?${text}` : base
}

export const resourcePath = (id) => `/resource/${id}`
export const explorePath = (params) => withQuery(ROUTES.explore, params)
export const practicePath = (params) => withQuery(ROUTES.practice, params)
export const mockPath = (testId) => withQuery(ROUTES.mocks, { test: testId })