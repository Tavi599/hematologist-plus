export const routes = {
  calculator: '/calculator',
  diseases: '/diseases',
  disease: (slug: string) => `/diseases/${encodeURIComponent(slug)}`,
} as const
