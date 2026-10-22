export const routes = {
  calculator: '/calculator',
  need: '/need',
  diseases: '/diseases',
  sources: '/sources',
  proposals: '/proposals',
  scores: '/scores',
  disease: (slug: string) => `/diseases/${encodeURIComponent(slug)}`,
  pathways: (slug: string) => `/diseases/${encodeURIComponent(slug)}/pathways`,
} as const
