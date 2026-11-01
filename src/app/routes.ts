export const routes = {
  calculator: '/calculator',
  need: '/need',
  diseases: '/diseases',
  sources: '/sources',
  proposals: '/proposals',
  scores: '/scores',
  handbook: '/handbook',
  disease: (slug: string) => `/diseases/${encodeURIComponent(slug)}`,
  pathways: (slug: string) => `/diseases/${encodeURIComponent(slug)}/pathways`,
  handbookChapter: (number: number) => `/handbook/${number}`,
} as const
