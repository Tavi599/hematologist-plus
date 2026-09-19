export const routes = {
  calculator: '/calculator',
  diseases: '/diseases',
  sources: '/sources',
  proposals: '/proposals',
  disease: (slug: string) => `/diseases/${encodeURIComponent(slug)}`,
} as const
