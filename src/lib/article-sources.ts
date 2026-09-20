import type { Disease } from '../schemas/catalog'
import type { ArticleSection, DiseaseReference } from '../schemas/common'

export interface ArticleSourceChoice {
  section: ArticleSection
  /** The reference this choice stands for; absent for the department's own article. */
  reference?: DiseaseReference
}

/**
 * The sources a disease's article is written from: the department's own write-up first, then one
 * per guideline the disease names. Each one opens inside the app, behind the same sign-in as the
 * rest of the article text — the reader is never sent to a third-party site.
 */
export function articleSources(disease: Disease): ArticleSourceChoice[] {
  return [
    { section: 'own' as const },
    ...disease.references_json.map((reference) => ({ section: reference.kind, reference })),
  ]
}
