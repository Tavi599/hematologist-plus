import type { Disease } from '../schemas/catalog'
import type { ArticleSection, DiseaseReference } from '../schemas/common'

export interface ArticleSourceChoice {
  section: ArticleSection
  /** The reference this choice stands for; absent for the department's own article. */
  reference?: DiseaseReference
}

/**
 * The sources a disease's article can be read from: the department's own write-up first, then one
 * per guideline the disease names — but only those someone has actually written up. A guideline
 * named in the data is not yet an article, and a button that opens an empty page is worse than no
 * button at all. Each choice opens inside the app, behind the same sign-in as the rest of the
 * article text; the reader is never sent to a third-party site.
 */
export function articleSources(
  disease: Disease,
  written: ReadonlySet<ArticleSection>,
): ArticleSourceChoice[] {
  return [
    { section: 'own' as const },
    ...disease.references_json
      .filter((reference) => written.has(reference.kind))
      .map((reference) => ({ section: reference.kind, reference })),
  ]
}
