export const routes = {
  calculator: '/calculator',
  diseases: '/diseases',
  sources: '/sources',
  disease: (slug: string) => `/diseases/${encodeURIComponent(slug)}`,
} as const
